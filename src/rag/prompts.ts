import type { StoredChunk } from '../db.js';

/**
 * 컨텍스트에 근거가 없을 때 모델이 출력하도록 지시하는 sentinel.
 * 자연어 거부 문구 감지보다 오탐이 적고 언어에 독립적이다.
 */
export const INSUFFICIENT_SENTINEL = 'INSUFFICIENT_CONTEXT';

export const RAG_SYSTEM_PROMPT = `You are a documentation QA assistant for the official React documentation.

Rules:
- Answer ONLY using the numbered context passages provided. Never use prior knowledge.
- After every claim, cite the supporting passage with its number in square brackets, e.g. [1] or [2][3].
- If the provided passages do not contain enough information to answer the question, reply with exactly "${INSUFFICIENT_SENTINEL}" and nothing else.
- Answer in the same language as the question.
- Be concise and factual.`;

export function buildUserPrompt(question: string, contexts: StoredChunk[]): string {
  const passages = contexts
    .map((chunk, i) => `[${i + 1}] (${chunk.headingPath.join(' > ')})\n${chunk.content}`)
    .join('\n\n---\n\n');
  return `Context passages:\n\n${passages}\n\n---\n\nQuestion: ${question}`;
}
