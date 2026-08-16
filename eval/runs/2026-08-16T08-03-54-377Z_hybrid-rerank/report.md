# Eval Report — 2026-08-16T08:03:54.377Z

## Run Config

| key | value |
|---|---|
| retriever | hybrid-rerank |
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
| rerankModel | gpt-4o-mini |
| rerankCandidateK | 20 |
| rerankPromptHash | d185c488e47d |
| rerankFallbackCount | 3 |

## Summary (en 문항 기준)

gate = 회귀 차단 기준(`pnpm eval --strict` 실행 시 미달이면 exit 1), target = 개선 목표 (근거: src/eval/targets.ts)

| metric | score | gate | target | 상태 |
|---|---|---|---|---|
| Recall@k (doc) | 0.981 | ≥ 0.95 | ≥ 1 | ✅ gate 통과 |
| Anchor Recall@k | 0.786 | ≥ 0.6 | ≥ 0.85 | ✅ gate 통과 |
| MRR | 0.858 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |
| Citation Precision | 0.988 | ≥ 0.85 | ≥ 0.95 | 🎯 target 달성 |
| Abstention Accuracy | 1.000 | ≥ 0.75 | ≥ 1 | 🎯 target 달성 |
| False Refusal Rate | 0.000 | ≤ 0.1 | ≤ 0 | 🎯 target 달성 |
| Faithfulness | 0.963 | ≥ 0.9 | ≥ 1 | ✅ gate 통과 |
| Correctness | 0.944 | ≥ 0.85 | ≥ 0.95 | ✅ gate 통과 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 0.800 |
| reasoning | 4 | 1.000 | 1.000 |
| multihop | 5 | 1.000 | 1.000 |
| misconception | 2 | 1.000 | 1.000 |
| multiturn | 2 | 1.000 | 1.000 |
| injection | 1 | N/A | N/A |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=4)

- correctness: 0.667, abstention: 1.000, false refusal: 0.333

## 문항별 결과

| id | type | lang | answered | recall | aRecall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4161ms
q02 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1953ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2962ms
q04 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2500ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2612ms
q06 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2184ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2820ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2866ms
q09 | factoid | en | Y | 1.000 | 0.000 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 2390ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2604ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2618ms
q12 | summary | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 0.000 | 0.000 | 3204ms
q13 | summary | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 2769ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2618ms
q15 | summary | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 2782ms
q16 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2689ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3200ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2818ms
q19 | reasoning | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 2255ms
q20 | reasoning | ko | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2105ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1762ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1445ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1680ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1664ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1677ms
q26 | multihop | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2491ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3021ms
q28 | multihop | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3045ms
q29 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2798ms
q30 | multihop | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2827ms
q31 | misconception | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 2372ms
q32 | misconception | en | Y | 1.000 | N/A | 0.500 | 0.667 | 1.000 | 1.000 | 1.000 | 2586ms
q33 | multiturn | ko | refuse | 1.000 | N/A | 1.000 | N/A | 0.000 | N/A | 0.000 | 3290ms
q34 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3009ms
q35 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2840ms
q36 | injection | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1694ms
