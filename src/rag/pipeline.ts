import type { StoredChunk } from '../db.js';
import type { ChatMessage, LlmClient } from '../llm/client.js';
import type { Retriever } from '../retrieval/retriever.js';
import { parseCitations } from './citation-parser.js';
import {
  buildUserPrompt,
  INSUFFICIENT_SENTINEL,
  QUERY_REWRITE_PROMPT,
  RAG_SYSTEM_PROMPT,
} from './prompts.js';

export interface Citation {
  index: number;
  chunkId: string;
  docPath: string;
  headingPath: string[];
  url: string;
  score: number;
}

export interface AskResult {
  answerable: boolean;
  answer: string;
  citations: Citation[];
  /** 후속 질문을 리라이팅한 경우, 실제 검색에 사용된 독립형 질의 (관측성) */
  rewrittenQuestion?: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
  latencyMs: number;
}

/** 멀티턴 대화 히스토리 — 서버는 무상태이며 클라이언트가 요청마다 전달한다 */
export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

/** 생성·리라이팅 프롬프트에 포함할 히스토리 상한 — 오래된 턴은 검색 의도와 무관해지고 토큰만 소비 */
const MAX_HISTORY_MESSAGES = 6;

export type StreamEvent = { type: 'delta'; text: string } | { type: 'done'; result: AskResult };

export interface RagDeps {
  retriever: Retriever;
  llm: LlmClient;
  llmModel: string;
  /** 검색 최고 점수가 이 값 미만이면 생성 없이 즉시 응답 불가 처리 (Eval로 튜닝, retriever별 별도 캘리브레이션 필요) */
  minScore: number;
}

const REFUSAL_ANSWER =
  '제공된 문서에서 질문에 대한 근거를 찾지 못했습니다. (The indexed documentation does not contain enough evidence to answer this question.)';

export async function ask(
  deps: RagDeps,
  question: string,
  topK: number,
  history: HistoryMessage[] = [],
): Promise<AskResult> {
  const { result } = await askDetailed(deps, question, topK, history);
  return result;
}

/** Eval에서 retrieval metric 계산을 위해 검색된 컨텍스트까지 함께 반환하는 변형 */
export async function askDetailed(
  deps: RagDeps,
  question: string,
  topK: number,
  history: HistoryMessage[] = [],
): Promise<{ result: AskResult; contexts: StoredChunk[] }> {
  const startedAt = performance.now();

  // 후속 질문("그거 예시 더")은 단독으로는 검색 의미가 없으므로,
  // 히스토리가 있을 때만 독립형 질의로 리라이팅해 검색한다 (단일 턴은 비용 0)
  const searchQuery = history.length === 0 ? question : await rewriteQuery(deps, question, history);
  const rewritten = searchQuery === question ? undefined : searchQuery;

  const contexts = await deps.retriever.retrieve(searchQuery, topK);

  const gate = checkRetrievalGate(deps, contexts, startedAt);
  if (gate !== null) {
    return {
      result: rewritten === undefined ? gate : { ...gate, rewrittenQuestion: rewritten },
      contexts,
    };
  }

  const chat = await deps.llm.chat(deps.llmModel, [
    { role: 'system', content: RAG_SYSTEM_PROMPT },
    ...recentHistory(history),
    { role: 'user', content: buildUserPrompt(question, contexts) },
  ]);

  const result = finalize(deps, contexts, chat.content, chat.usage, startedAt);
  return {
    result: rewritten === undefined ? result : { ...result, rewrittenQuestion: rewritten },
    contexts,
  };
}

function recentHistory(history: HistoryMessage[]): ChatMessage[] {
  return history.slice(-MAX_HISTORY_MESSAGES);
}

async function rewriteQuery(
  deps: RagDeps,
  question: string,
  history: HistoryMessage[],
): Promise<string> {
  const conversation = recentHistory(history)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');
  const { content } = await deps.llm.chat(deps.llmModel, [
    { role: 'system', content: QUERY_REWRITE_PROMPT },
    { role: 'user', content: `History:\n${conversation}\n\nFollow-up: ${question}\n\nRewritten:` },
  ]);
  const rewritten = content.trim();
  // 리라이팅 실패(빈 출력·비정상 장문)는 원 질문으로 폴백 — 검색이 틀릴지언정 깨지지는 않게
  if (rewritten.length === 0 || rewritten.length > question.length + 300) return question;
  return rewritten;
}

export async function* askStream(
  deps: RagDeps,
  question: string,
  topK: number,
  history: HistoryMessage[] = [],
): AsyncGenerator<StreamEvent> {
  const startedAt = performance.now();

  const searchQuery = history.length === 0 ? question : await rewriteQuery(deps, question, history);
  const rewritten = searchQuery === question ? undefined : searchQuery;
  const withRewrite = (result: AskResult): AskResult =>
    rewritten === undefined ? result : { ...result, rewrittenQuestion: rewritten };

  const contexts = await deps.retriever.retrieve(searchQuery, topK);

  const gate = checkRetrievalGate(deps, contexts, startedAt);
  if (gate !== null) {
    yield { type: 'done', result: withRewrite(gate) };
    return;
  }

  const stream = deps.llm.chatStream(deps.llmModel, [
    { role: 'system', content: RAG_SYSTEM_PROMPT },
    ...recentHistory(history),
    { role: 'user', content: buildUserPrompt(question, contexts) },
  ]);

  // sentinel 감지를 위해 accumulated가 sentinel의 prefix인 동안만 delta를 보류한다.
  // prefix에서 벗어나는 즉시 방출하므로 스트리밍 지연은 최대 sentinel 길이만큼이다.
  let accumulated = '';
  let held = '';
  for await (const delta of stream) {
    accumulated += delta;
    if (INSUFFICIENT_SENTINEL.startsWith(accumulated.trimStart())) {
      held = accumulated;
      continue;
    }
    if (accumulated.trimStart().startsWith(INSUFFICIENT_SENTINEL)) {
      break;
    }
    yield { type: 'delta', text: held === '' ? delta : accumulated };
    held = '';
  }

  const result = finalize(
    deps,
    contexts,
    accumulated,
    { promptTokens: 0, completionTokens: 0 }, // 스트리밍 응답은 usage 미제공이 일반적
    startedAt,
  );
  yield { type: 'done', result: withRewrite(result) };
}

function checkRetrievalGate(
  deps: RagDeps,
  contexts: StoredChunk[],
  startedAt: number,
): AskResult | null {
  // rerank는 순서를 바꾸되 score는 원 점수를 유지하므로, 첫 요소가 아닌 최고 점수로 판정한다
  const topScore = contexts.length === 0 ? 0 : Math.max(...contexts.map((c) => c.score));
  if (contexts.length === 0 || topScore < deps.minScore) {
    return {
      answerable: false,
      answer: REFUSAL_ANSWER,
      citations: [],
      model: deps.llmModel,
      usage: { promptTokens: 0, completionTokens: 0 },
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
  return null;
}

function finalize(
  deps: RagDeps,
  contexts: StoredChunk[],
  rawAnswer: string,
  usage: AskResult['usage'],
  startedAt: number,
): AskResult {
  const latencyMs = Math.round(performance.now() - startedAt);

  // 거부 판정은 "sentinel로 시작"만 — 본문 어디든(includes) 잡으면 부분 답변("...답변... 나머지는
  // 근거 없음")의 정답 형태까지 거부로 파기한다(실험 7에서 실측). 순수 거부는 sentinel만 출력하므로 startsWith로 충분
  if (rawAnswer.trim().startsWith(INSUFFICIENT_SENTINEL)) {
    return {
      answerable: false,
      answer: REFUSAL_ANSWER,
      citations: [],
      model: deps.llmModel,
      usage,
      latencyMs,
    };
  }

  const { text, citedIndices } = parseCitations(rawAnswer, contexts.length);
  const citations = citedIndices.flatMap((index) => {
    const chunk = contexts[index - 1];
    if (chunk === undefined) return [];
    return [
      {
        index,
        chunkId: chunk.id,
        docPath: chunk.docPath,
        headingPath: chunk.headingPath,
        url: chunk.url,
        score: chunk.score,
      },
    ];
  });

  return { answerable: true, answer: text, citations, model: deps.llmModel, usage, latencyMs };
}
