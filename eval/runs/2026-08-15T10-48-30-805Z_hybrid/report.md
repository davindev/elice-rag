# Eval Report — 2026-08-15T10:48:30.805Z

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
| goldsetHash | ee6b27ef4aec |

## Summary (en 문항 기준)

| metric | score |
|---|---|
| Recall@k | 1.000 |
| MRR | 0.866 |
| Citation Precision | 0.750 |
| Abstention Accuracy (unanswerable) | 1.000 |
| False Refusal Rate (answerable) | 0.000 |
| Faithfulness (judge) | 1.000 |
| Correctness (judge) | 0.917 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 1.000 | 1.000 |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=3)

- correctness: 1.000, abstention: 1.000

## 문항별 결과

| id | type | lang | answered | recall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2264ms
q02 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1229ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1368ms
q04 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2638ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1507ms
q06 | factoid | en | Y | 1.000 | 0.250 | 0.500 | 1.000 | 1.000 | 1.000 | 1381ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1775ms
q08 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1468ms
q09 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 0.500 | 1111ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1862ms
q11 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2135ms
q12 | summary | en | Y | 1.000 | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1547ms
q13 | summary | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1913ms
q14 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2128ms
q15 | summary | en | Y | 1.000 | 0.333 | 0.500 | 1.000 | 1.000 | 1.000 | 1633ms
q16 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2212ms
q17 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1630ms
q18 | reasoning | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1636ms
q19 | reasoning | en | Y | 1.000 | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1876ms
q20 | reasoning | ko | Y | 1.000 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1538ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1126ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1140ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 883ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1184ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1074ms
