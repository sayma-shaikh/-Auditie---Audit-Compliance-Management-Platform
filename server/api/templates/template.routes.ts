import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import archiver from 'archiver';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../../middleware/auth.middleware.ts';

const router = Router();
const prisma = new PrismaClient();

const TEMPLATE_ROOT = path.join(process.cwd(), 'repository', 'projects', 'global', 'templates');
const GENERATED_ROOT = path.join(process.cwd(), 'repository', 'projects');

fs.mkdirSync(TEMPLATE_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMPLATE_ROOT),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\- ]+/g, '')}`),
});

const upload = multer({ storage });
const logoUpload = multer({ storage: multer.memoryStorage() });

const allowedPlaceholderKeys = [
  'CLIENT_LEGAL_NAME',
  'CLIENT_SHORT_NAME',
  'DOCUMENT_REFERENCE_PREFIX',
  'EFFECTIVE_DATE',
  'NEXT_REVIEW_DATE',
  'CLIENT_LOGO',
  'INTRODUCTION_TEXT',
];

const requiredGenerationFields = [
  'CLIENT_LEGAL_NAME',
  'CLIENT_SHORT_NAME',
  'DOCUMENT_REFERENCE_PREFIX',
  'EFFECTIVE_DATE',
  'NEXT_REVIEW_DATE',
  'CLIENT_LOGO',
  'INTRODUCTION_TEXT',
];

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlToText(xml: string) {
  return decodeXml(
    xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
  ).trim();
}

function extractDocx(filePath: string) {
  const content = fs.readFileSync(path.resolve(filePath), 'binary');
  const zip = new PizZip(content);
  const parts = getDocxTextXmlParts(zip);
  const textParts = parts
    .map((part) => zip.file(part)?.asText() || '')
    .filter(Boolean)
    .map(xmlToText);
  const media = Object.keys(zip.files).filter((name) => name.startsWith('word/media/'));

  return {
    text: textParts.join('\n'),
    bodyText: xmlToText(zip.file('word/document.xml')?.asText() || ''),
    headerFooterText: textParts.slice(1).join('\n'),
    media,
  };
}

function extractDocxParts(filePath: string) {
  const content = fs.readFileSync(path.resolve(filePath), 'binary');
  const zip = new PizZip(content);
  const bodyXml = zip.file('word/document.xml')?.asText() || '';
  const headerParts = Object.keys(zip.files).filter((name) => /^word\/header\d+\.xml$/.test(name));
  const footerParts = Object.keys(zip.files).filter((name) => /^word\/footer\d+\.xml$/.test(name));
  const extraTextParts = getDocxTextXmlParts(zip).filter((name) => !['word/document.xml', ...headerParts, ...footerParts].includes(name));
  return {
    zip,
    bodyXml,
    headerParts: headerParts.map((name) => ({ name, xml: zip.file(name)?.asText() || '' })),
    footerParts: footerParts.map((name) => ({ name, xml: zip.file(name)?.asText() || '' })),
    extraTextParts: extraTextParts.map((name) => ({ name, xml: zip.file(name)?.asText() || '' })),
  };
}

function getDocxTextXmlParts(zip: PizZip) {
  return Object.keys(zip.files)
    .filter((name) => /^word\/.+\.xml$/i.test(name))
    .filter((name) => !/\/_rels\//i.test(name))
    .filter((name) => !/(^word\/(?:styles|settings|webSettings|fontTable|numbering|theme|commentsExtended|commentsIds|people)\.xml$)/i.test(name))
    .filter((name) => {
      const file = zip.file(name);
      if (!file) return false;
      const xml = file.asText();
      return /<(?:w|a):t(?:\s|>)/.test(xml);
    })
    .sort((a, b) => a.localeCompare(b));
}

function addDetection(items: any[], seen: Set<string>, detection: any) {
  const key = `${detection.placeholder}:${detection.originalValue || detection.sourceField}`;
  if (!seen.has(key)) {
    seen.add(key);
    items.push(detection);
  }
}

function hasDetection(items: any[], placeholder: string) {
  return items.some((item) => item.placeholder === placeholder);
}

function extractSection(text: string, start: RegExp, end: RegExp) {
  const startMatch = start.exec(text);
  if (!startMatch) return '';
  const rest = text.slice(startMatch.index + startMatch[0].length).trim();
  const endMatch = end.exec(rest);
  return (endMatch ? rest.slice(0, endMatch.index) : rest).replace(/\s+/g, ' ').trim().slice(0, 2000);
}

function paragraphText(paragraphXml: string) {
  return Array.from(paragraphXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g))
    .map((match) => decodeXml(match[1]))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function setParagraphText(paragraphXml: string, value: string) {
  let index = 0;
  const replaced = paragraphXml.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_match, attrs = '') => {
    index += 1;
    return `<w:t${attrs}>${index === 1 ? escapeXml(value) : ''}</w:t>`;
  });
  return index ? replaced : paragraphXml;
}

function buildPlainParagraphXml(value: string) {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
}

function splitSectionParagraphs(value: string) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTextInput(value: any) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean).join('\n').trim();
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim();
    if (typeof value.value === 'string') return value.value.trim();
    return '';
  }
  return '';
}

function parseDocumentBlocks(xml: string) {
  const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch || bodyMatch.index === undefined) return null;
  const fullMatch = bodyMatch[0];
  const bodyInner = bodyMatch[1];
  const bodyOpenTag = fullMatch.slice(0, fullMatch.indexOf(bodyInner));
  const bodyStart = bodyMatch.index + bodyOpenTag.length;
  const blocks = Array.from(bodyInner.matchAll(/<w:p(?:\s|>)[\s\S]*?<\/w:p>|<w:tbl(?:\s|>)[\s\S]*?<\/w:tbl>/g)).map((match) => ({
    xml: match[0],
    start: (match.index || 0),
    end: (match.index || 0) + match[0].length,
    text: match[0].startsWith('<w:p') ? paragraphText(match[0]) : xmlToText(match[0]),
    isParagraph: match[0].startsWith('<w:p'),
  }));
  return { bodyInner, bodyStart, blocks };
}

function textVariants(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return [];
  const variants = new Set<string>([trimmed]);
  variants.add(trimmed.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()));
  return Array.from(variants);
}

function countStringOccurrences(value: string, search: string) {
  if (!value || !search) return 0;
  const direct = value.match(new RegExp(escapeRegExp(search), 'g'))?.length || 0;
  const flexible = value.match(new RegExp(flexibleWhitespacePattern(search), 'g'))?.length || 0;
  return Math.max(direct, flexible);
}

function hasTextOccurrence(value: string, search: string) {
  return countStringOccurrences(value, search) > 0;
}

function countOccurrencesForValues(value: string, searchValues: string[]) {
  return uniqueNormalizedValues(searchValues).reduce((sum, search) => sum + countStringOccurrences(value, search), 0);
}

function dateVariants(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return [];
  const normalizedSpaces = trimmed.replace(/\s+/g, ' ');
  const spacedOrdinalMatch = normalizedSpaces.match(/^(\d{1,2})\s+(st|nd|rd|th)\s+(.+)$/i);
  const ordinalMatch = normalizedSpaces.match(/^(\d{1,2})(st|nd|rd|th)\s+(.+)$/i) || spacedOrdinalMatch;
  const variants = new Set<string>([normalizedSpaces]);
  if (ordinalMatch) {
    const [, day, suffix, rest] = ordinalMatch;
    variants.add(`${day}${suffix} ${rest}`);
    variants.add(`${day} ${suffix} ${rest}`);
    variants.add(`${day}\n${suffix} ${rest}`);
    variants.add(`${day}\r\n${suffix} ${rest}`);
    variants.add(`${day}\r${suffix} ${rest}`);
  }
  return Array.from(variants);
}

function uniqueNormalizedValues(values: Array<string | undefined | null>) {
  return Array.from(new Set(values
    .filter(Boolean)
    .map((value) => String(value).replace(/\s+/g, ' ').trim())
    .filter(Boolean)));
}

function dedupeReplacementOldValues(oldValues: string[]) {
  const normalized = uniqueNormalizedValues(oldValues).sort((a, b) => b.length - a.length);
  return normalized.filter((value, index) => !normalized.slice(0, index).some((candidate) => candidate.toLowerCase().includes(value.toLowerCase()) && candidate.toLowerCase() !== value.toLowerCase()));
}

function extractMetadataTablePairs(filePath: string) {
  const content = fs.readFileSync(path.resolve(filePath), 'binary');
  const zip = new PizZip(content);
  const xml = zip.file('word/document.xml')?.asText() || '';
  const rows = Array.from(xml.matchAll(/<w:tr(?:\s|>)[\s\S]*?<\/w:tr>/g)).map((match) => match[0]);
  return rows.map((rowXml) => {
    const cells = Array.from(rowXml.matchAll(/<w:tc(?:\s|>)[\s\S]*?<\/w:tc>/g))
      .map((match) => xmlToText(match[0]).replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return cells;
  }).filter((cells) => cells.length);
}

function extractSectionFromDocumentXml(filePath: string, start: RegExp, end: RegExp) {
  const content = fs.readFileSync(path.resolve(filePath), 'binary');
  const zip = new PizZip(content);
  const xml = zip.file('word/document.xml')?.asText() || '';
  const paragraphs = Array.from(xml.matchAll(/<w:p(?:\s|>)[\s\S]*?<\/w:p>/g)).map((match) => paragraphText(match[0]));
  const cleanHeading = (value: string) => /PAGEREF|TOC|\\h|\\z|\\u/i.test(value) ? '' : value;
  const startIndex = paragraphs.findIndex((text) => start.test(cleanHeading(text)));
  if (startIndex < 0) return '';
  let endIndex = paragraphs.findIndex((text, index) => index > startIndex && end.test(cleanHeading(text)));
  if (endIndex < 0) endIndex = Math.min(paragraphs.length, startIndex + 8);
  return paragraphs.slice(startIndex + 1, endIndex).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
}

function detectMetadata(filePath: string) {
  const extracted = extractDocx(filePath);
  const lines = extracted.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const detections: any[] = [];
  const seen = new Set<string>();
  const metadataTablePairs = extractMetadataTablePairs(filePath);

  metadataTablePairs.forEach((cells) => {
    const joined = cells.join(' | ');
    const labelCell = cells.find((cell) => /effective\s*date/i.test(cell));
    const reviewCell = cells.find((cell) => /next\s*review\s*date/i.test(cell));
    const versionApprovedCell = cells.find((cell) => /version\s*approved\s*date/i.test(cell));
    if (labelCell) {
      const labelIndex = cells.indexOf(labelCell);
      const nextValue = cells[labelIndex + 1] || cells.find((cell) => cell !== labelCell && /\d{4}/.test(cell)) || '';
      if (nextValue) {
        addDetection(detections, seen, {
          placeholder: 'EFFECTIVE_DATE',
          label: 'Effective Date',
          originalValue: nextValue.slice(0, 80),
          oldValues: [nextValue].filter(Boolean),
          sourceType: 'metadata_table',
          sourceField: `Table row: ${joined.slice(0, 120)}`,
          required: true,
          confidence: 0.9,
        });
      }
    }
    if (reviewCell) {
      const labelIndex = cells.indexOf(reviewCell);
      const nextValue = cells[labelIndex + 1] || cells.find((cell) => cell !== reviewCell && /\d{4}/.test(cell)) || '';
      if (nextValue) {
        addDetection(detections, seen, {
          placeholder: 'NEXT_REVIEW_DATE',
          label: 'Next Review Date',
          originalValue: nextValue.slice(0, 80),
          oldValues: [nextValue].filter(Boolean),
          sourceType: 'metadata_table',
          sourceField: `Table row: ${joined.slice(0, 120)}`,
          required: true,
          confidence: 0.9,
        });
      }
    }
  });

  for (let index = 0; index < lines.slice(0, 80).length; index += 1) {
    const line = lines[index];
    if (/effective\s*date/i.test(line)) {
      addDetection(detections, seen, {
        placeholder: 'EFFECTIVE_DATE',
        label: 'Effective Date',
        originalValue: (lines[index + 1] || '').slice(0, 80),
        oldValues: [lines[index + 1]].filter(Boolean),
        sourceType: 'metadata_table',
        sourceField: 'Cover metadata table',
        required: true,
        confidence: 0.76,
      });
    }
    if (/next\s*review\s*date/i.test(line)) {
      addDetection(detections, seen, {
        placeholder: 'NEXT_REVIEW_DATE',
        label: 'Next Review Date',
        originalValue: (lines[index + 1] || '').slice(0, 80),
        oldValues: [lines[index + 1]].filter(Boolean),
        sourceType: 'metadata_table',
        sourceField: 'Cover metadata table',
        required: true,
        confidence: 0.76,
      });
    }
  }

  const companyCandidates = Array.from(extracted.text.matchAll(/\b[A-Z][A-Z&., ]{6,}(?:GROUP|LIMITED|PRIVATE LIMITED|PVT LTD|NETWORK|ARTISTS|TECHNOLOGIES|CORPORATION|COMPANY|SERVICES)?\b/g))
    .map((match) => match[0].replace(/\s+/g, ' ').trim())
    .filter((value) => value.length <= 80 && !/PAGEREF|INFORMATION SECURITY|HUMAN RESOURCE|VERSION HISTORY|TABLE OF CONTENTS|POLICY$|PROCEDURE$|SOP$/.test(value));
  const counts = companyCandidates.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const rankedCompanyCandidates = Object.entries(counts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => (b[0].length - a[0].length) || (b[1] - a[1]));

  const longestBrandingValues = rankedCompanyCandidates.map(([value]) => value);
  const primaryCompany = longestBrandingValues[0];
  if (primaryCompany) {
    const legalVariants = uniqueNormalizedValues(longestBrandingValues
      .flatMap((value) => {
        const variants = textVariants(value);
        if (value.includes(' NETWORK GROUP')) {
          variants.push(value.replace(' NETWORK GROUP', ' NETWORK GROUP OF COMPANIES'));
          variants.push(value.replace(' NETWORK GROUP', ' Network Group of Companies'));
        }
        return variants;
      }))
      .sort((a, b) => b.length - a.length);
    addDetection(detections, seen, {
      placeholder: 'CLIENT_LEGAL_NAME',
      label: 'Client Legal Name',
      originalValue: primaryCompany,
      oldValues: legalVariants,
      sourceType: 'repeated_branding',
      sourceField: 'Body/Header/Footer',
      required: true,
      confidence: 0.9,
    });
  }

  const secondaryCompany = longestBrandingValues.find((value) => value !== primaryCompany && !primaryCompany?.includes(value));
  if (secondaryCompany) {
    const baseToken = secondaryCompany.split(/\s+/)[0];
    addDetection(detections, seen, {
      placeholder: 'CLIENT_SHORT_NAME',
      label: 'Client Short Name',
      originalValue: secondaryCompany,
      oldValues: uniqueNormalizedValues([...textVariants(secondaryCompany), ...textVariants(baseToken)]).sort((a, b) => b.length - a.length),
      sourceType: 'repeated_branding',
      sourceField: 'Body/Header/Footer',
      required: true,
      confidence: 0.76,
    });
  }

  const reference = extracted.text.match(/\b[A-Z0-9][A-Z0-9 ]{1,40}\s*\/\s*(?:ISMS|ISO|SOC2|ITGC)\s*\/\s*[A-Z]{2,8}\d{1,4}\b/);
  if (reference) {
    const normalizedReference = reference[0].replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
    const refSplit = normalizedReference.match(/^(.+?)(\/(?:ISMS|ISO|SOC2|ITGC)\/.+)$/);
    const prefix = refSplit?.[1] || normalizedReference.split('/')[0];
    addDetection(detections, seen, {
      placeholder: 'DOCUMENT_REFERENCE_PREFIX',
      label: 'Document Reference Prefix',
      originalValue: prefix,
      oldValues: [prefix],
      referenceSuffix: refSplit?.[2] || '',
      fullReference: normalizedReference,
      sourceType: 'pattern',
      sourceField: 'Document reference prefix',
      required: true,
      confidence: 0.92,
    });
  }

  const dates = Array.from(extracted.text.matchAll(/\b(?:\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g)).map((m) => m[0]);
  if (dates[0] && !hasDetection(detections, 'EFFECTIVE_DATE')) addDetection(detections, seen, { placeholder: 'EFFECTIVE_DATE', label: 'Effective Date', originalValue: dates[0], oldValues: dateVariants(dates[0]), sourceType: 'date', sourceField: 'First detected date', required: true, confidence: 0.7 });
  if (dates[1] && !hasDetection(detections, 'NEXT_REVIEW_DATE')) addDetection(detections, seen, { placeholder: 'NEXT_REVIEW_DATE', label: 'Next Review Date', originalValue: dates[1], oldValues: dateVariants(dates[1]), sourceType: 'date', sourceField: 'Second detected date', required: true, confidence: 0.65 });

  if (extracted.media.length) {
    addDetection(detections, seen, {
      placeholder: 'CLIENT_LOGO',
      label: 'Client Logo',
      originalValue: `${extracted.media.length} embedded image(s)`,
      sourceType: 'image',
      sourceField: 'word/media',
      required: false,
      confidence: 0.76,
    });
  }

  const introduction = extractSectionFromDocumentXml(filePath, /^(?:\d+\.?\s*)?Introduction$/i, /^(?:\d+\.?\s*)?(Definitions|Scope)$/i)
    || extractSection(extracted.text, /\bIntroduction\b/i, /\bDefinitions\b|\bScope\b/i);
  if (introduction) {
    addDetection(detections, seen, {
      placeholder: 'INTRODUCTION_TEXT',
      label: 'Introduction Text',
      originalValue: introduction,
      oldValues: [introduction],
      sourceType: 'section',
      sourceField: 'Body introduction section',
      required: false,
      confidence: 0.62,
    });
  }
  return {
    detections: detections.filter((item) => allowedPlaceholderKeys.includes(item.placeholder)),
    textPreview: extracted.text.slice(0, 4000),
    staleBrandingSeeds: detections
      .filter((item) => allowedPlaceholderKeys.includes(item.placeholder) && item.sourceType !== 'image')
      .flatMap((item) => item.oldValues?.length ? item.oldValues : [item.originalValue])
      .filter(Boolean),
  };
}

function mappingObject(template: any) {
  try {
    return JSON.parse(template.placeholderMapping || '{}');
  } catch {
    return {};
  }
}

function detectionObject(template: any) {
  try {
    return JSON.parse(template.placeholdersDetected || '{"detections":[],"staleBrandingSeeds":[]}');
  } catch {
    return { detections: [], staleBrandingSeeds: [] };
  }
}

function buildPlaceholderMappingFromDetection(detection: any) {
  return (detection.detections || []).reduce((acc: Record<string, any>, item: any) => {
    const oldValues = uniqueNormalizedValues([
      ...(acc[item.placeholder]?.oldValues || []),
      ...(item.oldValues?.length ? item.oldValues : [item.originalValue].filter(Boolean)),
    ]);
    acc[item.placeholder] = {
      ...(acc[item.placeholder] || {}),
      oldValues,
    };
    if (item.referenceSuffix) acc[item.placeholder].referenceSuffix = item.referenceSuffix;
    if (item.fullReference) acc[item.placeholder].fullReference = item.fullReference;
    return acc;
  }, {} as Record<string, any>);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function flexibleWhitespacePattern(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const parts = normalized.split(' ');
  return parts.map((part) => escapeRegExp(part)).join('\\s+');
}

function replaceAllText(xml: string, oldValue: string, newValue: string) {
  if (!oldValue || oldValue === newValue) return xml;
  const escapedOld = escapeXml(oldValue);
  const escapedNew = escapeXml(newValue);
  return xml
    .replace(new RegExp(escapeRegExp(escapedOld), 'g'), escapedNew)
    .replace(new RegExp(escapeRegExp(oldValue), 'g'), escapedNew)
    .replace(new RegExp(flexibleWhitespacePattern(oldValue), 'g'), escapedNew);
}

function countAndReplacePlainText(xml: string, oldValue: string, newValue: string) {
  if (!oldValue || oldValue === newValue) return { xml, count: 0 };
  const patterns = [
    new RegExp(escapeRegExp(escapeXml(oldValue)), 'g'),
    new RegExp(escapeRegExp(oldValue), 'g'),
    new RegExp(flexibleWhitespacePattern(oldValue), 'g'),
  ];
  let nextXml = xml;
  let count = 0;
  patterns.forEach((pattern, index) => {
    const before = nextXml;
    nextXml = nextXml.replace(pattern, index === 0 ? escapeXml(newValue) : newValue);
    if (before !== nextXml) {
      count += before.match(pattern)?.length || 0;
    }
  });
  return { xml: nextXml, count };
}

function expandedReplacementEntries(replacementMap: Array<{ key: string; oldValues: string[]; newValue: string }>) {
  return replacementMap
    .flatMap((replacement) =>
      replacement.oldValues.map((oldValue) => ({
        key: replacement.key,
        oldValue,
        newValue: replacement.newValue,
      })),
    )
    .filter((item) => item.oldValue && item.oldValue !== item.newValue)
    .sort((a, b) => b.oldValue.length - a.oldValue.length);
}

function deriveShortNameSeedsFromLegalValues(values: string[]) {
  const derived = new Set<string>();
  values.forEach((value) => {
    const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) return;
    if (words[0] && words[0].length >= 4) derived.add(words[0]);
    if (words.length >= 2) derived.add(words.slice(0, 2).join(' '));
  });
  return Array.from(derived).sort((a, b) => b.length - a.length);
}

function buildCompanyCleanupEntries(template: any, replacementMap: Array<{ key: string; oldValues: string[]; newValue: string }>) {
  const detection = detectionObject(template);
  const legalReplacement = replacementMap.find((item) => item.key === 'CLIENT_LEGAL_NAME');
  const shortReplacement = replacementMap.find((item) => item.key === 'CLIENT_SHORT_NAME');
  const staleSeeds = uniqueNormalizedValues((detection.staleBrandingSeeds || [])
    .map((value: any) => String(value || ''))
    .filter((value: string) => /[A-Za-z]/.test(value) && !value.includes('{{') && value.length <= 120));

  const legalOldValues = uniqueNormalizedValues([
    ...(legalReplacement?.oldValues || []),
    ...staleSeeds.filter((value) => /\b(group|network|company|companies|limited|ltd|private|pvt)\b/i.test(value) || value.trim().split(/\s+/).length >= 3),
  ]).sort((a, b) => b.length - a.length);

  const shortOldValues = uniqueNormalizedValues([
    ...(shortReplacement?.oldValues || []),
    ...staleSeeds.filter((value) => value.trim().split(/\s+/).length <= 2),
    ...deriveShortNameSeedsFromLegalValues(legalOldValues),
  ])
    .filter((value) => !legalOldValues.some((legalValue) => legalValue.toLowerCase() === value.toLowerCase()))
    .sort((a, b) => b.length - a.length);

  return [
    ...(legalReplacement?.newValue ? legalOldValues.map((oldValue) => ({ key: 'CLIENT_LEGAL_NAME', oldValue, newValue: legalReplacement.newValue })) : []),
    ...(shortReplacement?.newValue ? shortOldValues.map((oldValue) => ({ key: 'CLIENT_SHORT_NAME', oldValue, newValue: shortReplacement.newValue })) : []),
  ]
    .filter((item) => item.oldValue && item.oldValue !== item.newValue)
    .sort((a, b) => b.oldValue.length - a.oldValue.length);
}

function buildExactValueCleanupEntries(replacementMap: Array<{ key: string; oldValues: string[]; newValue: string }>, keys: string[]) {
  return replacementMap
    .filter((item) => keys.includes(item.key) && item.newValue)
    .flatMap((item) => {
      const oldValues = item.key.includes('DATE')
        ? uniqueNormalizedValues(item.oldValues.flatMap((oldValue) => dateVariants(oldValue)))
        : uniqueNormalizedValues(item.oldValues);
      return oldValues.map((oldValue) => ({
        key: item.key,
        oldValue,
        newValue: item.newValue,
      }));
    })
    .filter((item) => item.oldValue && item.oldValue !== item.newValue)
    .sort((a, b) => b.oldValue.length - a.oldValue.length);
}

function replaceAcrossWordTextRuns(xml: string, replacementMap: Array<{ key: string; oldValues: string[]; newValue: string }>) {
  const replacements = expandedReplacementEntries(replacementMap).filter((item) => item.key !== 'DOCUMENT_REFERENCE_PREFIX');
  return xml.replace(/<w:p(?:\s|>)[\s\S]*?<\/w:p>/g, (paragraph) => {
    const textMatches = Array.from(paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g));
    if (!textMatches.length) return paragraph;

    let joined = textMatches.map((match) => decodeXml(match[1])).join('');
    const originalJoined = joined;
    for (const replacement of replacements) {
      joined = joined.replace(new RegExp(escapeRegExp(replacement.oldValue), 'g'), replacement.newValue);
      joined = joined.replace(new RegExp(flexibleWhitespacePattern(replacement.oldValue), 'g'), replacement.newValue);
    }
    if (joined === originalJoined) return paragraph;

    let index = 0;
    return paragraph.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_match, attrs = '') => {
      index += 1;
      return `<w:t${attrs}>${index === 1 ? escapeXml(joined) : ''}</w:t>`;
    });
  });
}

function replaceAcrossWordContainers(
  xml: string,
  replacements: Array<{ oldValue: string; newValue: string }>,
  tagPattern: RegExp,
) {
  let totalCount = 0;
  const nextXml = xml.replace(tagPattern, (container) => {
    const textMatches = Array.from(container.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g));
    if (!textMatches.length) return container;

    let joined = textMatches.map((match) => decodeXml(match[1])).join('');
    const originalJoined = joined;
    let containerCount = 0;
    for (const replacement of replacements) {
      const before = joined;
      joined = joined.replace(new RegExp(escapeRegExp(replacement.oldValue), 'g'), replacement.newValue);
      joined = joined.replace(new RegExp(flexibleWhitespacePattern(replacement.oldValue), 'g'), replacement.newValue);
      if (before !== joined) {
        containerCount += before.match(new RegExp(escapeRegExp(replacement.oldValue), 'g'))?.length || 0;
      }
    }
    if (joined === originalJoined) return container;
    totalCount += containerCount;

    let index = 0;
    return container.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_match, attrs = '') => {
      index += 1;
      return `<w:t${attrs}>${index === 1 ? escapeXml(joined) : ''}</w:t>`;
    });
  });
  return { xml: nextXml, count: totalCount };
}

function replaceAcrossWordContainersByKey(
  xml: string,
  replacements: Array<{ key: string; oldValue: string; newValue: string }>,
  tagPattern: RegExp,
) {
  const counts: Record<string, number> = {};
  const nextXml = xml.replace(tagPattern, (container) => {
    const textMatches = Array.from(container.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g));
    if (!textMatches.length) return container;

    let joined = textMatches.map((match) => decodeXml(match[1])).join('');
    const originalJoined = joined;
    for (const replacement of replacements) {
      const patterns = [
        new RegExp(escapeRegExp(replacement.oldValue), 'g'),
        new RegExp(flexibleWhitespacePattern(replacement.oldValue), 'g'),
      ];
      patterns.forEach((pattern) => {
        const hits = joined.match(pattern)?.length || 0;
        if (!hits) return;
        joined = joined.replace(pattern, replacement.newValue);
        counts[replacement.key] = (counts[replacement.key] || 0) + hits;
      });
    }
    if (joined === originalJoined) return container;

    let index = 0;
    return container.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_match, attrs = '') => {
      index += 1;
      return `<w:t${attrs}>${index === 1 ? escapeXml(joined) : ''}</w:t>`;
    });
  });
  return { xml: nextXml, counts };
}

function runFinalValueCleanup(
  xml: string,
  replacements: Array<{ key: string; oldValue: string; newValue: string }>,
) {
  let nextXml = xml;
  const counts: Record<string, number> = {};

  const containerPatterns = [
    /<w:p(?:\s|>)[\s\S]*?<\/w:p>/g,
    /<w:tc(?:\s|>)[\s\S]*?<\/w:tc>/g,
  ];

  for (const pattern of containerPatterns) {
    const result = replaceAcrossWordContainersByKey(nextXml, replacements, pattern);
    nextXml = result.xml;
    mergeReplacementCounts(counts, result.counts);
  }

  for (const replacement of replacements) {
    const replaced = countAndReplacePlainText(nextXml, replacement.oldValue, replacement.newValue);
    nextXml = replaced.xml;
    counts[replacement.key] = (counts[replacement.key] || 0) + replaced.count;
  }

  return { xml: nextXml, counts };
}

function mergeReplacementCounts(target: Record<string, number>, source: Record<string, number>) {
  Object.entries(source).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + value;
  });
}

function replaceDocumentReferencePrefix(xml: string, oldPrefix: string, newPrefix: string) {
  if (!oldPrefix || !newPrefix || oldPrefix === newPrefix) return xml;

  return xml.replace(/<w:p(?:\s|>)[\s\S]*?<\/w:p>/g, (paragraph) => {
    const textMatches = Array.from(paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g));
    if (!textMatches.length) return paragraph;

    const joined = textMatches.map((match) => decodeXml(match[1])).join('');
    const replaced = joined.replace(new RegExp(`${escapeRegExp(oldPrefix)}(?=\\s*\\/\\s*(?:ISMS|ISO|SOC2|ITGC)\\s*\\/)`, 'g'), newPrefix);
    if (replaced === joined) return paragraph;

    let index = 0;
    return paragraph.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_match, attrs = '') => {
      index += 1;
      return `<w:t${attrs}>${index === 1 ? escapeXml(replaced) : ''}</w:t>`;
    });
  });
}

function replaceLabeledDateValue(xml: string, label: RegExp, newValue: string, oldValues: string[] = []) {
  if (!newValue) return xml;
  const datePattern = /\b\d{1,2}\s*(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
  const variants = uniqueNormalizedValues(oldValues.flatMap((oldValue) => dateVariants(oldValue)));

  return xml.replace(/<w:p(?:\s|>)[\s\S]*?<\/w:p>/g, (paragraph) => {
    const textMatches = Array.from(paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g));
    if (!textMatches.length) return paragraph;

    const joined = textMatches.map((match) => decodeXml(match[1])).join('');
    if (!label.test(joined)) return paragraph;

    let replaced = joined;
    for (const oldValue of variants) {
      if (!oldValue) continue;
      replaced = replaced.replace(new RegExp(flexibleWhitespacePattern(oldValue), 'g'), newValue);
      replaced = replaced.replace(new RegExp(escapeRegExp(oldValue), 'g'), newValue);
    }

    if (replaced === joined) {
      const labelMatch = joined.match(label);
      const labelIndex = labelMatch?.index;
      if (labelIndex === undefined) return paragraph;
      const before = joined.slice(0, labelIndex + labelMatch[0].length);
      const after = joined.slice(labelIndex + labelMatch[0].length);
      const matchedDate = after.match(datePattern);
      if (!matchedDate) return paragraph;
      replaced = `${before}${after.replace(matchedDate[0], newValue)}`;
    }

    if (replaced === joined) return paragraph;

    let index = 0;
    return paragraph.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_match, attrs = '') => {
      index += 1;
      return `<w:t${attrs}>${index === 1 ? escapeXml(replaced) : ''}</w:t>`;
    });
  });
}

function replaceSpecificDateValue(xml: string, newValue: string, oldValues: string[] = []) {
  if (!newValue || !oldValues.length) return { xml, count: 0 };
  const replacements = uniqueNormalizedValues(oldValues.flatMap((oldValue) => dateVariants(oldValue))).sort((a, b) => b.length - a.length);
  let nextXml = xml;
  let totalCount = 0;
  const tagPatterns = [/<w:p(?:\s|>)[\s\S]*?<\/w:p>/g, /<w:tc(?:\s|>)[\s\S]*?<\/w:tc>/g];
  tagPatterns.forEach((pattern) => {
    const result = replaceAcrossWordContainers(nextXml, replacements.map((oldValue) => ({ oldValue, newValue })), pattern);
    nextXml = result.xml;
    totalCount += result.count;
  });
  return { xml: nextXml, count: totalCount };
}

function normalizeReplacementMap(template: any, values: Record<string, any>) {
  const detection = detectionObject(template);
  const mapping = mappingObject(template);
  const byPlaceholder = new Map<string, any[]>();
  for (const item of detection.detections || []) {
    if (!allowedPlaceholderKeys.includes(item.placeholder)) continue;
    byPlaceholder.set(item.placeholder, [...(byPlaceholder.get(item.placeholder) || []), item]);
  }

  const normalized = allowedPlaceholderKeys
    .filter((key) => key !== 'CLIENT_LOGO')
    .map((key) => {
      const detectedItems = byPlaceholder.get(key) || [];
      const preferredDetectedItems = key.endsWith('_DATE')
        ? detectedItems.filter((item) => item.sourceType === 'metadata_table' || item.sourceType === 'date')
        : detectedItems;
      const dateSpecificDetectedItems = key.endsWith('_DATE')
        ? preferredDetectedItems.filter((item) => item.label === labelFromPlaceholder(key) || /metadata table|cover/i.test(String(item.sourceField || '')))
        : preferredDetectedItems;
      const effectiveDetectedItems = dateSpecificDetectedItems.length ? dateSpecificDetectedItems : preferredDetectedItems;
      const detectedOldValues = effectiveDetectedItems.flatMap((item) => item.oldValues?.length ? item.oldValues : [item.originalValue]).filter(Boolean);
      const mappedOldValues = Array.isArray(mapping[key]?.oldValues)
        ? mapping[key].oldValues
        : Array.isArray(values[`${key}_OLD_VALUES`])
          ? values[`${key}_OLD_VALUES`]
          : mapping[key]
            ? [mapping[key]]
            : [];
      return {
        key,
        oldValues: uniqueNormalizedValues([
          ...detectedOldValues,
          ...(detectedOldValues.length && key.endsWith('_DATE') ? [] : mappedOldValues),
          `{{${key}}}`,
        ].filter(Boolean).map(String)).sort((a, b) => b.length - a.length),
        newValue: key === 'INTRODUCTION_TEXT'
          ? normalizeTextInput(values[key] ?? mapping[key]?.newValue ?? '')
          : String(values[key] ?? mapping[key]?.newValue ?? '').trim(),
      };
    })
    .filter((item) => item.newValue);

  const legalNameReplacement = normalized.find((item) => item.key === 'CLIENT_LEGAL_NAME');
  return normalized.map((item) => {
    if (item.key !== 'CLIENT_SHORT_NAME' || !legalNameReplacement) return item;
    return {
      ...item,
      oldValues: item.oldValues.filter((oldValue) => !legalNameReplacement.oldValues.some((legalValue) => legalValue.toLowerCase().includes(oldValue.toLowerCase()) && legalValue.toLowerCase() !== oldValue.toLowerCase())),
    };
  });
}

function replaceSectionBody(xml: string, start: RegExp, end: RegExp, newText: string) {
  const normalizedText = normalizeTextInput(newText);
  if (!normalizedText) return xml;
  const parsed = parseDocumentBlocks(xml);
  if (!parsed) return xml;
  const cleanHeading = (value: string) => /PAGEREF|TOC|\\h|\\z|\\u/i.test(value) ? '' : value;
  const startMatchIndex = parsed.blocks.findIndex((block) => block.isParagraph && start.test(cleanHeading(block.text)));
  if (startMatchIndex < 0) return xml;
  let endMatchIndex = parsed.blocks.findIndex((block, index) => index > startMatchIndex && block.isParagraph && end.test(cleanHeading(block.text)));
  if (endMatchIndex < 0) endMatchIndex = parsed.blocks.length;

  const replacementParagraphs = splitSectionParagraphs(normalizedText);
  if (!replacementParagraphs.length) return xml;
  const replacementXml = replacementParagraphs.map((value) => buildPlainParagraphXml(value)).join('');

  const replaceStart = startMatchIndex + 1 < parsed.blocks.length ? parsed.blocks[startMatchIndex + 1].start : parsed.blocks[startMatchIndex].end;
  const replaceEnd = endMatchIndex < parsed.blocks.length ? parsed.blocks[endMatchIndex].start : parsed.bodyInner.length;
  const updatedBody = `${parsed.bodyInner.slice(0, replaceStart)}${replacementXml}${parsed.bodyInner.slice(replaceEnd)}`;
  return `${xml.slice(0, parsed.bodyStart)}${updatedBody}${xml.slice(parsed.bodyStart + parsed.bodyInner.length)}`;
}

function replaceLogoMedia(zip: PizZip, logo?: any) {
  if (!logo?.buffer?.length) return 0;
  const imageFiles = Object.keys(zip.files).filter((name) => /^word\/media\/image\d+\.(png|jpe?g|webp)$/i.test(name));
  if (!imageFiles.length) return 0;
  const mimeType = String(logo.mimetype || '');
  const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const xmlFiles = Object.keys(zip.files).filter((name) => /\.(xml|rels)$/i.test(name) || name === '[Content_Types].xml');

  imageFiles.forEach((fileName) => {
    const renamedFile = fileName.replace(/\.(png|jpe?g|webp)$/i, `.${extension}`);
    zip.file(renamedFile, logo.buffer as any, { binary: true });
    if (renamedFile !== fileName) {
      delete zip.files[fileName];
      xmlFiles.forEach((xmlFileName) => {
        const xmlFile = zip.file(xmlFileName);
        if (!xmlFile) return;
        const updatedXml = xmlFile.asText().replace(new RegExp(escapeRegExp(path.basename(fileName)), 'g'), path.basename(renamedFile));
        zip.file(xmlFileName, updatedXml);
      });
    }
  });

  const contentTypesFile = zip.file('[Content_Types].xml');
  if (contentTypesFile) {
    let contentTypesXml = contentTypesFile.asText();
    const requiredContentType = extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';
    if (!new RegExp(`<Default Extension="${extension}" ContentType="${escapeRegExp(requiredContentType)}"\\s*/>`, 'i').test(contentTypesXml)) {
      contentTypesXml = contentTypesXml.replace('</Types>', `<Default Extension="${extension}" ContentType="${requiredContentType}"/></Types>`);
      zip.file('[Content_Types].xml', contentTypesXml);
    }
  }
  return imageFiles.length;
}

function replaceTableDates(xml: string, label: RegExp, newValue: string, oldValues: string[] = []) {
  if (!newValue) return xml;
  const variants = uniqueNormalizedValues(oldValues.flatMap((oldValue) => dateVariants(oldValue)));
  return xml.replace(/<w:tr(?:\s|>)[\s\S]*?<\/w:tr>/g, (row) => {
    const rowText = xmlToText(row);
    if (!label.test(rowText)) return row;
    let replacedRow = row;
    for (const oldValue of variants.sort((a, b) => b.length - a.length)) {
      replacedRow = replaceAllText(replacedRow, oldValue, newValue);
    }
    return replacedRow;
  });
}

function replaceVersionHistoryDateCell(xml: string, headerLabel: RegExp, newValue: string) {
  if (!newValue) return xml;
  const rows = Array.from(xml.matchAll(/<w:tr(?:\s|>)[\s\S]*?<\/w:tr>/g));
  if (!rows.length) return xml;

  const rowData = rows.map((match) => {
    const rowXml = match[0];
    const cells = Array.from(rowXml.matchAll(/<w:tc(?:\s|>)[\s\S]*?<\/w:tc>/g)).map((cellMatch) => ({
      xml: cellMatch[0],
      text: xmlToText(cellMatch[0]).replace(/\s+/g, ' ').trim(),
    }));
    return { rowXml, cells };
  });

  const headerRowIndex = rowData.findIndex((row) => row.cells.some((cell) => headerLabel.test(cell.text)));
  if (headerRowIndex < 0) return xml;
  const headerCellIndex = rowData[headerRowIndex].cells.findIndex((cell) => headerLabel.test(cell.text));
  if (headerCellIndex < 0) return xml;

  const dataRowIndex = rowData.findIndex((row, index) => index > headerRowIndex && row.cells.length > headerCellIndex);
  if (dataRowIndex < 0) return xml;

  const targetRow = rowData[dataRowIndex];
  const targetCell = targetRow.cells[headerCellIndex];
  if (!targetCell?.xml) return xml;

  let updatedCell = targetCell.xml;
  if (/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/.test(updatedCell)) {
    updatedCell = setParagraphText(updatedCell, newValue);
    if (updatedCell === targetCell.xml) {
      updatedCell = updatedCell.replace(/(<w:p\b[\s\S]*?<\/w:p>)/, buildPlainParagraphXml(newValue));
    }
  } else {
    updatedCell = updatedCell.replace(/<\/w:tc>$/, `${buildPlainParagraphXml(newValue)}</w:tc>`);
  }
  if (updatedCell === targetCell.xml) return xml;
  return xml.replace(targetCell.xml, updatedCell);
}

function locateOldValueOccurrences(filePath: string, oldValues: string[]) {
  const parts = extractDocxParts(filePath);
  const locations = new Set<string>();
  const normalizedOldValues = oldValues.flatMap((value) => dateVariants(value)).filter(Boolean);

  const bodyText = xmlToText(parts.bodyXml);
  if (normalizedOldValues.some((value) => bodyText.includes(value))) {
    locations.add('document body');
  }

  const tableCells = extractMetadataTablePairs(filePath).flat();
  if (normalizedOldValues.some((value) => tableCells.some((cell) => cell.includes(value)))) {
    locations.add('table cell');
  }

  if (parts.headerParts.some((part) => normalizedOldValues.some((value) => xmlToText(part.xml).includes(value)))) {
    locations.add('header');
  }
  if (parts.footerParts.some((part) => normalizedOldValues.some((value) => xmlToText(part.xml).includes(value)))) {
    locations.add('footer');
  }
  parts.extraTextParts.forEach((part) => {
    if (normalizedOldValues.some((value) => xmlToText(part.xml).includes(value))) {
      locations.add(part.name.replace(/^word\//, ''));
    }
  });

  return Array.from(locations);
}

function buildReplacementReport(
  template: any,
  generatedFilePath: string,
  replacementMap: Array<{ key: string; oldValues: string[]; newValue: string }>,
  replacementCounts: Record<string, number>,
  logoReplacementCount: number,
  warnings: string[],
  renderValues?: Record<string, any>,
) {
  const extracted = extractDocx(generatedFilePath);
  const text = extracted.text;
  const reportByKey = replacementMap.reduce<Record<string, { count: number; status: boolean; label: string }>>((acc, item) => {
    const count = replacementCounts[item.key] || 0;
    acc[item.key] = {
      count,
      status: item.key === 'INTRODUCTION_TEXT' ? !!item.newValue && hasTextOccurrence(text, item.newValue) : !item.newValue || hasTextOccurrence(text, item.newValue),
      label: labelFromPlaceholder(item.key),
    };
    return acc;
  }, {});

  return {
    templateId: template.id,
    templateName: template.title,
    companyName: reportByKey.CLIENT_LEGAL_NAME ? { replaced: reportByKey.CLIENT_LEGAL_NAME.count, ok: reportByKey.CLIENT_LEGAL_NAME.status } : null,
    shortName: reportByKey.CLIENT_SHORT_NAME ? { replaced: reportByKey.CLIENT_SHORT_NAME.count, ok: reportByKey.CLIENT_SHORT_NAME.status } : null,
    documentReferencePrefix: reportByKey.DOCUMENT_REFERENCE_PREFIX ? { replaced: reportByKey.DOCUMENT_REFERENCE_PREFIX.count, ok: reportByKey.DOCUMENT_REFERENCE_PREFIX.status } : null,
    reviewDate: reportByKey.NEXT_REVIEW_DATE ? { replaced: reportByKey.NEXT_REVIEW_DATE.count, ok: reportByKey.NEXT_REVIEW_DATE.status } : null,
    effectiveDate: reportByKey.EFFECTIVE_DATE ? { replaced: reportByKey.EFFECTIVE_DATE.count, ok: reportByKey.EFFECTIVE_DATE.status } : null,
    logo: { replaced: logoReplacementCount, ok: logoReplacementCount > 0 },
    introduction: reportByKey.INTRODUCTION_TEXT ? { replaced: !!replacementCounts.INTRODUCTION_TEXT, ok: reportByKey.INTRODUCTION_TEXT.status } : null,
    valuesUsed: renderValues ? {
      effectiveDate: String(renderValues.EFFECTIVE_DATE || ''),
      nextReviewDate: String(renderValues.NEXT_REVIEW_DATE || ''),
    } : null,
    warningsCount: warnings.length,
  };
}

function labelFromPlaceholder(key: string) {
  return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function validateGeneratedDocx(
  filePath: string,
  replacementMap: Array<{ key: string; oldValues: string[]; newValue: string }>,
  logoReplaced: boolean,
  logoRequested: boolean,
  template: any,
) {
  const extracted = extractDocx(filePath);
  const text = extracted.text;
  const warnings: string[] = [];
  const replacementByKey = new Map(replacementMap.map((item) => [item.key, item]));
  const referenceReplacement = replacementByKey.get('DOCUMENT_REFERENCE_PREFIX');
  const introductionReplacement = replacementByKey.get('INTRODUCTION_TEXT');
  const legalNameReplacement = replacementByKey.get('CLIENT_LEGAL_NAME');
  const shortNameReplacement = replacementByKey.get('CLIENT_SHORT_NAME');
  const refDetection = (detectionObject(template).detections || []).find((item: any) => item.placeholder === 'DOCUMENT_REFERENCE_PREFIX');

  for (const item of replacementMap) {
    if (['CLIENT_LEGAL_NAME', 'CLIENT_SHORT_NAME'].includes(item.key) && item.newValue && !hasTextOccurrence(text, item.newValue)) {
      warnings.push(`New value for {{${item.key}}} was not found after generation.`);
    }
    if (['EFFECTIVE_DATE', 'NEXT_REVIEW_DATE'].includes(item.key) && item.newValue && !hasTextOccurrence(text, item.newValue)) {
      warnings.push(`New value for {{${item.key}}} was not found after generation.`);
    }
    const oldValuesToCheck = ['EFFECTIVE_DATE', 'NEXT_REVIEW_DATE'].includes(item.key)
      ? uniqueNormalizedValues(item.oldValues.flatMap((oldValue) => dateVariants(oldValue)))
      : uniqueNormalizedValues(item.oldValues);
    for (const oldValue of oldValuesToCheck) {
      if (oldValue && oldValue !== item.newValue && hasTextOccurrence(text, oldValue)) {
        const locations = locateOldValueOccurrences(filePath, [oldValue]);
        warnings.push(`Old value "${oldValue.slice(0, 80)}" still found after generation${locations.length ? ` in ${locations.join(', ')}` : ''}.`);
      }
    }
  }

  if (referenceReplacement?.newValue && refDetection?.referenceSuffix) {
    const expectedReference = `${referenceReplacement.newValue}${refDetection.referenceSuffix}`;
    if (!hasTextOccurrence(text, expectedReference)) {
      warnings.push(`Document reference suffix validation failed. Expected "${expectedReference}" after generation.`);
    }
  }

  if (introductionReplacement?.newValue && !hasTextOccurrence(text, introductionReplacement.newValue)) {
    warnings.push('Introduction section was not fully replaced with INTRODUCTION_TEXT.');
  }
  for (const oldValue of introductionReplacement?.oldValues || []) {
    if (oldValue && oldValue !== introductionReplacement?.newValue && hasTextOccurrence(text, oldValue)) {
      warnings.push('Old introduction content is still present after generation.');
      break;
    }
  }
  for (const oldValue of legalNameReplacement?.oldValues || []) {
    if (oldValue && oldValue !== legalNameReplacement?.newValue && hasTextOccurrence(text, oldValue)) {
      const locations = locateOldValueOccurrences(filePath, [oldValue]);
      warnings.push(`Old company name "${oldValue}" still found after generation${locations.length ? ` in ${locations.join(', ')}` : ''}.`);
      break;
    }
  }
  for (const oldValue of shortNameReplacement?.oldValues || []) {
    if (oldValue && oldValue !== shortNameReplacement?.newValue && hasTextOccurrence(text, oldValue)) {
      const locations = locateOldValueOccurrences(filePath, [oldValue]);
      warnings.push(`Old short name "${oldValue}" still found after generation${locations.length ? ` in ${locations.join(', ')}` : ''}.`);
      break;
    }
  }
  if (logoRequested && !logoReplaced) warnings.push('Client logo was uploaded, but no replaceable DOCX media image was found.');
  if (logoRequested && logoReplaced && extracted.media.length === 0) warnings.push('Logo replacement could not be verified after generation.');
  return warnings;
}

function documentReferenceForTemplate(template: any, referencePrefix: string) {
  const detection = detectionObject(template);
  const ref = (detection.detections || []).find((item: any) => item.placeholder === 'DOCUMENT_REFERENCE_PREFIX');
  return referencePrefix && ref?.referenceSuffix ? `${referencePrefix}${ref.referenceSuffix}` : '';
}

function renderTemplateDocx(template: any, projectId: string, values: Record<string, any>, batchId?: string, logo?: any) {
  const renderValues = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.replace(/[{}]/g, ''), key === 'INTRODUCTION_TEXT' ? normalizeTextInput(value) : (value || '')]));
  const content = fs.readFileSync(path.resolve(template.filePath), 'binary');
  const zip = new PizZip(content);
  const replacementMap = normalizeReplacementMap(template, renderValues);
  const companyCleanupEntries = buildCompanyCleanupEntries(template, replacementMap);
  const dateCleanupEntries = buildExactValueCleanupEntries(replacementMap, ['EFFECTIVE_DATE', 'NEXT_REVIEW_DATE']);
  const referenceReplacement = replacementMap.find((item) => item.key === 'DOCUMENT_REFERENCE_PREFIX');
  const effectiveDateReplacement = replacementMap.find((item) => item.key === 'EFFECTIVE_DATE');
  const nextReviewDateReplacement = replacementMap.find((item) => item.key === 'NEXT_REVIEW_DATE');
  const companyReplacementEntries = companyCleanupEntries.length
    ? companyCleanupEntries
    : expandedReplacementEntries(replacementMap).filter((item) => ['CLIENT_LEGAL_NAME', 'CLIENT_SHORT_NAME'].includes(item.key));
  const replacementCounts: Record<string, number> = {};

  const xmlParts = ['word/document.xml', ...Object.keys(zip.files).filter((name) => /^word\/(header|footer)\d+\.xml$/.test(name))];
  for (const part of xmlParts) {
    const file = zip.file(part);
    if (!file) continue;
    let xml = file.asText();
    if (part === 'word/document.xml') {
      const introductionText = normalizeTextInput(renderValues.INTRODUCTION_TEXT || '');
      const beforeIntro = xml;
      xml = replaceSectionBody(xml, /^(?:\d+\.?\s*)?Introduction$/i, /^(?:\d+\.?\s*)?(Definitions|Scope)$/i, introductionText);
      if (beforeIntro !== xml) replacementCounts.INTRODUCTION_TEXT = 1;
    }
    if (referenceReplacement) {
      for (const oldValue of referenceReplacement.oldValues) {
        const before = xml;
        xml = replaceDocumentReferencePrefix(xml, oldValue, referenceReplacement.newValue);
        if (before !== xml) replacementCounts.DOCUMENT_REFERENCE_PREFIX = (replacementCounts.DOCUMENT_REFERENCE_PREFIX || 0) + 1;
      }
    }
    if (effectiveDateReplacement) {
      const effectiveDateVariants = uniqueNormalizedValues(effectiveDateReplacement.oldValues.flatMap((oldValue) => dateVariants(oldValue)));
      const beforeDate = xml;
      if (part === 'word/document.xml') xml = replaceTableDates(xml, /Effective\s*Date/i, effectiveDateReplacement.newValue, effectiveDateReplacement.oldValues);
      const exact = replaceSpecificDateValue(xml, effectiveDateReplacement.newValue, effectiveDateReplacement.oldValues);
      xml = exact.xml;
      xml = replaceLabeledDateValue(xml, /Effective\s*Date/i, effectiveDateReplacement.newValue, effectiveDateReplacement.oldValues);
      const effectiveDateCount = Math.max(exact.count, countOccurrencesForValues(beforeDate, effectiveDateVariants) - countOccurrencesForValues(xml, effectiveDateVariants));
      replacementCounts.EFFECTIVE_DATE = (replacementCounts.EFFECTIVE_DATE || 0) + effectiveDateCount;
    }
    if (nextReviewDateReplacement) {
      const nextReviewVariants = uniqueNormalizedValues(nextReviewDateReplacement.oldValues.flatMap((oldValue) => dateVariants(oldValue)));
      const beforeDate = xml;
      if (part === 'word/document.xml') xml = replaceTableDates(xml, /Next\s*Review\s*Date/i, nextReviewDateReplacement.newValue, nextReviewDateReplacement.oldValues);
      const exact = replaceSpecificDateValue(xml, nextReviewDateReplacement.newValue, nextReviewDateReplacement.oldValues);
      xml = exact.xml;
      xml = replaceLabeledDateValue(xml, /Next\s*Review\s*Date/i, nextReviewDateReplacement.newValue, nextReviewDateReplacement.oldValues);
      const nextReviewCount = Math.max(exact.count, countOccurrencesForValues(beforeDate, nextReviewVariants) - countOccurrencesForValues(xml, nextReviewVariants));
      replacementCounts.NEXT_REVIEW_DATE = (replacementCounts.NEXT_REVIEW_DATE || 0) + nextReviewCount;
    }
    const paragraphRunReplacement = replaceAcrossWordContainersByKey(xml, companyReplacementEntries, /<w:p(?:\s|>)[\s\S]*?<\/w:p>/g);
    xml = paragraphRunReplacement.xml;
    mergeReplacementCounts(replacementCounts, paragraphRunReplacement.counts);
    const tableRunReplacement = replaceAcrossWordContainersByKey(xml, companyReplacementEntries, /<w:tc(?:\s|>)[\s\S]*?<\/w:tc>/g);
    xml = tableRunReplacement.xml;
    mergeReplacementCounts(replacementCounts, tableRunReplacement.counts);
    for (const replacement of companyReplacementEntries) {
      const replaced = countAndReplacePlainText(xml, replacement.oldValue, replacement.newValue);
      xml = replaced.xml;
      replacementCounts[replacement.key] = (replacementCounts[replacement.key] || 0) + replaced.count;
    }
    zip.file(part, xml);
  }

  const finalCleanupEntries = [...companyReplacementEntries, ...dateCleanupEntries].sort((a, b) => b.oldValue.length - a.oldValue.length);
  for (const part of getDocxTextXmlParts(zip)) {
    const file = zip.file(part);
    if (!file) continue;
    const xml = file.asText();
    const finalCleanup = runFinalValueCleanup(xml, finalCleanupEntries);
    if (finalCleanup.xml !== xml) {
      zip.file(part, finalCleanup.xml);
      mergeReplacementCounts(replacementCounts, finalCleanup.counts);
    }
  }

  const logoReplacementCount = replaceLogoMedia(zip, logo);
  const logoReplaced = logoReplacementCount > 0;
  const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outDir = path.join(GENERATED_ROOT, projectId || 'global', 'generated-documents', batchId || 'single');
  fs.mkdirSync(outDir, { recursive: true });
  const clientName = String(renderValues.CLIENT_SHORT_NAME || renderValues.CLIENT_LEGAL_NAME || 'Client').replace(/[^\w\-]+/g, '_');
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const outputName = `${clientName}_${template.title.replace(/[^\w\-]+/g, '_')}_${stamp}${batchId ? `_${batchId.slice(0, 8)}` : ''}.docx`;
  const outputPath = path.join(outDir, outputName);
  fs.writeFileSync(outputPath, buf);

  const validationWarnings = validateGeneratedDocx(outputPath, replacementMap, logoReplaced, !!logo, template);
  const missingWarnings = requiredGenerationFields
    .filter((key) => key !== 'CLIENT_LOGO')
    .filter((key) => !String(renderValues[key] || '').trim())
    .map((key) => `Required value missing: {{${key}}}`);
  if (!logo && requiredGenerationFields.includes('CLIENT_LOGO')) {
    missingWarnings.push('Required value missing: {{CLIENT_LOGO}}');
  }
  const warnings = [...missingWarnings, ...validationWarnings];

  return {
    outputName,
    outputPath,
    warnings,
    renderValues,
    logoReplaced,
    documentReferenceNo: documentReferenceForTemplate(template, String(renderValues.DOCUMENT_REFERENCE_PREFIX || '')),
    replacementReport: {
      ...buildReplacementReport(template, outputPath, replacementMap, replacementCounts, logoReplacementCount, warnings, renderValues),
    },
  };
}

function createZip(zipPath: string, files: Array<{ path: string; name: string }>) {
  return new Promise<void>((resolve, reject) => {
    fs.mkdirSync(path.dirname(zipPath), { recursive: true });
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', reject);
    archive.pipe(output);
    files.forEach((file) => archive.file(file.path, { name: file.name }));
    archive.finalize();
  });
}

router.get('/', authenticateJWT, async (req, res) => {
  const { framework, category } = req.query;
  try {
    const templates = await prisma.template.findMany({
      where: {
        ...(framework ? { framework: String(framework) } : {}),
        ...(category ? { category: String(category) } : {}),
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticateJWT, async (req, res) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ message: 'Template not found' });
  res.json(template);
});

router.delete('/:id', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const template = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const generatedDocumentCount = await prisma.generatedDocument.count({
      where: { templateId: template.id },
    });

    const updated = await prisma.template.update({
      where: { id: template.id },
      data: {
        isActive: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'TEMPLATE_DELETED',
        details: `Template deleted: ${template.title}`,
      },
    });

    res.json({
      id: updated.id,
      deleted: true,
      generatedDocumentCount,
      message: generatedDocumentCount > 0
        ? 'Template removed from active policy library. Existing generated documents were preserved.'
        : 'Template deleted successfully.',
    });
  } catch (error: any) {
    console.error('Template delete failed:', error);
    res.status(500).json({ message: error?.message || 'Template delete failed' });
  }
});

router.post('/upload', authenticateJWT, authorizeRoles('ADMIN'), upload.single('template'), async (req: AuthRequest, res) => {
  const { title, framework, category, description, tags, templateType } = req.body;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const detection = req.file.originalname.toLowerCase().endsWith('.docx')
      ? detectMetadata(req.file.path)
      : { detections: [], textPreview: '', staleBrandingSeeds: [] };

    const placeholderMapping = buildPlaceholderMappingFromDetection(detection);

    const template = await prisma.template.create({
      data: {
        title: title || req.file.originalname.replace(/\.[^.]+$/, ''),
        templateName: title || req.file.originalname.replace(/\.[^.]+$/, ''),
        templateType: templateType || 'DOCX_POLICY',
        framework: framework || 'ISO 27001',
        category: category || 'Policy',
        description,
        tags,
        filePath: req.file.path,
        placeholdersDetected: JSON.stringify(detection),
        placeholderMapping: JSON.stringify(placeholderMapping),
        status: 'DETECTED',
        createdBy: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, actionType: 'TEMPLATE_UPLOADED', details: `Template uploaded: ${template.title}` },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, actionType: 'METADATA_AUTO_DETECTED', details: `${detection.detections.length} placeholder suggestions found for ${template.title}` },
    });

    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while processing template' });
  }
});

router.post('/:id/detect-metadata', authenticateJWT, async (req: AuthRequest, res) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ message: 'Template not found' });
  try {
    const detection = detectMetadata(template.filePath);
    const placeholderMapping = buildPlaceholderMappingFromDetection(detection);
    const updated = await prisma.template.update({
      where: { id: template.id },
      data: {
        placeholdersDetected: JSON.stringify(detection),
        placeholderMapping: template.status === 'READY' ? template.placeholderMapping : JSON.stringify(placeholderMapping),
        status: template.status === 'READY' ? template.status : 'DETECTED',
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, actionType: 'METADATA_AUTO_DETECTED', details: `${detection.detections.length} placeholder suggestions found for ${template.title}` },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Metadata detection failed' });
  }
});

router.post('/:id/save-placeholder-mapping', authenticateJWT, async (req: AuthRequest, res) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ message: 'Template not found' });

  const updated = await prisma.template.update({
    where: { id: template.id },
    data: {
      placeholderMapping: JSON.stringify(req.body.mapping || {}),
      status: 'READY',
    },
  });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, actionType: 'PLACEHOLDER_MAPPING_UPDATED', details: `Placeholder mapping updated for ${template.title}` },
  });
  res.json(updated);
});

router.post('/:id/generate', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const template = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const values = { ...mappingObject(template), ...(req.body?.values || {}) };
    const projectId = req.body?.projectId || 'global';
    const { outputName, outputPath, warnings, renderValues, documentReferenceNo, replacementReport } = renderTemplateDocx(template, projectId, values);

    const generated = await prisma.generatedDocument.create({
      data: {
        projectId,
        templateId: template.id,
        documentName: outputName,
        documentReferenceNo,
        docxPath: outputPath,
        filePath: outputPath,
        generatedBy: req.user!.id,
        warnings: warnings.length ? JSON.stringify(warnings) : null,
        staleWarnings: warnings.length ? JSON.stringify(warnings) : null,
        status: warnings.length ? 'GENERATED_WITH_WARNINGS' : 'GENERATED',
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, actionType: 'DOCUMENT_GENERATED', details: `Generated document: ${template.title}` },
    });

    res.json({ id: generated.id, downloadUrl: `/api/generated-documents/${generated.id}/download-docx`, filename: outputName, warnings, replacementReport });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error?.message || 'Error generating document' });
  }
});

router.post('/bulk-generate', authenticateJWT, logoUpload.single('clientLogo'), async (req: AuthRequest, res) => {
  const body = req.body || {};
  const parsedTemplateIds = typeof body.templateIds === 'string' ? JSON.parse(body.templateIds || '[]') : body.templateIds;
  const parsedCommonValues = typeof body.commonValues === 'string' ? JSON.parse(body.commonValues || '{}') : body.commonValues;
  const parsedDocumentOverrides = typeof body.documentOverrides === 'string' ? JSON.parse(body.documentOverrides || '[]') : body.documentOverrides;

  const templateIds = Array.isArray(parsedTemplateIds) ? parsedTemplateIds : [];
  if (!templateIds.length) return res.status(400).json({ message: 'Select at least one template' });

  const projectId = body.projectId || 'global';
  const commonValues = parsedCommonValues || {};
  const documentOverrides = Array.isArray(parsedDocumentOverrides) ? parsedDocumentOverrides : [];
  const overrideByTemplate = new Map(documentOverrides.map((item: any) => [item.templateId, item]));
  const batchName = body.batchName || `Document Batch ${new Date().toISOString().slice(0, 10)}`;

  const templates = await prisma.template.findMany({ where: { id: { in: templateIds }, isActive: true } });
  const batch = await prisma.documentGenerationBatch.create({
    data: {
      projectId,
      batchName,
      templateCount: templateIds.length,
      generatedBy: req.user!.id,
      status: 'PROCESSING',
    },
  });

  const generatedDocuments: any[] = [];
  const warnings: any[] = [];
  const replacementReports: any[] = [];
  const zipFiles: Array<{ path: string; name: string }> = [];
  let failedCount = 0;

  for (const template of templates) {
    try {
      const templateOverride = (overrideByTemplate.get(template.id) || {}) as Record<string, any>;
      const values = {
        ...mappingObject(template),
        ...commonValues,
        ...templateOverride,
      };
      delete (values as any).templateId;
      const result = renderTemplateDocx(template, projectId, values, batch.id, req.file);
      if (result.warnings.length) warnings.push({ templateId: template.id, templateName: template.title, warnings: result.warnings });
      if (result.replacementReport) replacementReports.push(result.replacementReport);

      const generated = await prisma.generatedDocument.create({
        data: {
          batchId: batch.id,
          projectId,
          templateId: template.id,
          documentName: result.outputName,
          documentReferenceNo: result.documentReferenceNo,
          docxPath: result.outputPath,
          filePath: result.outputPath,
          generatedBy: req.user!.id,
          warnings: result.warnings.length ? JSON.stringify(result.warnings) : null,
          staleWarnings: result.warnings.length ? JSON.stringify(result.warnings) : null,
          status: result.warnings.length ? 'GENERATED_WITH_WARNINGS' : 'GENERATED',
        },
      });
      generatedDocuments.push(generated);
      zipFiles.push({ path: result.outputPath, name: result.outputName });
    } catch (error: any) {
      failedCount += 1;
      warnings.push({ templateId: template.id, templateName: template.title, warnings: [error?.message || 'Generation failed'] });
    }
  }

  const zipPath = path.join(GENERATED_ROOT, projectId, 'generated-documents', batch.id, `${batch.id}.zip`);
  if (zipFiles.length) await createZip(zipPath, zipFiles);

  const updatedBatch = await prisma.documentGenerationBatch.update({
    where: { id: batch.id },
    data: {
      generatedCount: generatedDocuments.length,
      failedCount,
      warningCount: warnings.reduce((count, item) => count + item.warnings.length, 0),
      zipPath: zipFiles.length ? zipPath : null,
      status: failedCount ? 'COMPLETED_WITH_ERRORS' : warnings.length ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED',
    },
  });

  await prisma.auditLog.create({
    data: { userId: req.user!.id, actionType: 'BULK_DOCUMENT_GENERATED', details: `Generated ${generatedDocuments.length} documents in ${batchName}` },
  });

  res.json({
    batchId: updatedBatch.id,
    batch: updatedBatch,
    generatedDocuments,
    warnings,
    replacementReports,
    zipDownloadUrl: updatedBatch.zipPath ? `/api/document-generation-batches/${updatedBatch.id}/download-zip` : null,
  });
});

export default router;
