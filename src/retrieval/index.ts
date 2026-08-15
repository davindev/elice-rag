import type pg from 'pg';
import type { LlmClient } from '../llm/client.js';
import { createDenseRetriever } from './dense.js';
import { createHybridRetriever } from './hybrid.js';
import { createLlmRerankedRetriever, type RerankOptions } from './rerank.js';
import type { Retriever } from './retriever.js';

/** retriever 종류의 단일 소스 — config(zod enum)·CLI 파싱이 모두 이것을 참조한다 */
export const RETRIEVER_KINDS = ['dense', 'hybrid', 'rerank'] as const;
export type RetrieverKind = (typeof RETRIEVER_KINDS)[number];

export interface RetrieverDeps {
  pool: pg.Pool;
  llm: LlmClient;
  /** rerank 전용 — 생성 모델과 독립적으로 교체 가능해야 ablation·run 비교가 유효 */
  rerankModel: string;
  rerankOptions?: RerankOptions;
}

export function createRetriever(kind: RetrieverKind, deps: RetrieverDeps): Retriever {
  switch (kind) {
    case 'dense':
      return createDenseRetriever(deps.pool, deps.llm);
    case 'hybrid':
      return createHybridRetriever(deps.pool, deps.llm);
    case 'rerank':
      // dense 후보 위에 rerank — 실험 2에서 hybrid가 섹션 recall을 개선하지 못했으므로 base는 dense
      return createLlmRerankedRetriever(
        createDenseRetriever(deps.pool, deps.llm),
        deps.llm,
        deps.rerankModel,
        deps.rerankOptions ?? {},
      );
  }
}
