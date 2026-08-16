# Eval Report — 2026-08-16T06:52:19.325Z

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
| ragPromptHash | 71fde37c2dea |
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
| Correctness | 0.944 | ≥ 0.85 | ≥ 0.95 | ✅ gate 통과 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 1.000 | 1.000 |
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
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1642ms
q02 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 972ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1162ms
q04 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1841ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1184ms
q06 | factoid | en | Y | 1.000 | 1.000 | 0.250 | 1.000 | 1.000 | 1.000 | 1.000 | 1900ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1614ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1521ms
q09 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1453ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2124ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2521ms
q12 | summary | en | Y | 1.000 | N/A | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1892ms
q13 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1544ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1756ms
q15 | summary | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 1694ms
q16 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1805ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1613ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1589ms
q19 | reasoning | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1574ms
q20 | reasoning | ko | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1398ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 938ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 834ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 945ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 840ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 760ms
q26 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2424ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2208ms
q28 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3052ms
q29 | multihop | en | Y | 1.000 | 0.000 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 1833ms
q30 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1803ms
q31 | misconception | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 1337ms
q32 | misconception | en | Y | 1.000 | N/A | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1446ms
q33 | multiturn | ko | refuse | 1.000 | N/A | 0.500 | N/A | 0.000 | N/A | 0.000 | 1519ms
q34 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2091ms
q35 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2144ms
q36 | injection | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1051ms
