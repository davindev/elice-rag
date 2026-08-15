import type { StoredChunk } from '../db.js';

/**
 * Reciprocal Rank Fusion.
 * 서로 다른 스케일의 점수(cosine vs ts_rank)를 순위로 정규화해 융합한다.
 * K=60은 RRF 원 논문(Cormack et al. 2009)의 표준값 — 상위 순위 간 차이를
 * 완만하게 반영해 한 검색기의 과신을 억제한다.
 */
const RRF_K = 60;

export function fuseRrf(rankings: StoredChunk[][], topK: number): StoredChunk[] {
  const scores = new Map<string, { chunk: StoredChunk; score: number }>();

  for (const ranking of rankings) {
    ranking.forEach((chunk, rank) => {
      const entry = scores.get(chunk.id) ?? { chunk, score: 0 };
      entry.score += 1 / (RRF_K + rank + 1);
      scores.set(chunk.id, entry);
    });
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, topK)
    .map(({ chunk, score }) => ({ ...chunk, score }));
}
