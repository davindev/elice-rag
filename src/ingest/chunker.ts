import { createHash } from 'node:crypto';
import { countTokens } from './tokens.js';

export interface Chunk {
  /** 저장 페이로드 전체의 해시로 만든 결정적 ID — 재인덱싱 시 멱등성 보장 */
  id: string;
  docPath: string;
  /** [문서 제목, h2, h3, ...] 형태의 breadcrumb */
  headingPath: string[];
  /** react.dev heading 앵커 주석에서 추출한 ID — citation URL 조각 (청크 시작 섹션 기준) */
  anchor: string | null;
  /** 이 청크에 포함된 모든 섹션의 앵커 — 앵커 단위 evidence 매칭용 (청킹 전략과 무관한 문서 고유 키) */
  anchors: string[];
  content: string;
  tokenCount: number;
}

/** 임베딩 입력 방식 식별자 — run 메타데이터에 기록해 임베딩 체계 변경을 추적. 현재는 content 그 자체 */
export const EMBED_INPUT_SCHEME = 'content' as const;

interface Section {
  level: number;
  heading: string;
  anchor: string | null;
  lines: string[];
}

export interface ChunkOptions {
  /** 청크 최대 토큰 수. 초과 시 문단 경계에서 분할 */
  maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 500;
const HEADING_RE = /^(#{1,4})\s+(.+?)(?:\s*\{\/\*(.+?)\*\/\})?\s*$/;

/**
 * heading 구조 기반 청킹.
 *
 * 1. 코드 펜스를 인식하며 h1~h4 경계로 섹션 분할 (heading은 마크다운 문서의 의미 단위)
 * 2. 같은 h2 아래의 연속 섹션을 maxTokens까지 greedy하게 병합 — 의미적 지역성을
 *    보존하면서 잘게 쪼개진 저정보 청크를 방지
 * 3. 단일 섹션이 maxTokens를 초과하면 문단 경계에서 분할하고 직전 문단 1개를
 *    overlap으로 포함 — 경계에서 잘린 문맥의 검색 누락 완화
 */
export function chunkDocument(
  docPath: string,
  title: string,
  body: string,
  options: ChunkOptions = {},
): Chunk[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const sections = splitSections(body);
  const chunks: Chunk[] = [];

  // heading breadcrumb 추적: [title, h2, h3, h4]
  const trail = new Map<number, string>();
  let pending: {
    headingPath: string[];
    anchor: string | null;
    anchors: string[];
    texts: string[];
    tokens: number;
  } | null = null;
  let pendingH2: string | null = null;

  const flush = () => {
    if (!pending) return;
    const content = pending.texts.join('\n\n').trim();
    if (content.length > 0) {
      chunks.push(
        makeChunk(docPath, pending.headingPath, pending.anchor, pending.anchors, content),
      );
    }
    pending = null;
  };

  for (const section of sections) {
    trail.set(section.level, section.heading);
    for (const level of [...trail.keys()]) {
      if (level > section.level) trail.delete(level);
    }
    const headingPath = [
      title,
      ...[2, 3, 4].map((l) => trail.get(l)).filter((h): h is string => h !== undefined),
    ];
    const currentH2 = trail.get(2) ?? null;

    const text = sectionText(section);
    const tokens = countTokens(text);

    const sectionAnchors = section.anchor === null ? [] : [section.anchor];

    if (tokens > maxTokens) {
      flush();
      for (const part of splitOversized(text, maxTokens)) {
        chunks.push(makeChunk(docPath, headingPath, section.anchor, sectionAnchors, part));
      }
      pendingH2 = currentH2;
      continue;
    }

    if (pending && pendingH2 === currentH2 && pending.tokens + tokens <= maxTokens) {
      pending.texts.push(text);
      pending.tokens += tokens;
      pending.anchors.push(...sectionAnchors);
    } else {
      flush();
      pending = {
        headingPath,
        anchor: section.anchor,
        anchors: sectionAnchors,
        texts: [text],
        tokens,
      };
      pendingH2 = currentH2;
    }
  }
  flush();

  return chunks;
}

function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { level: 1, heading: '', anchor: null, lines: [] };
  let inFence = false;

  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) inFence = !inFence;
    const match = inFence ? null : HEADING_RE.exec(line);
    if (match) {
      sections.push(current);
      current = {
        level: match[1]?.length ?? 1,
        heading: (match[2] ?? '').trim(),
        anchor: match[3]?.trim() ?? null,
        lines: [],
      };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);

  return sections.filter((s) => s.heading !== '' || s.lines.some((l) => l.trim() !== ''));
}

function sectionText(section: Section): string {
  const body = section.lines.join('\n').trim();
  // heading을 청크 본문에 포함해 임베딩이 섹션 주제를 반영하도록 한다
  return section.heading === ''
    ? body
    : `${'#'.repeat(section.level)} ${section.heading}\n\n${body}`;
}

function splitOversized(text: string, maxTokens: number): string[] {
  const paragraphs = splitParagraphs(text);
  const parts: string[] = [];
  let current: string[] = [];
  let tokens = 0;

  for (const para of paragraphs) {
    const paraTokens = countTokens(para);
    const overlap = current.at(-1);
    if (overlap !== undefined && tokens + paraTokens > maxTokens) {
      parts.push(current.join('\n\n'));
      // 직전 문단 자체가 상한 절반을 넘으면 overlap으로 부적합 (거대 코드 블록 등)
      const overlapTokens = countTokens(overlap);
      current = overlapTokens <= maxTokens / 2 ? [overlap] : [];
      tokens = current.length > 0 ? overlapTokens : 0;
    }
    current.push(para);
    tokens += paraTokens;
  }
  if (current.length > 0) parts.push(current.join('\n\n'));

  return parts;
}

/** 코드 펜스 내부의 빈 줄로는 문단을 나누지 않는다 */
function splitParagraphs(text: string): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  let inFence = false;

  for (const line of text.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) inFence = !inFence;
    if (line.trim() === '' && !inFence) {
      if (current.length > 0) {
        paragraphs.push(current.join('\n'));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) paragraphs.push(current.join('\n'));

  return paragraphs;
}

function makeChunk(
  docPath: string,
  headingPath: string[],
  anchor: string | null,
  anchors: string[],
  content: string,
): Chunk {
  // 해시는 저장 페이로드 전체 기준 — 임베딩 입력(content)만이 아니라 앵커·breadcrumb 같은
  // 메타데이터만 바뀐 경우에도 새 ID가 되어, 증분 ingest가 갱신을 스킵해 옛 메타데이터가
  // DB에 잔류하는 일이 없도록 한다 (멱등성의 전제)
  const id = createHash('sha256')
    .update(`${docPath}\n${headingPath.join('>')}\n${anchors.join(',')}\n${content}`)
    .digest('hex')
    .slice(0, 24);
  return { id, docPath, headingPath, anchor, anchors, content, tokenCount: countTokens(content) };
}
