import { z } from 'zod';
import type { LlmClient } from '../llm/client.js';
import type { Retriever } from './retriever.js';

/**
 * LLM listwise reranker (Part C 실험 3).
 *
 * 실험 2의 진단: 임베딩이 문서 주제는 구분하지만 문서 내 섹션 변별이 약해
 * "정답 문서의 엉뚱한 섹션"이 top-K를 채운다. 후보를 넓게(topK×4) 뽑아
 * LLM이 질문과의 관련도를 상대 비교해 재정렬하면 이 실패 유형을 직접 겨냥한다.
 *
 * listwise(후보 전체를 한 프롬프트에서 비교) 선택 이유: pointwise 대비 호출 수가
 * 후보 수 분의 1이고, 후보 간 상대 비교가 가능하다. 트레이드오프는 질의당 LLM 호출
 * +1 (topK=5 기준 입력 ~3.5k 토큰)과 출력 파싱 실패 가능성.
 *
 * 상수·프롬프트는 run 메타데이터 기록용으로 export한다 (RAG_SYSTEM_PROMPT 해시 기록과 동일 규약).
 */
export const RERANK_CANDIDATE_MULTIPLIER = 4;
/** rerank 프롬프트에 넣는 청크당 최대 길이 — 비용 제어. breadcrumb을 별도 표기하므로 주제 판별에 충분 */
export const RERANK_PASSAGE_CHAR_LIMIT = 700;

export const RERANK_SYSTEM_PROMPT = `You are a search result reranker for documentation QA.
You will receive a question and numbered candidate passages, each prefixed with its document breadcrumb.
Select the passages that are most useful for answering the question, best first.
A passage is useful only if it contains information that directly answers the question — being on the same general topic is not enough.
Respond with ONLY a JSON array of passage numbers, e.g. [3, 1, 7, 2, 5].`;

export interface RerankOptions {
  /** 파싱 실패로 원 순위 fallback이 발생할 때마다 호출 — 호출자가 run 메타데이터에 기록 */
  onFallback?: (rawContent: string) => void;
}

export function createLlmRerankedRetriever(
  base: Retriever,
  llm: LlmClient,
  model: string,
  options: RerankOptions = {},
): Retriever {
  return {
    async retrieve(query, topK) {
      const candidateK = topK * RERANK_CANDIDATE_MULTIPLIER;
      const candidates = await base.retrieve(query, candidateK);
      if (candidates.length <= topK) return candidates;

      // 생성 프롬프트(buildUserPrompt)와 동일하게 breadcrumb을 명시한다 —
      // 섹션 heading만으로는 어느 문서인지 판별할 수 없기 때문 (코드리뷰 W1)
      const passages = candidates
        .map(
          (chunk, i) =>
            // slice가 서로게이트 쌍(이모지 등) 중간을 자르면 비정상 유니코드가 되어
            // OpenAI가 요청 전체를 invalid_json으로 거부하는 것을 실측 — toWellFormed로 정리
            `[${i + 1}] (${chunk.headingPath.join(' > ')})\n${chunk.content
              .slice(0, RERANK_PASSAGE_CHAR_LIMIT)
              .toWellFormed()}`,
        )
        .join('\n\n---\n\n');
      const user = `Question: ${query}\n\nCandidate passages:\n\n${passages}\n\nReturn the ${topK} most useful passage numbers as a JSON array, best first.`;

      // eval은 수십 문항 배치 실행이므로 일시 오류(429 등) 1회는 재시도한다
      const { content } = await withOneRetry(() =>
        llm.chat(model, [
          { role: 'system', content: RERANK_SYSTEM_PROMPT },
          { role: 'user', content: user },
        ]),
      );

      const indices = parseRerankIndices(content, candidates.length, topK);
      if (indices === null) {
        options.onFallback?.(content);
        return candidates.slice(0, topK);
      }
      return indices.flatMap((n) => {
        const chunk = candidates[n - 1];
        return chunk === undefined ? [] : [chunk];
      });
    },
  };
}

async function withOneRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fn();
  }
}

// LLM 출력(시스템 경계)은 형태를 신뢰할 수 없으므로 zod로 검증한다 (judge.ts와 동일 규약).
// judge의 all-or-nothing과 달리 유효값 필터링을 허용하는 이유: 순위 일부만 유효해도
// 나머지를 원 순위로 보충하면 재정렬 정보가 보존되기 때문.
const rawArraySchema = z.array(z.unknown());

/**
 * LLM 출력에서 순위 배열을 추출·검증한다.
 *
 * 모델이 근거 서술에 [3] 같은 후보 번호 표기를 섞는 경우가 흔하므로
 * (후보 자체가 [n]으로 번호 매겨져 있음), 마지막으로 등장하는 유효한 배열을
 * 최종 답으로 본다. 범위 밖·중복 번호는 제거하고, 유효 번호가 topK에 못 미치면
 * 원 순위에서 보충한다. 유효한 배열이 없으면 null (호출자가 원 순위 fallback).
 */
export function parseRerankIndices(
  content: string,
  candidateCount: number,
  topK: number,
): number[] | null {
  const arrayCandidates = content.match(/\[[^[\]]*\]/g);
  if (arrayCandidates === null) return null;

  for (let i = arrayCandidates.length - 1; i >= 0; i -= 1) {
    const indices = tryParseArray(arrayCandidates[i] ?? '', candidateCount, topK);
    if (indices !== null) return indices;
  }
  return null;
}

function tryParseArray(text: string, candidateCount: number, topK: number): number[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = rawArraySchema.safeParse(raw);
  if (!parsed.success) return null;

  const seen = new Set<number>();
  for (const value of parsed.data) {
    // "3" 같은 숫자 문자열도 관용한다 — LLM 출력에서 흔한 변형
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : Number.NaN;
    if (Number.isInteger(n) && n >= 1 && n <= candidateCount) seen.add(n);
  }
  if (seen.size === 0) return null;

  const indices = [...seen].slice(0, topK);
  for (let n = 1; indices.length < topK && n <= candidateCount; n += 1) {
    if (!seen.has(n)) indices.push(n);
  }
  return indices;
}
