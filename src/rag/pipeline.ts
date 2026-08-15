import type { StoredChunk } from '../db.js';
import type { LlmClient } from '../llm/client.js';
import type { Retriever } from '../retrieval/retriever.js';
import { parseCitations } from './citation-parser.js';
import { buildUserPrompt, INSUFFICIENT_SENTINEL, RAG_SYSTEM_PROMPT } from './prompts.js';

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
  model: string;
  usage: { promptTokens: number; completionTokens: number };
  latencyMs: number;
}

export type StreamEvent = { type: 'delta'; text: string } | { type: 'done'; result: AskResult };

export interface RagDeps {
  retriever: Retriever;
  llm: LlmClient;
  llmModel: string;
  /** top-1 유사도가 이 값 미만이면 생성 없이 즉시 응답 불가 처리 (Eval로 튜닝) */
  minScore: number;
}

const REFUSAL_ANSWER =
  '제공된 문서에서 질문에 대한 근거를 찾지 못했습니다. (The indexed documentation does not contain enough evidence to answer this question.)';

export async function ask(deps: RagDeps, question: string, topK: number): Promise<AskResult> {
  const { result } = await askDetailed(deps, question, topK);
  return result;
}

/** Eval에서 retrieval metric 계산을 위해 검색된 컨텍스트까지 함께 반환하는 변형 */
export async function askDetailed(
  deps: RagDeps,
  question: string,
  topK: number,
): Promise<{ result: AskResult; contexts: StoredChunk[] }> {
  const startedAt = performance.now();
  const contexts = await deps.retriever.retrieve(question, topK);

  const gate = checkRetrievalGate(deps, contexts, startedAt);
  if (gate !== null) return { result: gate, contexts };

  const chat = await deps.llm.chat(deps.llmModel, [
    { role: 'system', content: RAG_SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(question, contexts) },
  ]);

  return { result: finalize(deps, contexts, chat.content, chat.usage, startedAt), contexts };
}

export async function* askStream(
  deps: RagDeps,
  question: string,
  topK: number,
): AsyncGenerator<StreamEvent> {
  const startedAt = performance.now();
  const contexts = await deps.retriever.retrieve(question, topK);

  const gate = checkRetrievalGate(deps, contexts, startedAt);
  if (gate !== null) {
    yield { type: 'done', result: gate };
    return;
  }

  const stream = deps.llm.chatStream(deps.llmModel, [
    { role: 'system', content: RAG_SYSTEM_PROMPT },
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
  yield { type: 'done', result };
}

function checkRetrievalGate(
  deps: RagDeps,
  contexts: StoredChunk[],
  startedAt: number,
): AskResult | null {
  const topScore = contexts[0]?.score ?? 0;
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
