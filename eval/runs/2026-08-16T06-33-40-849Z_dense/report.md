# Eval Report — 2026-08-16T06:33:40.849Z

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
| ragPromptHash | 35bfbe2fce38 |
| judgePromptHash | 9a519b0fae49 |
| goldsetHash | f2d15bf02940 |

## Summary (en 문항 기준)

gate = 회귀 차단 기준(`pnpm eval --strict` 실행 시 미달이면 exit 1), target = 개선 목표 (근거: src/eval/targets.ts)

| metric | score | gate | target | 상태 |
|---|---|---|---|---|
| Recall@k (doc) | 0.963 | ≥ 0.95 | ≥ 1 | ✅ gate 통과 |
| Anchor Recall@k | 0.643 | ≥ 0.6 | ≥ 0.85 | ✅ gate 통과 |
| MRR | 0.849 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |
| Citation Precision | 0.960 | ≥ 0.85 | ≥ 0.95 | 🎯 target 달성 |
| Abstention Accuracy | 1.000 | ≥ 0.75 | ≥ 1 | 🎯 target 달성 |
| False Refusal Rate | 0.074 | ≤ 0.1 | ≤ 0 | ✅ gate 통과 |
| Faithfulness | 1.000 | ≥ 0.9 | ≥ 1 | 🎯 target 달성 |
| Correctness | 0.852 | ≥ 0.85 | ≥ 0.95 | ✅ gate 통과 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 1.000 | 1.000 |
| multihop | 5 | 0.900 | 1.000 |
| misconception | 2 | 0.000 | N/A |
| multiturn | 2 | 1.000 | 1.000 |
| injection | 1 | N/A | N/A |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=4)

- correctness: 1.000, abstention: 1.000

## 문항별 결과

| id | type | lang | answered | recall | aRecall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1946ms
q02 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1180ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1338ms
q04 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1445ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1356ms
q06 | factoid | en | Y | 1.000 | 1.000 | 0.250 | 1.000 | 1.000 | 1.000 | 1.000 | 1953ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1247ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1407ms
q09 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.500 | 1400ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1570ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1651ms
q12 | summary | en | Y | 1.000 | N/A | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1517ms
q13 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1659ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1969ms
q15 | summary | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 1358ms
q16 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1914ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1946ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1608ms
q19 | reasoning | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1898ms
q20 | reasoning | ko | Y | 1.000 | N/A | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1589ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1032ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 867ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1035ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1036ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 807ms
q26 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1177ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1965ms
q28 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1836ms
q29 | multihop | en | Y | 1.000 | 0.000 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 1875ms
q30 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2550ms
q31 | misconception | en | refuse | 1.000 | N/A | 0.333 | N/A | 0.000 | N/A | 0.000 | 932ms
q32 | misconception | en | refuse | 1.000 | N/A | 0.500 | N/A | 0.000 | N/A | 0.000 | 872ms
q33 | multiturn | ko | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 2572ms
q34 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2154ms
q35 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2236ms
q36 | injection | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 857ms
