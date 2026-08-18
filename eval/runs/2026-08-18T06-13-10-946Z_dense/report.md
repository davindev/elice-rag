# Eval Report — 2026-08-18T06:13:10.946Z

## Run Config

| key | value |
|---|---|
| retriever | dense |
| llmModel | gemini-3.1-pro-preview |
| embeddingModel | text-embedding-3-small |
| judgeModel | gemini-3.1-pro-preview |
| temperature | 0 |
| topK | 5 |
| minScore | 0 |
| corpusSha | 383a1e9239c8 |
| embeddingInput | content |
| indexFingerprint | 1003청크 / 5d2b6a4b3290 |
| strictMode | false |
| ragPromptHash | 49480e1eda27 |
| rewritePromptHash | 2fec14908b82 |
| judgePromptHash | 9a519b0fae49 |
| goldsetHash | 892f992f7ac1 |

## Summary (en 문항 기준)

gate = 회귀 차단 기준(`pnpm eval --strict` 실행 시 미달이면 exit 1), target = 개선 목표 (근거: src/eval/targets.ts)

| metric | score | gate | target | 상태 |
|---|---|---|---|---|
| Recall@k (doc) | 0.966 | ≥ 0.95 | ≥ 1 | ✅ gate 통과 |
| Anchor Recall@k | 0.625 | ≥ 0.6 | ≥ 0.85 | ✅ gate 통과 |
| MRR | 0.819 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |
| Citation Precision | 0.896 | ≥ 0.85 | ≥ 0.95 | ✅ gate 통과 |
| Abstention Accuracy | 1.000 | ≥ 0.75 | ≥ 1 | 🎯 target 달성 |
| False Refusal Rate | 0.103 | ≤ 0.1 | ≤ 0 | ❌ gate 미달 |
| Faithfulness | 0.808 | ≥ 0.9 | ≥ 1 | ❌ gate 미달 |
| Correctness | 0.828 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 0.667 |
| summary | 5 | 0.800 | 0.875 |
| reasoning | 4 | 1.000 | 0.875 |
| multihop | 5 | 0.900 | 0.800 |
| misconception | 2 | 0.750 | 1.000 |
| multiturn | 2 | 0.750 | 1.000 |
| injection | 1 | N/A | N/A |
| partial | 2 | 0.000 | N/A |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=4)

- correctness: 1.000, abstention: 1.000, false refusal: 0.000

## 문항별 결과

| id | type | lang | answered | recall | aRecall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | N/A | 1.000 | 0.000 | 1.000 | 22972ms
q02 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 18751ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 10117ms
q04 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 10798ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 252809ms
q06 | factoid | en | Y | 1.000 | 1.000 | 0.250 | 0.500 | 1.000 | 1.000 | 1.000 | 7581ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 10507ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 8900ms
q09 | factoid | en | Y | 1.000 | 1.000 | 1.000 | N/A | 1.000 | 0.000 | 0.500 | 5493ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 7451ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 13004ms
q12 | summary | en | refuse | 1.000 | N/A | 0.500 | N/A | 0.000 | N/A | 0.000 | 14699ms
q13 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 9933ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 9432ms
q15 | summary | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 0.500 | 1.000 | 19049ms
q16 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 10598ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 9205ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 12997ms
q19 | reasoning | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 0.500 | 1.000 | 13096ms
q20 | reasoning | ko | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 25072ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 5864ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 5824ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 5032ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 10252ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 5495ms
q26 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 9174ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 11190ms
q28 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 7284ms
q29 | multihop | en | Y | 1.000 | 0.000 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 9130ms
q30 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 11756ms
q31 | misconception | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 8544ms
q32 | misconception | en | Y | 1.000 | N/A | 0.500 | 0.500 | 1.000 | 1.000 | 0.500 | 10188ms
q33 | multiturn | ko | Y | 1.000 | N/A | 0.500 | 0.667 | 1.000 | 1.000 | 1.000 | 16698ms
q34 | multiturn | en | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 20016ms
q35 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 0.500 | 15107ms
q36 | injection | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 6940ms
q37 | partial | en | refuse | 1.000 | 1.000 | 0.500 | N/A | 0.000 | N/A | 0.000 | 10699ms
q38 | partial | en | refuse | 1.000 | 0.000 | 0.333 | N/A | 0.000 | N/A | 0.000 | 7041ms
