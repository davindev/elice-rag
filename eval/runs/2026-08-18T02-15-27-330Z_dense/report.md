# Eval Report — 2026-08-18T02:15:27.330Z

## Run Config

| key | value |
|---|---|
| retriever | dense |
| llmModel | gpt-5.6-sol |
| embeddingModel | text-embedding-3-small |
| judgeModel | gemini-3.1-pro-preview |
| temperature | null |
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
| Citation Precision | 0.883 | ≥ 0.85 | ≥ 0.95 | ✅ gate 통과 |
| Abstention Accuracy | 1.000 | ≥ 0.75 | ≥ 1 | 🎯 target 달성 |
| False Refusal Rate | 0.069 | ≤ 0.1 | ≤ 0 | ✅ gate 통과 |
| Faithfulness | 0.981 | ≥ 0.9 | ≥ 1 | ✅ gate 통과 |
| Correctness | 0.845 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 1.000 | 0.875 |
| multihop | 5 | 0.900 | 1.000 |
| misconception | 2 | 0.750 | 1.000 |
| multiturn | 2 | 1.000 | 1.000 |
| injection | 1 | N/A | N/A |
| partial | 2 | 0.000 | N/A |
| unanswerable | 4 | N/A | N/A |

### 한국어 probe (분리 집계, n=4)

- correctness: 1.000, abstention: 1.000, false refusal: 0.000

## 문항별 결과

| id | type | lang | answered | recall | aRecall | RR | citP | abst | faith | corr | latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3179ms
q02 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 2608ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4010ms
q04 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4459ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3394ms
q06 | factoid | en | Y | 1.000 | 1.000 | 0.250 | 0.500 | 1.000 | 1.000 | 1.000 | 3992ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3396ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3921ms
q09 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.500 | 2908ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3123ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 5193ms
q12 | summary | en | Y | 1.000 | N/A | 0.500 | 0.000 | 1.000 | 1.000 | 0.000 | 4293ms
q13 | summary | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 5331ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 0.667 | 1.000 | 1.000 | 1.000 | 4584ms
q15 | summary | en | Y | 1.000 | N/A | 0.333 | 0.667 | 1.000 | 1.000 | 1.000 | 3451ms
q16 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4404ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 0.667 | 1.000 | 1.000 | 1.000 | 6115ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4442ms
q19 | reasoning | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 0.500 | 1.000 | 5671ms
q20 | reasoning | ko | Y | 1.000 | N/A | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 3923ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 2172ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 3381ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 2822ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 1930ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 2249ms
q26 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4658ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3566ms
q28 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 5156ms
q29 | multihop | en | Y | 1.000 | 0.000 | 0.500 | 1.000 | 1.000 | 1.000 | 0.500 | 3211ms
q30 | multihop | en | Y | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 3624ms
q31 | misconception | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 3250ms
q32 | misconception | en | Y | 1.000 | N/A | 0.500 | 0.333 | 1.000 | 1.000 | 0.500 | 3994ms
q33 | multiturn | ko | Y | 1.000 | N/A | 0.500 | 0.667 | 1.000 | 1.000 | 1.000 | 9202ms
q34 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4548ms
q35 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 4797ms
q36 | injection | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 2231ms
q37 | partial | en | refuse | 1.000 | 1.000 | 0.500 | N/A | 0.000 | N/A | 0.000 | 4362ms
q38 | partial | en | refuse | 1.000 | 0.000 | 0.333 | N/A | 0.000 | N/A | 0.000 | 2578ms
