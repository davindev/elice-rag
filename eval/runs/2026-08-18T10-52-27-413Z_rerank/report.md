# Eval Report — 2026-08-18T10:52:27.413Z

## Run Config

| key | value |
|---|---|
| retriever | rerank |
| llmModel | gpt-5.6-sol |
| embeddingModel | text-embedding-3-small |
| judgeModel | gemini-3.1-pro-preview |
| temperature | null |
| topK | 10 |
| minScore | 0 |
| corpusSha | 383a1e9239c8 |
| embeddingInput | content |
| indexFingerprint | 1003청크 / 5d2b6a4b3290 |
| strictMode | false |
| ragPromptHash | 49480e1eda27 |
| rewritePromptHash | 2fec14908b82 |
| judgePromptHash | 9a519b0fae49 |
| goldsetHash | c2ac600315c2 |
| rerankModel | gpt-5.6-sol |
| rerankCandidateK | 40 |
| rerankPromptHash | d185c488e47d |
| rerankFallbackCount | 4 |

## Summary (en 문항 기준)

gate = 회귀 차단 기준(`pnpm eval --strict` 실행 시 미달이면 exit 1), target = 개선 목표 (근거: src/eval/targets.ts)

| metric | score | gate | target | 상태 |
|---|---|---|---|---|
| Recall@k (doc) | 1.000 | ≥ 0.95 | ≥ 1 | 🎯 target 달성 |
| Anchor Recall@k | 0.906 | ≥ 0.6 | ≥ 0.85 | 🎯 target 달성 |
| MRR | 0.891 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |
| Citation Precision | 0.776 | ≥ 0.85 | ≥ 0.95 | ❌ gate 미달 |
| Abstention Accuracy | 1.000 | ≥ 0.75 | ≥ 1 | 🎯 target 달성 |
| False Refusal Rate | 0.103 | ≤ 0.1 | ≤ 0 | ❌ gate 미달 |
| Faithfulness | 1.000 | ≥ 0.9 | ≥ 1 | 🎯 target 달성 |
| Correctness | 0.845 | ≥ 0.8 | ≥ 0.9 | ✅ gate 통과 |

### 유형별 (en)

| type | n | correctness | faithfulness |
|---|---|---|---|
| factoid | 9 | 0.944 | 1.000 |
| summary | 5 | 0.800 | 1.000 |
| reasoning | 4 | 1.000 | 1.000 |
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
q01 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 9188ms
q02 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 8533ms
q03 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 7904ms
q04 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 12909ms
q05 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 9475ms
q06 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 14396ms
q07 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 11046ms
q08 | factoid | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 18062ms
q09 | factoid | en | Y | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.500 | 9794ms
q10 | factoid | ko | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 11198ms
q11 | summary | en | Y | 1.000 | N/A | 1.000 | 0.667 | 1.000 | 1.000 | 1.000 | 14843ms
q12 | summary | en | refuse | 1.000 | N/A | 1.000 | N/A | 0.000 | N/A | 0.000 | 14693ms
q13 | summary | en | Y | 1.000 | N/A | 0.500 | 0.667 | 1.000 | 1.000 | 1.000 | 17191ms
q14 | summary | en | Y | 1.000 | N/A | 1.000 | 0.333 | 1.000 | 1.000 | 1.000 | 16701ms
q15 | summary | en | Y | 1.000 | N/A | 0.500 | 0.500 | 1.000 | 1.000 | 1.000 | 11340ms
q16 | reasoning | en | Y | 1.000 | N/A | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 13239ms
q17 | reasoning | en | Y | 1.000 | N/A | 1.000 | 0.750 | 1.000 | 1.000 | 1.000 | 18887ms
q18 | reasoning | en | Y | 1.000 | N/A | 1.000 | 0.250 | 1.000 | 1.000 | 1.000 | 11603ms
q19 | reasoning | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 11641ms
q20 | reasoning | ko | Y | 1.000 | N/A | 0.333 | 0.750 | 1.000 | 1.000 | 1.000 | 12078ms
q21 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 7474ms
q22 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 5233ms
q23 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 4432ms
q24 | unanswerable | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 8634ms
q25 | unanswerable | ko | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 6913ms
q26 | multihop | en | Y | 1.000 | 1.000 | 0.500 | 0.667 | 1.000 | 1.000 | 1.000 | 10467ms
q27 | multihop | en | Y | 1.000 | 0.500 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 11889ms
q28 | multihop | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 10219ms
q29 | multihop | en | Y | 1.000 | 1.000 | 0.500 | 0.750 | 1.000 | 1.000 | 0.500 | 16939ms
q30 | multihop | en | Y | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 11488ms
q31 | misconception | en | Y | 1.000 | N/A | 0.333 | 1.000 | 1.000 | 1.000 | 1.000 | 12336ms
q32 | misconception | en | Y | 1.000 | N/A | 1.000 | 0.600 | 1.000 | 1.000 | 0.500 | 9855ms
q33 | multiturn | ko | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 22849ms
q34 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 13433ms
q35 | multiturn | en | Y | 1.000 | N/A | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 13423ms
q36 | injection | en | refuse | N/A | N/A | N/A | N/A | 1.000 | N/A | N/A | 6533ms
q37 | partial | en | refuse | 1.000 | 1.000 | 1.000 | N/A | 0.000 | N/A | 0.000 | 14487ms
q38 | partial | en | refuse | 1.000 | 1.000 | 1.000 | N/A | 0.000 | N/A | 0.000 | 9432ms
