# elice-rag

React 공식 문서를 corpus로 하는 **Citation 기반 RAG QA 서비스**와, 그 품질을 측정하는 **자체 Eval Harness**, 그리고 Eval을 활용한 **개선 실험**입니다.

- **Part A** — 문서 Ingest → pgvector 검색 → citation 포함 답변 생성 API (SSE 스트리밍 지원)
- **Part B** — Gold Set 25문항, 결정적 metric 4종 + LLM-as-Judge 2종, 단일 명령 평가 파이프라인
- **Part C** — Hybrid Search(dense + FTS RRF) 개선 실험, Before/After 비교

## 실행 방법

요구사항: Node 22+, pnpm, Docker

```bash
# 1. 설치
pnpm install
cp .env.example .env   # 환경 변수 채우기 (아래 표 참고)

# 2. Corpus 다운로드 (재현성을 위해 커밋 SHA 고정)
pnpm download-corpus

# 3. Vector DB (Postgres 17 + pgvector) 기동 — schema.sql 자동 적용
docker compose up -d

# 4. Ingest (클리닝 → 청킹 → 임베딩 → 인덱싱)
pnpm ingest

# 5. 서버 실행 — Swagger UI: http://localhost:3000/doc
pnpm dev

# 6. Eval 실행 (Gold Set 25문항 전체 → eval/runs/<timestamp>/ 에 report 생성)
pnpm eval
pnpm eval --retriever hybrid   # Part C 실험 (기본값은 dense)
```

### 환경 변수

| 변수 | 설명 |
|---|---|
| `ELICE_API_KEY` | 엘리스 ML API Serverless API Key |
| `ELICE_BASE_URL` | `https://mlapi.run/{endpoint-id}/v1` (OpenAI 호환) |
| `LLM_MODEL` | 답변 생성 모델명 |
| `EMBEDDING_MODEL` | 임베딩 모델명 |
| `JUDGE_MODEL` | Eval judge 모델명 (생성 모델과 다른 모델 권장 — self-preference 완화) |
| `DATABASE_URL` | 기본값 `postgres://rag:rag@localhost:5432/rag` |
| `RETRIEVAL_MIN_SCORE` | retrieval top-1 유사도 하한 (기본 0 = 비활성, Eval로 튜닝) |
| `TOP_K` | 검색 컨텍스트 수 (기본 5) |
| `RETRIEVER` | `dense`(기본) 또는 `hybrid` — Part C 실험 토글 |

모든 민감 정보는 `.env`로만 관리하며 커밋되지 않습니다.

### API 사용 예

```bash
# 일반 질의
curl -s -X POST localhost:3000/ask \
  -H 'Content-Type: application/json' \
  -d '{"question": "What does useState return?"}'

# SSE 스트리밍 (delta 이벤트 → done 이벤트에 citation 포함 최종 결과)
curl -N -X POST localhost:3000/ask/stream \
  -H 'Content-Type: application/json' \
  -d '{"question": "What does useState return?"}'
```

응답 스키마는 Swagger UI(`/doc`) 또는 `/openapi.json`에서 확인할 수 있습니다. 근거가 불충분하면 `answerable: false`로 응답합니다.

## Corpus 선정: React 공식 문서

`reactjs/react.dev`의 `src/content/learn`(47편) + `src/content/reference/react`(49편), 총 **96편**의 마크다운 문서를 사용합니다 (커밋 `383a1e9` 고정).

선정 이유:

1. **Gold Set 품질을 작성자가 보증 가능** — 프론트엔드 개발자로서 문서 내용을 직접 검증할 수 있어, 정답 라벨의 정확성을 스스로 담보할 수 있습니다.
2. **재현성** — 원본이 GitHub에 공개되어 있어 pinned SHA 기반 자동 다운로드 스크립트로 누구나 동일한 corpus를 재현합니다. 레포에 데이터를 포함하지 않아도 됩니다.
3. **Hallucination 관측에 유리한 구조** — corpus에 `react-dom` 문서를 의도적으로 포함하지 않았습니다. LLM이 사전지식으로는 알지만 corpus에 없는 API(`hydrateRoot`, `useFormStatus` 등)를 질문하면, "검색 근거 없이 사전지식으로 답하는" hallucination을 명확히 유발·관측할 수 있습니다.

## 시스템 아키텍처

```
[reactjs/react.dev @ 383a1e9]
        │ scripts/download-corpus.ts (pinned SHA tarball)
        ▼
[Ingest]  MDX 클리닝 → heading-aware 청킹 → 임베딩(배치) → upsert
        ▼
[Postgres 17 + pgvector]  chunks(id=내용해시, doc_path, heading_path, url, content,
                          embedding vector, tsv tsvector) — 정확 코사인 검색
        ▼
[RAG API (Hono)]  POST /ask, /ask/stream
    질문 임베딩 → Retriever(dense | hybrid) → threshold gate
    → 번호 매긴 컨텍스트로 프롬프트 구성 → LLM 생성([n] 인용)
    → citation 파싱·검증 → 응답
        ▼
[Eval Harness]  goldset.jsonl(25문항) → pnpm eval
    결정적 metric (Recall@k, MRR, Citation Precision, Abstention)
    + LLM-as-Judge (Faithfulness, Correctness)
    → eval/runs/<ts>/{config,results,report}
```

기술 스택: TypeScript(strict) / Hono + zod-openapi / openai SDK(baseURL 오버라이드) / pgvector / vitest / Biome. LangChain 등 RAG 프레임워크는 사용하지 않았습니다 — 파이프라인의 모든 단계를 직접 구현해 각 단계에서 무슨 일이 일어나는지 완전히 설명 가능한 상태를 유지하기 위함입니다.

## 핵심 Design Decision & Trade-off

### 1. Vector DB: 전용 벡터 DB 대신 pgvector

이 corpus는 청크 약 1,000개 규모입니다. 이 규모에서는:

- **ANN 인덱스(HNSW)를 만들지 않고 순차 스캔 정확 검색**을 사용합니다. 질의당 수 ms로 충분히 빠르고, recall이 정확히 1.0이며 결과가 완전히 결정적이라 **Eval의 Before/After 비교에 근사 검색 노이즈가 섞이지 않습니다**.
- Qdrant 같은 전용 벡터 DB는 수백만 벡터·고QPS 스케일에서 가치가 생기며 이 규모에는 오버스펙입니다. "이미 운영 중인 Postgres에 벡터 컬럼 추가"가 이 스케일의 실무 표준이기도 합니다.
- 같은 DB의 `tsvector` 컬럼으로 Part C의 hybrid search까지 추가 인프라 없이 해결됩니다.
- 스케일 전환 경로: 청크 수가 10^5 이상으로 늘면 pgvector HNSW 인덱스를 추가하고, 그 이상(수백만+, 고QPS)이면 전용 벡터 DB로 이전합니다. 코드는 `Retriever` 인터페이스 뒤에 검색을 격리해 교체 비용을 최소화했습니다.

### 2. Chunking: heading-aware 구조 청킹

- h2/h3/h4 heading 경계로 섹션을 나누고, **같은 h2 아래의 작은 섹션들은 상한(500토큰)까지 병합**, 상한을 넘는 섹션은 문단 경계에서 분할하며 직전 문단 1개를 overlap으로 포함합니다.
- 근거: 마크다운 문서에서 heading은 의미 단위입니다. 고정 크기 분할은 "Parameters 설명이 두 청크에 걸치는" 식의 의미 단절을 만듭니다. react.dev는 모든 heading에 앵커 ID(`{/*usestate*/}`)가 있어, heading 단위 청킹이 곧 **문단 수준으로 정확한 citation URL**(`react.dev/reference/react/useState#usestate`)로 이어집니다.
- 청크 ID는 내용 해시로 결정적 생성 → 재인덱싱이 멱등이고, 내용이 안 바뀐 청크는 임베딩을 재호출하지 않습니다(증분 ingest, 비용 절감).
- 실제 corpus 기준: 96문서 → 청크 1,003개, 평균 299토큰, p90 476토큰.

### 3. MDX 클리닝: Sandpack 제거

`<Sandpack>` 블록(실행 데모의 App.js·css·package.json 멀티파일)은 답변 근거 밀도가 낮고 청크를 비대하게 만들어 통째로 제거했습니다. 설명에 필요한 코드는 일반 코드 펜스로 본문에 남아 있어 정보 손실이 제한적입니다. 그 외 MDX 컴포넌트(`<Note>`, `<Pitfall>` 등)는 태그만 벗기고 내용을 보존합니다.

### 4. Hallucination 방지: 3중 장치

1. **Retrieval gate** — top-1 유사도가 `RETRIEVAL_MIN_SCORE` 미만이면 생성 호출 없이 즉시 응답 불가 반환 (비용·지연 절감)
2. **Sentinel 프로토콜** — 프롬프트가 "근거 없으면 정확히 `INSUFFICIENT_CONTEXT`만 출력"을 지시. 자연어 거부 문구 감지보다 오탐이 적고 언어 독립적입니다. 스트리밍에서도 sentinel의 prefix인 동안만 토큰을 보류해 감지합니다(지연은 최대 sentinel 길이).
3. **Citation 검증** — 생성된 `[n]` 마커를 파서가 검증해, 존재하지 않는 컨텍스트 번호(모델이 지어낸 인용)는 본문에서 제거합니다.

### 5. API: JSON과 SSE 엔드포인트 분리

`/ask`(JSON)와 `/ask/stream`(SSE)을 분리했습니다. zod-openapi의 typed response는 SSE를 표현할 수 없어, 한 엔드포인트에 합치려면 타입 단언으로 응답 타입 보장을 포기해야 합니다. 응답 형태가 다른 두 모드는 API 설계상으로도 분리가 명확합니다.

## Part B — Eval Harness

### Gold Set (eval/goldset.jsonl, 25문항)

| 유형 | 수 | 설명 |
|---|---|---|
| factoid | 10 | 단일 근거 사실 질의 |
| summary | 5 | 문서 내용 요약 (생성형) |
| reasoning | 5 | 문서 개념을 시나리오에 적용하는 추론 (생성형) |
| unanswerable | 5 | corpus에 근거가 없는 질의 — hallucination 탐침 |

- 각 문항: `question`, `expectedEvidence`(근거 문서 경로), `acceptanceCriteria`(자연어 수용 기준), `referenceAnswer`(선택)
- **구축 방법**: 문서를 직접 읽고 작성한 뒤, 모든 `expectedEvidence` 경로가 corpus에 실재하는지, unanswerable 문항의 근거가 corpus 어디에도 없는지 스크립트로 교차 검증했습니다. 그럼에도 라벨 결함 2건이 실제 평가 과정에서 발견되어 보정했습니다 — ① 초안의 "createRoot 사용법" 문항은 corpus에 사용 예가 있어 unanswerable 라벨이 틀림(문항 교체), ② q17의 수용 기준이 문서상 유효한 복수 시나리오 중 하나만 인정(기준 확장, goldset에 보정 이력 기록). 라벨도 코드처럼 결함이 생기고 평가로 검증되어야 한다는 것이 실측된 셈입니다.
- **unanswerable 설계**: LLM이 사전지식으로 아는 실존 API(react-dom 소속), corpus에 없는 사실(버전·출시일), 존재하지 않는 API(`useWatchEffect`) 세 가지 하위 유형으로 구성 — 서로 다른 hallucination 경로를 자극합니다.
- **언어**: corpus가 영어이므로 주 집계는 영어 22문항. 한국어 3문항은 cross-lingual robustness probe로 분리 집계합니다 (한국어 질의 ↔ 영어 문서 매칭은 임베딩 품질·FTS에 별도 변수가 개입하므로 주 지표를 오염시키지 않도록 격리).
- **편향·한계**: 단일 작성자 라벨(합의 검증 없음), 소규모(문항당 분산 큼), useState 등 핵심 API에 커버리지 편중, 실사용 로그가 아닌 작성 질의(실제 사용자 표현 분포와 다를 수 있음).

### Metric 정의

**결정적 metric (LLM 불개입, 완전 재현 가능):**

| Metric | 정의 | 선정 이유 |
|---|---|---|
| Recall@k | 기대 근거 문서가 top-k 검색에 포함된 비율 | 생성 품질의 상한은 검색이 결정 — 검색 실패를 생성 문제와 분리해 진단 |
| MRR | 기대 근거 문서의 첫 등장 순위 역수 | 컨텍스트 앞쪽 배치가 인용 정확도에 영향 (순위 민감도) |
| Citation Precision | 답변이 인용한 문서 중 기대 근거인 비율 | citation이 이 서비스의 핵심 계약 — 엉뚱한 문서 인용을 직접 측정 |
| Abstention Accuracy / False Refusal Rate | unanswerable 거부율 / answerable 오거부율 | hallucination 방지와 과잉 거부는 트레이드오프 — 양쪽을 모두 측정해야 한 쪽으로의 붕괴를 감지 |

**LLM-as-Judge metric:**

| Metric | 정의 |
|---|---|
| Faithfulness | 답변의 모든 주장이 인용된 컨텍스트에 근거하는가 (0 / 0.5 / 1) |
| Correctness | 답변이 문항의 acceptanceCriteria를 충족하는가 (0 / 0.5 / 1) |

**Judge 신뢰성 확보:**

- temperature 0 + 명시적 3단계 rubric + few-shot 예시로 판정 분산 최소화
- Judge 모델을 생성 모델과 다른 모델로 사용 (self-preference bias 완화)
- Judge 프롬프트를 해시로 run 메타데이터에 기록 — 판정 기준 변경 추적
- **Human alignment (측정 완료)**: baseline run 답변 15건(correctness 10 + faithfulness 5)을 작성자가 judge 점수 비공개 상태에서 동일 rubric으로 직접 채점(`eval/human-labels.jsonl`) → judge와 **정확 일치 86.7%, ±0.5 이내 93.3%** (`scripts/judge-agreement.ts`). 유일한 1.0 등급 불일치(q17)는 judge 결함이 아니라 human 채점과 judge 실행 사이에 수용 기준이 보정된 버전 차이로, 이를 제외하면 정확 일치 92.9%·±0.5 이내 100%. 한계: 라벨러가 goldset 작성자와 동일인이라 기준 해석이 유리하게 정렬됐을 수 있음(독립 라벨러 검증은 향후 과제)

**Metric의 한계와 맹점 (인지하고 있는 것):**

- Recall/Citation은 **문서 단위** 매칭 — 같은 문서의 엉뚱한 섹션을 인용해도 정답 처리됩니다. 청크 단위 gold label은 청킹 전략을 바꾸는 실험(Part C 후보)과 양립할 수 없어 의도적으로 문서 단위를 선택한 트레이드오프입니다.
- Citation Precision만 있고 **Citation Recall**(근거 문서를 빠짐없이 인용했는가)은 없습니다 — 다중 근거 문항이 적어 분모가 불안정하기 때문입니다.
- Faithfulness judge는 "컨텍스트에 있는 내용인가"만 보므로, 컨텍스트 자체가 질문과 무관하면 무관한 답변도 faithful로 판정할 수 있습니다 (Correctness가 이를 보완).
- Judge 점수는 rubric 해석에 의존하며 완전히 결정적이지 않습니다 — 동일 입력 재실행 시 ±0.5 등급 흔들림 가능.

### 재현성

run마다 `eval/runs/<timestamp>_<retriever>/`에 기록:

- `config.json` — 모델 3종, temperature, topK, minScore, corpus SHA, RAG/Judge 프롬프트 해시, goldset 해시, Node 버전
- `results.json` — 문항별 원시 결과 (답변 전문, 검색·인용 문서, judge 판정 이유 포함)
- `report.md` — metric 요약표 + 문항별 breakdown

재현성 수준을 정직하게 구분하면: **결정적 metric은 동일 인덱스에서 완전 재현**됩니다 (정확 검색 + 동점 시 id 안정 정렬). **생성·judge는 LLM 특성상 완전 결정이 불가능**해, temperature 0으로 분산을 최소화하고 설정 전량을 기록하는 방식으로 관리합니다 (OpenAI 호환 API의 seed는 best-effort라 신뢰하지 않습니다).

### CI 연동 설계 (제안)

1. **PR마다**: 결정적 metric만 실행 (judge 제외 → 비용 0, 완전 재현) — goldset smoke subset으로 Recall/Citation/Abstention regression gate
2. **main merge 시**: full eval (judge 포함) → baseline 대비 diff를 PR 코멘트로 게시
3. **Gate 기준**: 절대 threshold(예: Abstention ≥ 0.8)와 baseline 대비 하락폭(예: Correctness -0.1 이상 하락 시 fail) 병행
4. **프롬프트/모델 변경 감지**: config의 프롬프트 해시·모델명이 바뀐 PR은 full eval 강제
5. judge 비용 관리: full eval 1회 ≈ 문항 20 × judge 2회 — 소규모라 nightly 실행도 부담 없음

## Part C — 개선 실험: Hybrid Search

### Hypothesis

dense 임베딩 단독 검색은 `useLayoutEffect`, `useSyncExternalStore` 같은 **API 심볼의 정확 매칭 질의에 약하다** (임베딩 공간에서 유사 API끼리 가까워 혼동). Postgres FTS 키워드 검색을 RRF로 융합하면 심볼 매칭이 보강되어 **Recall@k와 MRR이 상승**하고, 더 정확한 컨텍스트가 공급되므로 **Citation Precision과 Correctness도 동반 상승**할 것이다.

### 설계

- Before: `pnpm eval --retriever dense` / After: `pnpm eval --retriever hybrid`
- hybrid: dense와 FTS 각각 topK×4 후보 수집 → RRF(K=60) 융합 → topK
- RRF는 순위만 사용하므로 cosine과 ts_rank의 스케일 차이가 문제되지 않으며, BM25 별도 구현 없이 ts_rank로 충분합니다
- 동일 goldset·동일 모델·동일 프롬프트, retriever만 변경

### Result

생성 `gpt-4o-mini` / 임베딩 `text-embedding-3-small` / judge `gpt-4o`, topK=5, temperature 0 (상세 설정·해시는 `eval/runs/*/config.json`):

| Metric | dense (before) | hybrid (after) | Δ |
|---|---|---|---|
| Recall@k | 1.000 | 1.000 | 0 |
| MRR | 0.866 | 0.866 | 0 |
| Citation Precision | 0.694 | **0.750** | +0.056 |
| Abstention Accuracy | 1.000 | 1.000 | 0 |
| False Refusal Rate | 0.000 | 0.000 | 0 |
| Faithfulness | 1.000 | 1.000 | 0 |
| Correctness | 0.917 | 0.917 | 0 |

### Analysis

**가설은 부분적으로만 적중했고, 예상한 경로가 아니었다.**

- **1차 메커니즘(Recall 향상)은 발휘될 공간이 없었다.** dense 단독으로 이미 Recall@k 1.000, MRR 0.866으로 문서 단위 검색이 사실상 천장이었다. corpus가 96문서로 작고 문서 주제가 서로 뚜렷이 구분되어, 임베딩만으로 doc-level 검색이 포화된 것. "dense가 API 심볼 매칭에 약할 것"이라는 전제는 이 corpus 규모에서는 성립하지 않았다.
- **재현된 신호는 Citation Precision(+0.056)뿐이다.** 문항 단위 diff에서 변화는 3문항: q01(0.5→1)·q04(0→1)는 FTS가 질문 키워드와 정확히 일치하는 문서를 후보 상위로 끌어올려 모델이 더 정확한 문서를 인용했고, q08(1→0.5)은 소폭 하락했다. 이 패턴은 goldset 보정 전후 두 쌍의 run에서 **동일하게 재현**됐다. 즉 hybrid의 효과는 "못 찾던 문서를 찾게 됨"이 아니라 "**컨텍스트 구성이 바뀌어 모델의 인용 선택이 달라짐**"이다.
- **Correctness 차이는 분산으로 판명됐다.** 초기 run 쌍에서는 hybrid가 +0.028 우위였으나, 재실행에서 dense의 q04가 기준 변경 없이 0.5→1로 흔들리며 동률(0.917)이 됐다 — temperature 0에서도 생성·judge에 ±0.5 등급의 실측 분산이 존재함을 확인. 단일 run의 judge metric 차이는 이 분산보다 커야만 의미가 있다.
- **평가 중 gold label 결함을 발견·보정했다.** q17의 수용 기준이 문서상 유효한 두 시나리오(의존성 배열 부재 / reactive value 변경) 중 하나만 인정하고 있었고, 시스템 답변은 corpus 챌린지 해설과 사실상 동일한 문서 공인 진단이었다. 기준을 두 경로 모두 허용하도록 보정(goldset에 보정 이력 기록)한 뒤 양쪽 run을 재실행했다 — Eval Harness가 시스템만이 아니라 **gold set 자체의 결함을 드러내는 도구**로도 작동한 사례.
- **q12(correctness 0)는 hybrid로도 개선되지 않았다** — 검색은 정답 문서를 찾았지만 생성 모델이 함께 검색된 유사 문서(reacting-to-input-with-state의 5단계)를 근거로 선택한 생성 단계 실패로, 검색 개선으로는 풀리지 않는 실패 유형임이 확인됐다.

### Next Steps

- **검색 난이도 재설계**: doc-level Recall이 포화된 상태에서는 검색 실험의 분해능이 없다 — 청크 단위 evidence 라벨 도입 또는 다중 문서 조합(multi-hop) 문항 추가로 검색 metric의 천장을 낮추는 것이 선행 과제
- **생성 단계 실패 대응**: q12·q17 유형(검색은 성공, 근거 선택·적용 실패)에는 컨텍스트 수 축소(topK 튜닝), 유사 문서 간 구분 강화 프롬프트, reranker(cross-encoder)가 후보
- **Judge 반복 실행**: 동일 run을 judge만 3회 반복해 판정 분산을 실측 — 개선 폭이 분산보다 큰지 검정
- **Query rewriting**: 한국어 질의를 영어로 변환 후 검색 — ko probe 성능 개선 가설
- **Gold Set 확장**: 실사용 질의 로그 기반 문항 추가, 복수 라벨러 합의로 라벨 신뢰도 향상

## 한계점 및 알려진 이슈

- **토큰 카운팅 근사**: 청킹 상한은 js-tiktoken(cl100k)으로 계산 — 실제 서빙 모델의 토크나이저와 다를 수 있으나 청킹 용도로는 오차가 동작에 영향 없음
- **threshold 미튜닝 상태**: `RETRIEVAL_MIN_SCORE` 기본 0(비활성) — sentinel 프로토콜이 1차 방어를 담당하며, gate는 Eval 데이터 축적 후 튜닝
- **한국어 질의**: 영어 corpus 대상 cross-lingual 검색 품질은 임베딩 모델에 전적으로 의존하며, FTS(english) 경로는 한국어 질의에 기여하지 못함
- **usage 미수집(스트리밍)**: SSE 경로는 토큰 usage를 0으로 반환 (OpenAI 호환 스트리밍의 usage 옵션 지원 여부가 게이트웨이별로 달라 비활성)
- **단일 인스턴스 전제**: 커넥션 풀·상태 관리가 단일 프로세스 기준 — 수평 확장 시 재검토 필요
