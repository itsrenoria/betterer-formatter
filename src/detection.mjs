import {
  DETECTION_CATEGORIES,
  DETECTION_MODES,
  decodeFilenameMask,
  encodeFilenameMask,
} from './detection-categories.mjs';
import {LANGUAGE_MODES, QUALITIES, SEADEX_MODES} from './configuration.mjs';
import {markerFragmentsForSelection} from './formatters.mjs';

export {DETECTION_CATEGORIES, DETECTION_MODES, decodeFilenameMask, encodeFilenameMask};

export const AUTO_OFFLOAD_ORDER = Object.freeze([
  'languages', 'channels', 'audio', 'visual', 'source', 'resolution',
]);

const CATEGORY_ORDER = Object.freeze([
  'resolution', 'source', 'visual', 'audio', 'channels', 'languages',
  'seadex', 'tiers', 'scoreBands', 'percentages',
]);

const MARKER_ONLY_REASONS = Object.freeze({
  seadex: 'SeaDex state is supplied by AIOStreams and is not independently represented by the filename.',
  tiers: 'Release tiers depend on configured AIOStreams ranked expressions.',
  scoreBands: 'Best, Good, and OK depend on AIOStreams normalized scoring.',
  percentages: 'Percentages depend on AIOStreams normalized scoring.',
});

function eligibleCategories(selection) {
  return DETECTION_CATEGORIES.filter((category) => category !== 'languages' || selection.languageMode === 'languages');
}

function requestedFilenameCategories(selection, eligible) {
  if (selection.requestedMode === 'filename') return new Set(eligible);
  if (selection.requestedMode !== 'custom') return new Set();
  const requested = selection.filenameCategories ?? decodeFilenameMask(selection.filenameMask ?? 0);
  if (!Array.isArray(requested)) throw new TypeError('filenameCategories must be an array.');
  for (const category of requested) {
    if (!DETECTION_CATEGORIES.includes(category)) throw new RangeError(`unknown detection category: ${category}`);
  }
  return new Set(requested.filter((category) => eligible.includes(category)));
}

function fragmentsFor(selection, filenameCategories) {
  return markerFragmentsForSelection({...selection, filenameMask: encodeFilenameMask(filenameCategories)});
}

export function planDetection(baseFormatter, selection = {}, maxLength = 5000) {
  if (!Number.isInteger(maxLength) || maxLength < 0) throw new RangeError('maxLength must be a non-negative integer.');
  for (const field of ['name', 'description']) {
    if (typeof baseFormatter?.[field] !== 'string') throw new TypeError(`Formatter ${field} must be a string.`);
    if (baseFormatter[field].length > maxLength) throw new RangeError(`Formatter ${field} exceeds ${maxLength.toLocaleString('en-US')} characters.`);
  }
  const normalized = {
    requestedMode: selection.requestedMode ?? 'markers',
    quality: selection.quality ?? 'source',
    languageMode: selection.languageMode ?? 'off',
    seadexMode: selection.seadexMode ?? 'split',
  };
  if (!DETECTION_MODES.includes(normalized.requestedMode)) throw new RangeError(`unknown detection mode: ${normalized.requestedMode}`);
  if (!QUALITIES.includes(normalized.quality)) throw new RangeError(`unknown quality: ${normalized.quality}`);
  if (!LANGUAGE_MODES.includes(normalized.languageMode)) throw new RangeError(`unknown language mode: ${normalized.languageMode}`);
  if (!SEADEX_MODES.includes(normalized.seadexMode)) throw new RangeError(`unknown SeaDex mode: ${normalized.seadexMode}`);

  const eligible = eligibleCategories(normalized);
  const filename = requestedFilenameCategories({...selection, ...normalized}, eligible);
  const automaticallyMoved = [];
  const capacity = maxLength - baseFormatter.description.length;
  let markerFragments = fragmentsFor(normalized, filename);
  let required = markerFragments.reduce((total, {expression}) => total + expression.length, 0);

  for (const category of AUTO_OFFLOAD_ORDER) {
    if (required <= capacity) break;
    if (!eligible.includes(category) || filename.has(category)) continue;
    filename.add(category);
    automaticallyMoved.push(category);
    markerFragments = fragmentsFor(normalized, filename);
    required = markerFragments.reduce((total, {expression}) => total + expression.length, 0);
  }

  const filenameCategories = CATEGORY_ORDER.filter((category) => filename.has(category));
  const markerCategories = CATEGORY_ORDER.filter((category) => markerFragments.some((fragment) => fragment.category === category));
  const markerOnlyReasons = {...MARKER_ONLY_REASONS};
  if (normalized.languageMode === 'uLanguages') {
    markerOnlyReasons.languages = 'Preferred languages depend on the user’s AIOStreams language configuration.';
  }
  const finalDescriptionCharacters = baseFormatter.description.length + required;
  return Object.freeze({
    requestedMode: normalized.requestedMode,
    filenameCategories: Object.freeze(filenameCategories),
    markerCategories: Object.freeze(markerCategories),
    automaticallyMoved: Object.freeze(automaticallyMoved),
    filenameMask: encodeFilenameMask(filenameCategories),
    requiredMarkerCharacters: required,
    availableMarkerCharacters: capacity,
    baseDescriptionCharacters: baseFormatter.description.length,
    finalDescriptionCharacters,
    overageCharacters: Math.max(0, finalDescriptionCharacters - maxLength),
    maxLength,
    fit: finalDescriptionCharacters <= maxLength,
    markerOnlyReasons: Object.freeze(Object.fromEntries(
      markerCategories.filter((category) => markerOnlyReasons[category]).map((category) => [category, markerOnlyReasons[category]]),
    )),
    markerFragments: Object.freeze(markerFragments.map((fragment) => Object.freeze({...fragment}))),
    selection: Object.freeze(normalized),
  });
}
