import { describe, expect, it } from 'vitest';
import type { StoredChunk } from '../db.js';
import type { ChatResult, LlmClient } from '../llm/client.js';
import { createLlmRerankedRetriever, parseRerankIndices } from './rerank.js';
import type { Retriever } from './retriever.js';

describe('parseRerankIndices', () => {
  it('JSON 배열을 추출하고 topK로 자른다', () => {
    expect(parseRerankIndices('Here: [3, 1, 7, 2, 5, 9]', 20, 5)).toEqual([3, 1, 7, 2, 5]);
  });

  it('근거 서술에 섞인 [n] 표기가 있어도 마지막 유효 배열을 답으로 본다', () => {
    expect(parseRerankIndices('Passage [3] is best. Final: [3,1,2,4,5]', 20, 5)).toEqual([
      3, 1, 2, 4, 5,
    ]);
  });

  it('코드펜스로 감싼 배열을 처리한다', () => {
    expect(parseRerankIndices('```json\n[3,1,2,4,5]\n```', 20, 5)).toEqual([3, 1, 2, 4, 5]);
  });

  it('숫자 문자열 배열을 관용한다', () => {
    expect(parseRerankIndices('["3","1"]', 20, 2)).toEqual([3, 1]);
  });

  it('범위 밖·중복 번호를 제거한다', () => {
    expect(parseRerankIndices('[3, 25, 3, 0, 1, -2, 2, 4, 5]', 20, 5)).toEqual([3, 1, 2, 4, 5]);
  });

  it('유효 번호가 부족하면 원 순위(1번부터)에서 보충한다', () => {
    expect(parseRerankIndices('[7, 3]', 20, 5)).toEqual([7, 3, 1, 2, 4]);
  });

  it('배열이 없거나 유효 번호가 없으면 null (원 순위 fallback 신호)', () => {
    expect(parseRerankIndices('cannot decide', 20, 5)).toBeNull();
    expect(parseRerankIndices('[99, 0]', 20, 5)).toBeNull();
    expect(parseRerankIndices('[not json', 20, 5)).toBeNull();
  });
});

function chunk(id: number): StoredChunk {
  return {
    id: `c${id}`,
    docPath: `doc${id}.md`,
    headingPath: ['Doc', `Section ${id}`],
    anchors: [],
    url: '',
    content: `content ${id}`,
    score: 1 - id * 0.01,
  };
}

function fakeBase(candidates: StoredChunk[], calls: number[]): Retriever {
  return {
    retrieve: (_query, topK) => {
      calls.push(topK);
      return Promise.resolve(candidates.slice(0, topK));
    },
  };
}

function fakeLlm(response: string): LlmClient {
  const chat = (): Promise<ChatResult> =>
    Promise.resolve({ content: response, usage: { promptTokens: 0, completionTokens: 0 } });
  return {
    chat,
    // biome-ignore lint/correctness/useYield: 테스트에서 스트리밍은 사용하지 않음
    chatStream: async function* () {
      throw new Error('사용 안 함');
    },
    embed: () => Promise.reject(new Error('사용 안 함')),
  };
}

describe('createLlmRerankedRetriever', () => {
  const candidates = Array.from({ length: 20 }, (_, i) => chunk(i + 1));

  it('base를 topK×4 후보로 호출하고, LLM 순위대로 재정렬해 반환한다', async () => {
    const calls: number[] = [];
    const retriever = createLlmRerankedRetriever(
      fakeBase(candidates, calls),
      fakeLlm('[5, 4, 12, 1, 2]'),
      'model-x',
    );
    const result = await retriever.retrieve('q', 5);
    expect(calls).toEqual([20]);
    expect(result.map((c) => c.id)).toEqual(['c5', 'c4', 'c12', 'c1', 'c2']);
  });

  it('파싱 실패 시 원 순위 topK를 반환하고 onFallback을 호출한다', async () => {
    const fallbacks: string[] = [];
    const retriever = createLlmRerankedRetriever(
      fakeBase(candidates, []),
      fakeLlm('cannot decide'),
      'model-x',
      { onFallback: (raw) => fallbacks.push(raw) },
    );
    const result = await retriever.retrieve('q', 5);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(fallbacks).toEqual(['cannot decide']);
  });

  it('후보가 topK 이하면 LLM 호출 없이 그대로 반환한다', async () => {
    const retriever = createLlmRerankedRetriever(
      fakeBase(candidates.slice(0, 3), []),
      fakeLlm('호출되면 안 됨 — 유효 배열 아님'),
      'model-x',
    );
    const result = await retriever.retrieve('q', 5);
    expect(result).toHaveLength(3);
  });
});
