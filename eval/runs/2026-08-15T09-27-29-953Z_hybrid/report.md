# Eval Report — 2026-08-15T09:27:29.953Z

## Run Config

| key | value |
|---|---|
| retriever | hybrid |
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
| Citation Precision | 0.750 |
| Abstention Accuracy (unanswerable) | 1.000 |
| False Refusal Rate (answerable) | 0.000 |
| Faithfulness (judge) | 1.000 |
| Correctness (judge) | 0.861 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 0.750 | 1.000 |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=3)

- correctness: 1.000, abstention: 1.000

## 문항별 결과

| id | type | lang | answered | recall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2227ms
q02 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1168ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1204ms
q04 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1929ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1415ms
q06 | factoid | en | Y | 1.000 | 0.250 | 0.500 | 1.000 | 1.000 | 1.000 | 1894ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1601ms
q08 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1877ms
q09 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 0.500 | 1005ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1754ms
q11 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2200ms
q12 | summary | en | Y | 1.000 | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1485ms
q13 | summary | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1462ms
q14 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1884ms
q15 | summary | en | Y | 1.000 | 0.333 | 0.500 | 1.000 | 1.000 | 1.000 | 1685ms
q16 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2247ms
q17 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.000 | 1959ms
q18 | reasoning | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 2097ms
q19 | reasoning | en | Y | 1.000 | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 2298ms
q20 | reasoning | ko | Y | 1.000 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1609ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 885ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 920ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 811ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 851ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 879ms
