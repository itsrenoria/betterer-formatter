import {canonicalDolbyProfile} from './configuration.mjs';
import {composeCustomFormatter} from './custom-formatter.mjs';
import {planDetection} from './detection.mjs';
import {generateFormatter, visibleFormatter} from './formatters.mjs';
import {PUBLIC_API_BASE, formatterServiceUrl, fusionServiceUrl} from './service-urls.mjs';

export const PUBLIC_BASE = PUBLIC_API_BASE;

export const DEFAULT_STATE = Object.freeze({
  badgeFamily: 'modern',
  quality: 'tiers',
  icon: 'colored',
  carrier: 'compact',
  dvAudio: 'combined',
  priority: 'dv',
  hdrPolicy: 'suppress-with-dv',
  languageMode: 'uLanguages',
  formatterStyle: 'classic',
  sourceBadgeStyle: 'detailed',
  seadexMode: 'split',
  detectionMode: 'markers',
  customFilenameCategories: Object.freeze([]),
});

const DETECTION_CATEGORY_LABELS = Object.freeze({
  resolution: 'Resolution',
  source: 'Source',
  visual: 'Visual',
  audio: 'Audio',
  channels: 'Channels',
  languages: 'Languages',
  seadex: 'SeaDex',
  tiers: 'Tiers',
  scoreBands: 'Best / Good / OK',
  percentages: 'Percentages',
});

export function detectionCategoryLabel(category, languageMode = 'off') {
  if (category === 'languages' && languageMode === 'uLanguages') return 'Languages (Preferred)';
  if (category === 'languages' && languageMode === 'languages') return 'Languages (Detected)';
  const label = DETECTION_CATEGORY_LABELS[category];
  if (!label) throw new RangeError(`unknown detection category: ${category}`);
  return label;
}

const PREREQUISITES = {
  'best-good-ok': 'Requires AIOStreams scored sorting so nSeScore can classify Best, Good, and OK.',
  percentages: 'Requires AIOStreams scored sorting so nSeScore can display the exact percentage.',
  tiers: 'Requires VidHin’s English Ranked Stream Expressions so rseMatched contains source tier labels.',
  source: 'Source Label Only does not require a scoring template, but it still requires the invisible formatter markers.',
};

export function resolveSelection(state, {publicBase, serviceBase = publicBase ?? PUBLIC_API_BASE, customFormatter = null} = {}) {
  const normalized = state.badgeFamily === 'legacy'
    ? {
        ...state,
        carrier: state.carrier === 'combined' ? 'separate' : state.carrier,
        dvAudio: state.dvAudio === 'combined' ? 'separate' : state.dvAudio,
      }
    : {...state, badgeFamily: state.badgeFamily ?? 'modern'};
  const dolbyProfile = canonicalDolbyProfile(normalized);
  const languageBadges = normalized.languageMode !== 'off';
  const fusionConfiguration = {
    badgeFamily: normalized.badgeFamily,
    quality: normalized.quality,
    languageBadges,
    sourceBadgeStyle: normalized.badgeFamily === 'modern' && normalized.quality !== 'best-good-ok'
      ? normalized.sourceBadgeStyle
      : 'detailed',
    seadexMode: normalized.seadexMode,
    icon: normalized.icon,
    dolbyProfile,
    hdrPolicy: normalized.hdrPolicy,
  };
  const formatterConfiguration = {
    style: normalized.formatterStyle,
    quality: normalized.quality,
    languageMode: normalized.languageMode,
    seadexMode: normalized.seadexMode,
  };
  const custom = normalized.formatterStyle === 'custom';
  const baseFormatter = custom ? (customFormatter ?? {name: '', description: ''}) : visibleFormatter(normalized.formatterStyle);
  const detectionSelection = {
    requestedMode: normalized.detectionMode ?? 'markers',
    quality: normalized.quality,
    languageMode: normalized.languageMode,
    seadexMode: normalized.seadexMode,
    filenameCategories: normalized.customFilenameCategories ?? [],
  };
  const plan = planDetection(baseFormatter, detectionSelection);
  formatterConfiguration.filenameMask = plan.filenameMask;
  const composed = custom && customFormatter
    ? composeCustomFormatter(customFormatter, detectionSelection)
    : null;
  const formatter = custom
    ? composed?.formatter ?? null
    : (plan.fit ? generateFormatter(formatterConfiguration) : null);
  const serviceSelection = {...normalized, dolbyProfile};
  const persistentError = plan.fit ? '' : (
    `Formatter description requires ${plan.requiredMarkerCharacters.toLocaleString('en-US')} marker characters, `
    + `but only ${plan.availableMarkerCharacters.toLocaleString('en-US')} are available `
    + `(${plan.overageCharacters.toLocaleString('en-US')} over). AIOStreams name capacity cannot be used because Fusion cannot retrieve markers from name.`
  );
  return {
    ...normalized,
    dolbyProfile,
    languageBadges,
    pairingPriorityVisible: normalized.badgeFamily === 'modern' && normalized.carrier === 'combined' && normalized.dvAudio === 'combined',
    fusionConfiguration,
    formatterConfiguration,
    plan,
    effectiveCarriers: {filename: plan.filenameCategories, markers: plan.markerCategories},
    fusionUrl: fusionServiceUrl(serviceSelection, plan, serviceBase),
    formatterUrl: custom ? null : formatterServiceUrl(serviceSelection, plan, serviceBase),
    formatter,
    formatterAction: custom ? 'download' : 'copy',
    fit: plan.fit,
    persistentError,
    markerSnippet: plan.markerFragments.map(({expression}) => expression).join(''),
    prerequisite: PREREQUISITES[normalized.quality],
  };
}
