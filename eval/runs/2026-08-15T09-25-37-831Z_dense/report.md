# Eval Report — 2026-08-15T09:25:37.831Z

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
| goldsetHash | 7bd10b2cce2a |

## Summary (en 문항 기준)

| metric | score |
|---|---|
| Recall@k | 1.000 |
| MRR | 0.866 |
| Citation Precision | 0.694 |
| Abstention Accuracy (unanswerable) | 1.000 |
| False Refusal Rate (answerable) | 0.000 |
| Faithfulness (judge) | 1.000 |
| Correctness (judge) | 0.833 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.889 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 0.750 | 1.000 |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=3)

- correctness: 1.000, abstention: 1.000

## 문항별 결과

| id | type | lang | answered | recall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 2462ms
q02 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1272ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1388ms
q04 | factoid | en | Y | 1.000 | 1.000 | 0.000 | 1.000 | 1.000 | 0.500 | 1329ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1255ms
q06 | factoid | en | Y | 1.000 | 0.250 | 0.500 | 1.000 | 1.000 | 1.000 | 1737ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1647ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1540ms
q09 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 0.500 | 1098ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1906ms
q11 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2053ms
q12 | summary | en | Y | 1.000 | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1454ms
q13 | summary | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 2279ms
q14 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2688ms
q15 | summary | en | Y | 1.000 | 0.333 | 0.500 | 1.000 | 1.000 | 1.000 | 1525ms
q16 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2622ms
q17 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.000 | 2303ms
q18 | reasoning | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 2841ms
q19 | reasoning | en | Y | 1.000 | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 2132ms
q20 | reasoning | ko | Y | 1.000 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1951ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 953ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1082ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1170ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1009ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 994ms
