CREATE EXTENSION IF NOT EXISTS vector;

-- 임베딩 차원은 모델 확정 시점에 결정되므로 vector 컬럼을 무차원으로 선언한다.
-- 차원 일관성은 ingest 파이프라인이 보장한다 (동일 모델·동일 차원만 upsert).
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY, -- 저장 페이로드(경로+breadcrumb+앵커+본문) 해시 (멱등 재인덱싱)
  doc_path TEXT NOT NULL,
  heading_path TEXT[] NOT NULL,
  anchors TEXT[] NOT NULL DEFAULT '{}', -- 청크에 포함된 섹션 앵커 (앵커 단위 evidence 매칭용)
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
