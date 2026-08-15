import { describe, expect, it } from 'vitest';
import type { StoredChunk } from '../db.js';
import type { ChatMessage, ChatResult, LlmClient } from '../llm/client.js';
import type { Retriever } from '../retrieval/retriever.js';
import { askDetailed, type RagDeps } from './pipeline.js';
import { QUERY_REWRITE_PROMPT } from './prompts.js';

function chunk(id: string): StoredChunk {
  return {
    id,
    docPath: `${id}.md`,
    headingPath: ['Doc'],
    anchors: [],
    url: `https://react.dev/${id}`,
    content: `content of ${id}`,
    score: 0.9,
  };
}

function fakeDeps(params: {
  rewriteResponse?: string;
  answer: string;
  retrievedQueries: string[];
  chatCalls: ChatMessage[][];
}): RagDeps {
  const retriever: Retriever = {
    retrieve: (query) => {
      params.retrievedQueries.push(query);
      return Promise.resolve([chunk('a'), chunk('b')]);
    },
  };
  const llm: LlmClient = {
    chat: (_model, messages): Promise<ChatResult> => {
      params.chatCalls.push(messages);
      const isRewrite = messages[0]?.content === QUERY_REWRITE_PROMPT;
      return Promise.resolve({
        content: isRewrite ? (params.rewriteResponse ?? '') : params.answer,
        usage: { promptTokens: 0, completionTokens: 0 },
      });
    },
    // biome-ignore lint/correctness/useYield: 테스트에서 스트리밍은 사용하지 않음
    chatStream: async function* () {
      throw new Error('사용 안 함');
    },
    embed: () => Promise.reject(new Error('사용 안 함')),
  };
  return { retriever, llm, llmModel: 'm', minScore: 0 };
}

describe('askDetailed — 멀티턴 리라이팅', () => {
  it('히스토리가 없으면 리라이팅 없이 원 질문으로 검색한다', async () => {
    const retrievedQueries: string[] = [];
    const chatCalls: ChatMessage[][] = [];
    const deps = fakeDeps({ answer: 'answer [1]', retrievedQueries, chatCalls });

    const { result } = await askDetailed(deps, 'What is useEffect?', 2);
    expect(retrievedQueries).toEqual(['What is useEffect?']);
    expect(chatCalls).toHaveLength(1); // 생성 1회만 (리라이팅 호출 없음)
    expect(result.rewrittenQuestion).toBeUndefined();
  });

  it('히스토리가 있으면 리라이팅된 질의로 검색하고 응답에 노출한다', async () => {
    const retrievedQueries: string[] = [];
    const chatCalls: ChatMessage[][] = [];
    const deps = fakeDeps({
      rewriteResponse: 'useEffect 사용 예시를 더 알려줘',
      answer: 'answer [1]',
      retrievedQueries,
      chatCalls,
    });
    const history = [
      { role: 'user' as const, content: 'useEffect가 뭐야?' },
      { role: 'assistant' as const, content: 'useEffect는 외부 시스템과 동기화하는 Hook입니다.' },
    ];

    const { result } = await askDetailed(deps, '그거 예시 더 알려줘', 2, history);
    expect(retrievedQueries).toEqual(['useEffect 사용 예시를 더 알려줘']);
    expect(result.rewrittenQuestion).toBe('useEffect 사용 예시를 더 알려줘');
    // 생성 프롬프트에 히스토리가 포함된다 (system 다음)
    const genMessages = chatCalls[1];
    expect(genMessages?.[1]).toEqual(history[0]);
    expect(genMessages?.[2]).toEqual(history[1]);
  });

  it('리라이팅이 빈 출력이면 원 질문으로 폴백한다', async () => {
    const retrievedQueries: string[] = [];
    const deps = fakeDeps({
      rewriteResponse: '',
      answer: 'answer [1]',
      retrievedQueries,
      chatCalls: [],
    });
    const history = [{ role: 'user' as const, content: 'q1' }];

    const { result } = await askDetailed(deps, '그거 더', 2, history);
    expect(retrievedQueries).toEqual(['그거 더']);
    expect(result.rewrittenQuestion).toBeUndefined();
  });
});
