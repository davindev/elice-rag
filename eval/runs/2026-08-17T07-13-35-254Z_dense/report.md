# Eval Report — 2026-08-17T07:13:35.254Z

## Run Config

| key | value |
|---|---|
| retriever | dense |
| llmModel | gpt-4o-mini |
| embeddingModel | text-embedding-3-small |
| judgeModel | gpt-4o |
| temperature | 0 |
| topK | 5 |
| minScore | 0 |
| corpusSha | 383a1e9239c8 |
| embeddingInput | content |
| indexFingerprint | 1003청크 / 5d2b6a4b3290 |
| strictMode | false |
| ragPromptHash | 71fde37c2dea |
| rewritePromptHash | 2fec14908b82 |
| judgePromptHash | 9a519b0fae49 |
| goldsetHash | 9c3c929edf2b |

## Summary (en 문항 기준)

gate = 회귀 차단 기준(`pnpm eval --strict` 실행 시 미달이면 exit 1), target = 개선 목표 (근거: src/eval/targets.ts)

| metric | score | gate | target | 상태 |
|---|---|---|---|---|
| Recall@k (doc) | 0.963 | ≥ 0.95 | ≥ 1 | ✅ gate 통과 |
| Anchor Recall@k | 0.643 | ≥ 0.6 | ≥ 0.85 | ✅ gate 통과 |
| MRR | 0.849 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |
| Citation Precision | 0.944 | ≥ 0.85 | ≥ 0.95 | ✅ gate 통과 |
| Abstention Accuracy | 1.000 | ≥ 0.75 | ≥ 1 | 🎯 target 달성 |
| False Refusal Rate | 0.000 | ≤ 0.1 | ≤ 0 | 🎯 target 달성 |
| Faithfulness | 1.000 | ≥ 0.9 | ≥ 1 | 🎯 target 달성 |
| Correctness | 0.926 | ≥ 0.85 | ≥ 0.95 | ✅ gate 통과 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 1.000 | 1.000 |
| multihop | 5 | 0.900 | 1.000 |
| misconception | 2 | 1.000 | 1.000 |
| multiturn | 2 | 1.000 | 1.000 |
| injection | 1 | N/A | N/A |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=4)

- correctness: 0.667, abstention: 1.000, false refusal: 0.333

## 문항별 결과

| id | type | lang | answered | recall | aRecall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1946ms
q02 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1727ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1774ms
q04 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1752ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1184ms
q06 | factoid | en | Y | 1.000 | 1.000 | 0.250 | 1.000 | 1.000 | 1.000 | 1.000 | 1499ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1597ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1475ms
q09 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.500 | 1261ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2230ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3786ms
q12 | summary | en | Y | 1.000 | N/A | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1576ms
q13 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2438ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2977ms
q15 | summary | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 2069ms
q16 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2194ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2312ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1975ms
q19 | reasoning | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1955ms
q20 | reasoning | ko | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1741ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 867ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 881ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1077ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1182ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1091ms
q26 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2590ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2152ms
q28 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2629ms
q29 | multihop | en | Y | 1.000 | 0.000 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 1749ms
q30 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2273ms
q31 | misconception | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 1356ms
q32 | misconception | en | Y | 1.000 | N/A | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1578ms
q33 | multiturn | ko | refuse | 1.000 | N/A | 0.333 | N/A | 0.000 | N/A | 0.000 | 1558ms
q34 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2452ms
q35 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2665ms
q36 | injection | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 900ms
