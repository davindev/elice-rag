import type { StoredChunk } from '../db.js';

/**
 * 검색 전략 경계 인터페이스.
 * Part C에서 dense 단독 ↔ hybrid(dense + FTS RRF)를 동일 파이프라인·동일 Eval로
 * 교체 비교하기 위해 검색을 이 인터페이스 뒤로 분리한다.
 */
export interface Retriever {
  retrieve(query: string, topK: number): Promise<StoredChunk[]>;
}
