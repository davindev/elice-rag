import { readFile } from 'node:fs/promises';
import { z } from 'zod';

// goldset.jsonl은 손으로 편집하는 데이터 파일(시스템 경계)이므로 런타임 검증한다
const goldItemSchema = z.object({
  id: z.string(),
  type: z.enum(['factoid', 'summary', 'reasoning', 'unanswerable']),
  language: z.enum(['en', 'ko']),
  question: z.string().min(1),
  expectedEvidence: z.array(z.string()),
  acceptanceCriteria: z.string().min(1),
  referenceAnswer: z.string().optional(),
  notes: z.string().optional(),
});

export type GoldItem = z.infer<typeof goldItemSchema>;

export async function loadGoldset(filePath: string): Promise<GoldItem[]> {
  const raw = await readFile(filePath, 'utf-8');
  const items = raw
    .trim()
    .split('\n')
    .map((line, i) => {
      const parsed = goldItemSchema.safeParse(JSON.parse(line));
      if (!parsed.success) {
        throw new Error(`goldset ${i + 1}번째 줄 검증 실패: ${parsed.error.message}`);
      }
      return parsed.data;
    });

  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) throw new Error('goldset에 중복 id가 있습니다');
  return items;
}
