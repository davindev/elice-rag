import pg from 'pg';
import type { Chunk } from './ingest/chunker.js';

export interface StoredChunk {
  id: string;
  docPath: string;
  headingPath: string[];
  anchors: string[];
  url: string;
  content: string;
  score: number;
}

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl });
}

/** pgvector는 벡터를 '[1,2,3]' 형태의 문자열 리터럴로 받는다 */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export async function upsertChunks(
  pool: pg.Pool,
  chunks: Chunk[],
  embeddings: number[][],
  urlOf: (chunk: Chunk) => string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [i, chunk] of chunks.entries()) {
      const embedding = embeddings[i];
      if (embedding === undefined) {
        throw new Error(`청크 ${chunk.id}에 대응하는 임베딩이 없습니다 (index ${i})`);
      }
      await client.query(
        `INSERT INTO chunks (id, doc_path, heading_path, anchors, url, content, token_count, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          chunk.id,
          chunk.docPath,
          chunk.headingPath,
          chunk.anchors,
          urlOf(chunk),
          chunk.content,
          chunk.tokenCount,
          toVectorLiteral(embedding),
        ],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** 현재 corpus에 존재하지 않는 청크를 제거한다 (재인덱싱 멱등성) */
export async function deleteStaleChunks(pool: pg.Pool, liveIds: string[]): Promise<number> {
  const result = await pool.query('DELETE FROM chunks WHERE NOT (id = ANY($1::text[]))', [liveIds]);
  return result.rowCount ?? 0;
}

export async function existingChunkIds(pool: pg.Pool): Promise<Set<string>> {
  const result = await pool.query<{ id: string }>('SELECT id FROM chunks');
  return new Set(result.rows.map((row) => row.id));
}

/**
 * 정확 코사인 검색 (순차 스캔). 이 규모(~10^3 청크)에서는 ANN 인덱스 없이도
 * 충분히 빠르고, recall 1.0 + 결정적 순서를 보장한다.
 * 동점 시 id로 안정 정렬해 결과 순서의 재현성을 확보한다.
 */
export async function searchDense(
  pool: pg.Pool,
  queryEmbedding: number[],
  topK: number,
): Promise<StoredChunk[]> {
  const result = await pool.query<{
    id: string;
    doc_path: string;
    heading_path: string[];
    anchors: string[];
    url: string;
    content: string;
    score: number;
  }>(
    `SELECT id, doc_path, heading_path, anchors, url, content,
            1 - (embedding <=> $1::vector) AS score
     FROM chunks
     ORDER BY embedding <=> $1::vector, id
     LIMIT $2`,
    [toVectorLiteral(queryEmbedding), topK],
  );
  return result.rows.map((row) => ({
    id: row.id,
    docPath: row.doc_path,
    headingPath: row.heading_path,
    anchors: row.anchors,
    url: row.url,
    content: row.content,
    score: row.score,
  }));
}
