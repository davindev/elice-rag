CREATE EXTENSION IF NOT EXISTS vector;

-- 임베딩 차원은 모델 확정 시점에 결정되므로 vector 컬럼을 무차원으로 선언한다.
-- 차원 일관성은 ingest 파이프라인이 보장한다 (동일 모델·동일 차원만 upsert).
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY, -- 청크 내용 해시 (멱등 재인덱싱)
  doc_path TEXT NOT NULL,
  heading_path TEXT[] NOT NULL,
  url TEXT NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  embedding vector NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX IF NOT EXISTS chunks_doc_path_idx ON chunks (doc_path);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING GIN (tsv);

-- ANN 인덱스(HNSW/IVFFlat)는 의도적으로 만들지 않는다:
-- 이 규모(~10^3 청크)에서는 순차 스캔 정확 검색이 충분히 빠르고(recall 1.0),
-- 근사 검색의 비결정성이 없어 Eval 재현성에 유리하다.
