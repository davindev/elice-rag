import type pg from 'pg';
import { searchDense } from '../db.js';
import type { LlmClient } from '../llm/client.js';
import type { Retriever } from './retriever.js';

export function createDenseRetriever(pool: pg.Pool, llm: LlmClient): Retriever {
  return {
    async retrieve(query, topK) {
      const [embedding] = await llm.embed([query]);
      if (embedding === undefined) {
        throw new Error('쿼리 임베딩 결과가 비어 있습니다');
      }
      return searchDense(pool, embedding, topK);
    },
  };
}
