import {markerFragments} from './formatters.mjs';
import {planDetection} from './detection.mjs';
import {
  comparatorFunctions,
  compileTemplate,
  parseTemplate,
} from './vendor/aiostreams-formatter-engine.mjs';

const JSON_EXTENSION = /\.json$/iu;
const FUSION_FRAME = /\u2063[\u200b\u200d]{7}\u2063/gu;
const EMPTY_GROUP = /\{\?\s*\?\}/gu;
const NEW_LINE_SENTINEL = '\u0011';
const REMOVE_LINE_SENTINEL = '\u0012';
const KNOWN_MARKER_EXPRESSIONS = Object.freeze(
  [...new Set(['off', 'uLanguages', 'languages'].flatMap((languageMode) => (
    markerFragments({languageMode})
  )))].sort((left, right) => right.length - left.length),
);

function markerOnlyTemplate(template) {
  const {nodes} = parseTemplate(template);
  let hasMarker = false;

  for (const node of nodes) {
    const result = markerOnlyNode(node);
    if (!result.safe) return {safe: false, hasMarker: false};
    hasMarker ||= result.hasMarker;
  }
  return {safe: true, hasMarker};
}

function markerOnlyNode(node) {
  if (node.kind === 'raw') {
    const withoutFrames = node.text.replace(FUSION_FRAME, '');
    return {safe: withoutFrames.length === 0, hasMarker: withoutFrames !== node.text};
  }
  if (node.kind === 'group') {
    let hasMarker = false;
    for (const child of node.nodes) {
      const result = markerOnlyNode(child);
      if (!result.safe) return {safe: false, hasMarker: false};
      hasMarker ||= result.hasMarker;
    }
    return {safe: true, hasMarker};
  }
  if (node.kind !== 'expression' || !node.check) return {safe: false, hasMarker: false};

  let hasMarker = false;
  const branches = [node.check.trueTemplate, node.check.falseTemplate, node.check.absentTemplate]
    .filter((branch) => branch !== undefined);
  for (const branch of branches) {
    const result = markerOnlyTemplate(branch);
    if (!result.safe) return {safe: false, hasMarker: false};
    hasMarker ||= result.hasMarker;
  }
  return {safe: true, hasMarker};
}

function sourceStem(sourceName) {
  let value = String(sourceName || '').split(/[?#]/u, 1)[0];
  if (/^https?:\/\//iu.test(value)) {
    try {
      value = new URL(String(sourceName)).pathname;
    } catch {
      return 'formatter';
    }
  }
  if (!value || value.endsWith('/')) return 'formatter';
  let basename = value.split('/').at(-1) || 'formatter';
  try {
    basename = decodeURIComponent(basename);
  } catch {
    return 'formatter';
  }
  const stem = basename.replace(JSON_EXTENSION, '').trim();
  return stem || 'formatter';
}

function safeStem(value) {
  const cleaned = String(value || '')
    .replace(/\p{Cf}/gu, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-')
    .replace(/^[.\s-]+|[.\s-]+$/gu, '')
    .trim();
  return [...cleaned].slice(0, 120).join('') || 'formatter';
}

export function parseCustomFormatter(value, sourceName = 'formatter.json') {
  if (!value || typeof value.name !== 'string' || typeof value.description !== 'string') {
    throw new TypeError('Invalid AIOStreams formatter: expected string name and description fields.');
  }
  for (const field of ['name', 'description']) {
    if (value[field].length > 5000) {
      throw new RangeError(`Formatter ${field} exceeds 5,000 characters.`);
    }
  }
  const formatter = {
    name: stripFusionMarkerExpressions(value.name),
    description: stripFusionMarkerExpressions(value.description),
  };
  return {
    formatter,
    sourceStem: sourceStem(sourceName),
  };
}

export function stripFusionMarkerExpressions(template) {
  let cleaned = String(template);
  for (const expression of KNOWN_MARKER_EXPRESSIONS) cleaned = cleaned.replaceAll(expression, '');
  const {nodes} = parseTemplate(cleaned);
  const removable = nodes
    .filter((node) => {
      const result = markerOnlyNode(node);
      return result.safe && result.hasMarker;
    })
    .filter((node) => Number.isInteger(node.start) && Number.isInteger(node.end))
    .sort((left, right) => right.start - left.start);
  for (const node of removable) {
    cleaned = cleaned.slice(0, node.start) + cleaned.slice(node.end);
  }
  cleaned = cleaned.replace(FUSION_FRAME, '');
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(EMPTY_GROUP, '');
  } while (cleaned !== previous);
  return cleaned;
}

export function composeCustomFormatter(base, selection = {}) {
  const maxLength = selection.maxLength ?? 5000;
  for (const field of ['name', 'description']) {
    if (typeof base?.[field] !== 'string') throw new TypeError(`Formatter ${field} must be a string.`);
    if (base[field].length > maxLength) throw new RangeError(`Formatter ${field} exceeds ${maxLength.toLocaleString('en-US')} characters.`);
  }

  const plan = planDetection(base, selection, maxLength);
  if (!plan.fit) return {formatter: null, plan};
  return {
    formatter: {
      name: base.name,
      description: base.description + plan.markerFragments.map(({expression}) => expression).join(''),
    },
    plan,
  };
}

export function customFormatterFileName(stem) {
  return `${safeStem(stem)}-fusion.json`;
}

const renderHooks = Object.freeze({
  comparators: comparatorFunctions,
  resolveVariable(source, value) {
    return source.split('.').reduce((current, key) => current?.[key], value);
  },
});

function applyAIOStreamsLayout(value) {
  return value
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.includes(REMOVE_LINE_SENTINEL))
    .join('\n')
    .replaceAll(NEW_LINE_SENTINEL, '\n');
}

export function renderCustomFormatter(formatter, streamContext) {
  return {
    name: applyAIOStreamsLayout(compileTemplate(formatter.name, renderHooks)(streamContext)),
    description: applyAIOStreamsLayout(compileTemplate(formatter.description, renderHooks)(streamContext)),
  };
}
