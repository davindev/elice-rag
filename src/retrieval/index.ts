import type pg from 'pg';
import type { LlmClient } from '../llm/client.js';
import { createDenseRetriever } from './dense.js';
import { createHybridRetriever } from './hybrid.js';
import type { Retriever } from './retriever.js';

export type RetrieverKind = 'dense' | 'hybrid';

export function createRetriever(kind: RetrieverKind, pool: pg.Pool, llm: LlmClient): Retriever {
  return kind === 'dense' ? createDenseRetriever(pool, llm) : createHybridRetriever(pool, llm);
}
