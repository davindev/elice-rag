import type pg from 'pg';
import { searchDense } from '../db.js';
import type { LlmClient } from '../llm/client.js';
import { searchFts } from './fts.js';
import type { Retriever } from './retriever.js';
import { fuseRrf } from './rrf.js';

/**
 * dense + FTS 하이브리드 검색.
 * 각 검색기에서 topK보다 깊게(CANDIDATE_MULTIPLIER배) 후보를 수집한 뒤 RRF로 융합 —
 * 융합 대상 후보가 topK뿐이면 두 검색기의 순위 차이가 결과에 반영될 여지가 없다.
 */

export const HYBRID_CANDIDATE_MULTIPLIER = 4;

export function createHybridRetriever(
  pool: pg.Pool,
  llm: LlmClient,
  embeddingModel: string,
): Retriever {
  return {
    async retrieve(query, topK) {
      const candidateK = topK * HYBRID_CANDIDATE_MULTIPLIER;
      const [embedding] = await llm.embed(embeddingModel, [query]);
      if (embedding === undefined) {
        throw new Error('쿼리 임베딩 결과가 비어 있습니다');
      }
      const [dense, fts] = await Promise.all([
        searchDense(pool, embedding, candidateK),
        searchFts(pool, query, candidateK),
      ]);
      return fuseRrf([dense, fts], topK);
    },
  };
}
