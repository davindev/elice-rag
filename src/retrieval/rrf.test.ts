import { describe, expect, it } from 'vitest';
import type { StoredChunk } from '../db.js';
import { fuseRrf } from './rrf.js';

function chunk(id: string): StoredChunk {
  return { id, docPath: `${id}.md`, headingPath: [], anchors: [], url: '', content: '', score: 0 };
}

describe('fuseRrf', () => {
  it('양쪽 랭킹에 모두 등장하는 항목이 최상위로 융합된다', () => {
    const dense = [chunk('a'), chunk('b'), chunk('c')];
    const fts = [chunk('d'), chunk('b'), chunk('e')];
    const fused = fuseRrf([dense, fts], 3);
    expect(fused[0]?.id).toBe('b'); // 유일하게 양쪽 등장 (2위+2위 > 1위 단독)
  });

  it('topK로 결과를 제한한다', () => {
    const fused = fuseRrf([[chunk('a'), chunk('b')], [chunk('c')]], 2);
    expect(fused).toHaveLength(2);
  });

  it('동점이면 id 사전순으로 안정 정렬한다 (재현성)', () => {
    const fused = fuseRrf([[chunk('b')], [chunk('a')]], 2);
    expect(fused.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('빈 랭킹을 허용한다', () => {
    expect(fuseRrf([[], [chunk('a')]], 5).map((c) => c.id)).toEqual(['a']);
  });
});
