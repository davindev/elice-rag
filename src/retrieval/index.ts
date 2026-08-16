import type pg from 'pg';
import type { LlmClient } from '../llm/client.js';
import { createDenseRetriever } from './dense.js';
import { createHybridRetriever } from './hybrid.js';
import { createLlmRerankedRetriever, type RerankOptions } from './rerank.js';
import type { Retriever } from './retriever.js';

/** retriever 종류의 단일 소스 — config(zod enum)·CLI 파싱이 모두 이것을 참조한다 */
export const RETRIEVER_KINDS = ['dense', 'hybrid', 'rerank', 'hybrid-rerank'] as const;
export type RetrieverKind = (typeof RETRIEVER_KINDS)[number];

export interface RetrieverDeps {
  pool: pg.Pool;
  llm: LlmClient;
  /** rerank 전용 — 생성 모델과 독립적으로 교체 가능해야 ablation·run 비교가 유효 */
  rerankModel: string;
  rerankOptions?: RerankOptions;
}

interface RetrieverSpec {
  /** rerank 단계를 포함하는가 — run 메타데이터(rerankModel·fallback 등) 기록 여부의 단일 소스 */
  usesRerank: boolean;
  create: (deps: RetrieverDeps) => Retriever;
}

const withRerank = (base: Retriever, deps: RetrieverDeps): Retriever =>
  createLlmRerankedRetriever(base, deps.llm, deps.rerankModel, deps.rerankOptions ?? {});

// Record<RetrieverKind, …>이므로 kind를 추가하면 create·usesRerank를 채우지 않는 한 컴파일 실패 —
// runner의 메타데이터 기록 조건이 조용히 어긋나는 것을 타입으로 방지한다
const RETRIEVER_SPECS: Record<RetrieverKind, RetrieverSpec> = {
  dense: {
    usesRerank: false,
    create: (deps) => createDenseRetriever(deps.pool, deps.llm),
  },
  hybrid: {
    usesRerank: false,
    create: (deps) => createHybridRetriever(deps.pool, deps.llm),
  },
  // base는 dense — 실험 2(top-5)와 후속 측정 2(후보 20개 깊이) 모두에서 hybrid base의 이득이 없음을 확인
  rerank: {
    usesRerank: true,
    create: (deps) => withRerank(createDenseRetriever(deps.pool, deps.llm), deps),
  },
  // 실험용: hybrid를 base로 하는 rerank. 주의 — rerank가 후보 topK×4를 요청하면
  // hybrid가 내부에서 다시 ×4를 곱하므로 실제 DB 검색 깊이는 dense/FTS 각 topK×16
  'hybrid-rerank': {
    usesRerank: true,
    create: (deps) => withRerank(createHybridRetriever(deps.pool, deps.llm), deps),
  },
};

export function createRetriever(kind: RetrieverKind, deps: RetrieverDeps): Retriever {
  return RETRIEVER_SPECS[kind].create(deps);
}

export function usesRerank(kind: RetrieverKind): boolean {
  return RETRIEVER_SPECS[kind].usesRerank;
}
