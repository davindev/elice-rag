# Eval Report — 2026-08-15T10:47:25.567Z

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
| goldsetHash | ee6b27ef4aec |

## Summary (en 문항 기준)

| metric | score |
|---|---|
| Recall@k | 1.000 |
| MRR | 0.866 |
| Citation Precision | 0.694 |
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
q01 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 3156ms
q02 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1317ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1199ms
q04 | factoid | en | Y | 1.000 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1915ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1779ms
q06 | factoid | en | Y | 1.000 | 0.250 | 0.500 | 1.000 | 1.000 | 1.000 | 1452ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1474ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1428ms
q09 | factoid | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 0.500 | 944ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1923ms
q11 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1915ms
q12 | summary | en | Y | 1.000 | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1548ms
q13 | summary | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 2677ms
q14 | summary | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2095ms
q15 | summary | en | Y | 1.000 | 0.333 | 0.500 | 1.000 | 1.000 | 1.000 | 1761ms
q16 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2117ms
q17 | reasoning | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1795ms
q18 | reasoning | en | Y | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1870ms
q19 | reasoning | en | Y | 1.000 | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1726ms
q20 | reasoning | ko | Y | 1.000 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1692ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 888ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 960ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 916ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 777ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | 1.000 | N/A | N/A | 1019ms
