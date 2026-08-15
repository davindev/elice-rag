# Eval Report — 2026-08-15T11:31:25.636Z

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
| goldsetHash | 0d5ae0fb1f24 |

## Summary (en 문항 기준)

| metric | score |
|---|---|
| Recall@k (doc) | 0.957 |
| Anchor Recall@k (section) | 0.643 |
| MRR | 0.873 |
| Citation Precision | 0.746 |
| Abstention Accuracy (unanswerable) | 1.000 |
| False Refusal Rate (answerable) | 0.000 |
| Faithfulness (judge) | 1.000 |
| Correctness (judge) | 0.913 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 1.000 | 1.000 |
| multihop | 5 | 0.900 | 1.000 |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=3)

- correctness: 1.000, abstention: 1.000

## 문항별 결과

| id | type | lang | answered | recall | aRecall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1630ms
q02 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1276ms
q03 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1603ms
q04 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1815ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1598ms
q06 | factoid | en | Y | 1.000 | 1.000 | 0.250 | 0.500 | 1.000 | 1.000 | 1.000 | 1791ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1641ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1872ms
q09 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 0.500 | 1053ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1752ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1910ms
q12 | summary | en | Y | 1.000 | N/A | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 1476ms
q13 | summary | en | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1951ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2045ms
q15 | summary | en | Y | 1.000 | N/A | 0.333 | 0.500 | 1.000 | 1.000 | 1.000 | 1734ms
q16 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2626ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1853ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1707ms
q19 | reasoning | en | Y | 1.000 | N/A | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1812ms
q20 | reasoning | ko | Y | 1.000 | N/A | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1836ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 932ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 987ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1029ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1001ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 938ms
q26 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1670ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2485ms
q28 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1925ms
q29 | multihop | en | Y | 1.000 | 0.000 | 0.500 | 0.667 | 1.000 | 1.000 | 0.500 | 1654ms
q30 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 2197ms
