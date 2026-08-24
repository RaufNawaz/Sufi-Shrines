import type { ArticleSection, InlineSection, ParsedArticle, ShrineRow } from '../../types/shrine';
import {
  ARTICLE_SECTION_DEFINITIONS,
  LEAD_PARAGRAPH_KEYS,
  STRUCTURED_DESCRIPTION_HEADING_ALIASES,
} from './constants';
import { getFieldValue, getUrduFieldValue } from './fieldAliasing';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHeadingMarkup(text: string): string {
  return text
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^=+\s*(.*?)\s*=+$/, '$1')
    .replace(/^\*\*(.*?)\*\*$/, '$1')
    .replace(/^__(.*?)__$/, '$1')
    .trim();
}

function normalizeHeading(text: string): string {
  return stripHeadingMarkup(text)
    .replace(/\s+/g, ' ')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/[：:]+$/u, '')
    .replace(/\s*[-–—]+\s*$/u, '')
    .trim()
    .toLowerCase();
}

function isExplicitHeadingLine(line: string): boolean {
  const raw = line.trim();
  return /^#{1,6}\s+\S/u.test(raw) || /^=+\s*\S.*\s*=+\s*$/u.test(raw);
}

function detectHeading(line: string): { matched: boolean; inlineContent: string } | null {
  const rawLine = line.trim();
  const cleanedLine = stripHeadingMarkup(rawLine);
  const normalizedLine = normalizeHeading(cleanedLine);
  if (!normalizedLine) return null;

  for (const alias of STRUCTURED_DESCRIPTION_HEADING_ALIASES) {
    const normalizedAlias = normalizeHeading(alias);
    if (!normalizedAlias) continue;

    if (normalizedLine === normalizedAlias) {
      return { matched: true, inlineContent: '' };
    }

    const inlineMatch = cleanedLine.match(
      new RegExp(`^${escapeRegExp(alias)}\\s*[:\\-–—]\\s*(.+)$`, 'i'),
    );
    if (inlineMatch) {
      return { matched: true, inlineContent: String(inlineMatch[1] || '').trim() };
    }
  }

  if (isExplicitHeadingLine(rawLine)) {
    return { matched: true, inlineContent: '' };
  }

  return null;
}

export function extractLeadPreviewText(text: string): string {
  const blocks = String(text || '')
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (!blocks.length) return '';

  const leadBlocks: string[] = [];
  let firstSectionContent = '';
  let foundHeading = false;
  let insideSection = false;

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    const headingMatch = detectHeading(lines[0]);
    if (headingMatch?.matched) {
      foundHeading = true;
      insideSection = true;
      const remainder = [headingMatch.inlineContent, ...lines.slice(1)]
        .filter(Boolean)
        .join('\n')
        .trim();
      if (!firstSectionContent && remainder) firstSectionContent = remainder;
      continue;
    }

    if (insideSection) {
      if (!firstSectionContent) firstSectionContent = block;
      continue;
    }

    leadBlocks.push(block);
  }

  if (!foundHeading) return blocks.join('\n\n');
  return leadBlocks.join('\n\n').trim() || firstSectionContent;
}

export function parseInlineSections(rawText: string): InlineSection[] {
  const sections: InlineSection[] = [];
  const lines = rawText.split(/\r?\n/);

  let currentHeading = '';
  let currentLines: string[] = [];

  function flushSection() {
    if (!currentHeading) return;
    const content = currentLines.join('\n').trim();
    if (content) sections.push({ heading: currentHeading, content });
    currentHeading = '';
    currentLines = [];
  }

  let inLead = true;
  for (const line of lines) {
    const headingMatch = detectHeading(line);
    if (headingMatch?.matched) {
      flushSection();
      inLead = false;
      currentHeading = stripHeadingMarkup(line.trim());
      if (headingMatch.inlineContent) currentLines.push(headingMatch.inlineContent);
    } else if (!inLead) {
      currentLines.push(line);
    }
  }
  flushSection();

  return sections;
}

/**
 * Returns the lead text for the article view.
 * Unlike extractLeadPreviewText, this returns ONLY prose that appears BEFORE
 * the first heading — never the content of a section.  This prevents the
 * lead block and the first inline section from showing the same text twice.
 */
export function getArticleLeadText(text: string): string {
  const lines = String(text || '').split(/\r?\n/);
  const leadLines: string[] = [];
  for (const line of lines) {
    const h = detectHeading(line);
    if (h?.matched) break;
    leadLines.push(line);
  }
  return leadLines.join('\n').trim();
}

export function getLeadText(row: ShrineRow, lang: string): string {
  for (const key of LEAD_PARAGRAPH_KEYS) {
    let value = '';
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: Urdu section headings come from the Urdu-only content files
    if (lang === 'ur') {
      value = getUrduFieldValue(row, key) || getFieldValue(row, key);
    } else {
      value = getFieldValue(row, key);
    }
    if (value.trim()) return getArticleLeadText(value.trim());
  }
  return '';
}

export function buildArticleSections(
  row: ShrineRow,
  lang: string,
): ArticleSection[] {
  const sections: ArticleSection[] = [];

  for (const def of ARTICLE_SECTION_DEFINITIONS) {
    let content = '';
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: Urdu section headings come from the Urdu-only content files
    if (lang === 'ur') {
      content = getUrduFieldValue(row, def.field) || getFieldValue(row, def.field);
    } else {
      content = getFieldValue(row, def.field);
    }
    if (content.trim()) {
      sections.push({ ...def, content: content.trim() });
    }
  }

  return sections;
}

export function parsedArticleFromRow(row: ShrineRow): ParsedArticle {
  let rawDescription = '';
  for (const key of LEAD_PARAGRAPH_KEYS) {
    const v = getFieldValue(row, key);
    if (v.trim()) {
      rawDescription = v.trim();
      break;
    }
  }

  const leadText = extractLeadPreviewText(rawDescription);
  const inlineSections = rawDescription ? parseInlineSections(rawDescription) : [];

  return { leadText, inlineSections };
}
