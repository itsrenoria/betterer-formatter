import {JEOR_DESCRIPTION, JEOR_NAME, SNOAK_DESCRIPTION, SNOAK_NAME} from './formatter-templates.mjs';
import {decodeFilenameMask} from './detection-categories.mjs';
import {MARKERS as M} from './protocol.mjs';

const CLASSIC_NAME = `{stream.quality::exists["{stream.quality::title}"||""]}`;
const FILENAME_DESCRIPTION = `{stream.filename::exists["{stream.filename}"||""]}`;
const CLASSIC_DESCRIPTION = `${FILENAME_DESCRIPTION}\n{service.shortName::exists["{service.shortName}"||""]}{stream.type::exists[" · {stream.type::title::replace('P2p','P2P')}"||""]}{stream.size::>0[" · {stream.size::bytes}"||""]}`;

const RENORIA_NAME = `{stream.resolution::exists["{stream.resolution::replace('2160p','4K')::replace('1440p','2K')}{stream.nSeScore::exists[" "||""]}"||""]}{stream.nSeScore::exists["{stream.nSeScore::pstar::replace('★','●')::replace('⯪','◐')::replace('☆','')}"||""]}`;
const RENORIA_DESCRIPTION = `{metadata.title}{? ({stream.year})?}{? {stream.seasonEpisode::join(' · ')}?}\n{stream.releaseGroup::exists["{stream.releaseGroup} · "||""]}{addon.name}{stream.size::>0[" · {stream.size::rbytes::replace(' ','')}"||""]}`;

const VISIBLE_FORMATTERS = Object.freeze({
  classic: {name: CLASSIC_NAME, description: CLASSIC_DESCRIPTION},
  filename: {name: CLASSIC_NAME, description: FILENAME_DESCRIPTION},
  renoria: {name: RENORIA_NAME, description: RENORIA_DESCRIPTION},
  jeor: {name: JEOR_NAME, description: JEOR_DESCRIPTION},
  snoak: {name: SNOAK_NAME, description: SNOAK_DESCRIPTION},
});

export function visibleFormatter(style) {
  const formatter = VISIBLE_FORMATTERS[style];
  if (!formatter) throw new RangeError(`unknown formatter style: ${style}`);
  return {...formatter};
}

function condition(field, modifier, value) {
  return `{${field}::${modifier}["${value}"||""]}`;
}

function sourceFacts() {
  const ranked = [
    condition('stream.rseMatched::string', '~Remux T', M.Remux),
    `{stream.rseMatched::string::~UHD Bluray T::or::stream.rseMatched::string::~HD Bluray T::or::stream.rseMatched::string::~BD T["${M.BluRay}"||""]}`,
    condition('stream.rseMatched::string', '~Web T', M.Web),
  ].join('');
  const fallback = `{stream.rseMatched::string::~Remux T::or::stream.rseMatched::string::~UHD Bluray T::or::stream.rseMatched::string::~HD Bluray T::or::stream.rseMatched::string::~BD T::or::stream.rseMatched::string::~Web T[""||"{stream.quality::=BluRay REMUX[\"${M.Remux}\"||\"\"]}{stream.quality::=BluRay[\"${M.BluRay}\"||\"\"]}{stream.quality::=WEB-DL[\"${M.Web}\"||\"\"]}"]}`;
  return ranked + fallback;
}

function tierFacts() {
  const tierMarkers = [M.Tier1, M.Tier2, M.Tier3, M.Tier4, M.Tier5, M.Tier6, M.Tier7, M.Tier8];
  const tiers = tierMarkers.map((value, index) => condition('stream.rseMatched::string', `~T${index + 1}`, value)).join('');
  const anyTier = Array.from({length: 8}, (_, index) => `stream.rseMatched::string::~T${index + 1}`).join('::or::');
  const knownSource = `stream.rseMatched::string::~Remux T::or::stream.rseMatched::string::~UHD Bluray T::or::stream.rseMatched::string::~HD Bluray T::or::stream.rseMatched::string::~BD T::or::stream.rseMatched::string::~Web T::or::stream.quality::in('BluRay REMUX','BluRay','WEB-DL')`;
  return `${tiers}{${anyTier}[""||"{${knownSource}[\"${M.Unranked}\"||\"\"]}"]}`;
}

function bgbFacts() {
  return `{stream.nSeScore::>=90["${M.Best}"||"{stream.nSeScore::>=50[\"${M.Good}\"||\"${M.OK}\"]}"]}`;
}

function percentageFacts() {
  const replacements = Array.from({length: 10}, (_, digit) => `::replace('${digit}','${M[`Digit${digit}`]}')`).join('');
  return `{stream.nSeScore::>0["${M.Score}{stream.nSeScore::string${replacements}}"||""]}`;
}

function seaDexFacts() {
  return condition('stream.seadex', 'istrue', M.SeaDex) + condition('stream.seadexBest', 'istrue', M.SeaDexBest);
}

function resolutionFacts() {
  return [
    condition('stream.resolution', '=2160p', M.Resolution4K),
    condition('stream.resolution', '=1080p', M.Resolution1080p),
    condition('stream.resolution', '=720p', M.Resolution720p),
  ].join('');
}

function visualFacts() {
  return [
    condition('stream.visualTags', '~SDR', M.SDR),
    condition('stream.visualTags', '~HDR10+', M.HDR10Plus),
    condition('stream.visualTags', '~HDR10', M.HDR10),
    condition('stream.visualTags', '~HDR', M.HDR),
    condition('stream.visualTags', '~IMAX', M.IMAX),
    `{stream.filename::~imax enhanced::or::stream.filename::~imax.enhanced::or::stream.filename::~imax_enhanced::or::stream.filename::~imax-enhanced::or::stream.filename::~imaxenhanced["${M.IMAXEnhanced}"||""]}`,
    condition('stream.visualTags', '~DV', M.DV),
  ].join('');
}

function joinedExpression(field, replacements, removals) {
  const replace = replacements.map(([value, replacement]) => `::replace('${value}','${replacement}')`).join('');
  const remove = removals.length ? `::remove(${removals.map((value) => `'${value}'`).join(',')})` : '';
  return `{stream.${field}::join('')${replace}${remove}}`;
}

function audioFacts() {
  return joinedExpression('audioTags', [
    ['DTS-HD MA', M.DTSHDMA], ['DTS-HD', M.DTSHD], ['DTS:X', M.DTSX], ['DTS', M.DTS],
    ['TrueHD', M.TrueHD], ['Atmos', M.Atmos], ['DD+', M.DDPlus], ['DD', M.DD],
  ], ['DTS-ES', 'OPUS', 'FLAC', 'AAC', 'Unknown']);
}

function channelFacts() {
  return [
    condition('stream.audioChannels', '~7.1', M.Channels71),
    condition('stream.audioChannels', '~6.1', M.Channels61),
    condition('stream.audioChannels', '~5.1', M.Channels51),
  ].join('');
}

const LANGUAGE_FACTS = [
  [['English'], M.English], [['Spanish'], M.Spanish], [['French'], M.French],
  [['German'], M.German], [['Italian'], M.Italian], [['Portuguese'], M.Portuguese],
  [['Portuguese (Brazil)'], M.PortugueseBrazil], [['Russian'], M.Russian],
  [['Chinese'], M.Chinese], [['Japanese'], M.Japanese], [['Korean'], M.Korean],
  [['Dutch'], M.Dutch], [['Swedish'], M.Swedish], [['Norwegian'], M.Norwegian],
  [['Danish'], M.Danish], [['Finnish'], M.Finnish], [['Polish'], M.Polish],
  [['Arabic'], M.Arabic], [['Hindi'], M.Hindi], [['Turkish'], M.Turkish],
  [['Greek'], M.Greek], [['Hungarian'], M.Hungarian], [['Czech'], M.Czech],
  [['Ukrainian'], M.Ukrainian], [['Romanian'], M.Romanian], [['Bulgarian'], M.Bulgarian],
  [['Vietnamese'], M.Vietnamese], [['Thai'], M.Thai], [['Multi', 'Dual Audio'], M.MultiDual],
];

function languageFacts(languageMode) {
  if (languageMode === 'off') return '';
  const replacements = [
    ['Portuguese (Brazil)', M.PortugueseBrazil], ['Dual Audio', M.MultiDual],
    ...LANGUAGE_FACTS.flatMap(([languages, value]) => languages
      .filter((language) => language !== 'Portuguese (Brazil)' && language !== 'Dual Audio')
      .map((language) => [language, value])),
  ];
  return joinedExpression(languageMode, replacements, [
    'Bengali', 'Punjabi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
    'Indonesian', 'Hebrew', 'Persian', 'Lithuanian', 'Latvian', 'Estonian', 'Slovak', 'Serbian',
    'Croatian', 'Slovenian', 'Malay', 'Latino', 'Dubbed', 'Original', 'Unknown',
  ]);
}

function qualityFacts() {
  return tierFacts() + bgbFacts() + percentageFacts();
}

function commonFacts() {
  return resolutionFacts() + visualFacts() + audioFacts() + channelFacts();
}

export function markerSuffix({languageMode = 'off'} = {}) {
  return markerFragments({languageMode}).join('');
}

export function markerFragments({languageMode = 'off'} = {}) {
  const suffix = sourceFacts() + seaDexFacts() + commonFacts() + qualityFacts() + languageFacts(languageMode);
  return splitExpressions(suffix);
}

function splitExpressions(suffix) {
  const fragments = [];
  let start = -1;
  let depth = 0;
  for (let index = 0; index < suffix.length; index += 1) {
    if (suffix[index] === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (suffix[index] === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        fragments.push(suffix.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return fragments;
}

function categoryFragments(category, selection) {
  if (category === 'source') return splitExpressions(sourceFacts());
  if (category === 'resolution') return splitExpressions(resolutionFacts());
  if (category === 'visual') return splitExpressions(visualFacts());
  if (category === 'audio') return splitExpressions(audioFacts());
  if (category === 'channels') return splitExpressions(channelFacts());
  if (category === 'languages') return splitExpressions(languageFacts(selection.languageMode));
  if (category === 'seadex') {
    if (selection.seadexMode === 'off') return [];
    const values = splitExpressions(seaDexFacts());
    return selection.seadexMode === 'combined' ? values.slice(0, 1) : values;
  }
  if (category === 'tiers') return splitExpressions(tierFacts());
  if (category === 'scoreBands') return splitExpressions(bgbFacts());
  if (category === 'percentages') return splitExpressions(percentageFacts());
  throw new RangeError(`unknown marker category: ${category}`);
}

export function markerFragmentsForSelection({
  quality = 'source', languageMode = 'off', seadexMode = 'split', filenameMask = 0,
} = {}) {
  const filename = new Set(decodeFilenameMask(filenameMask));
  const selected = {quality, languageMode, seadexMode};
  const categories = [
    'resolution', 'source', 'visual', 'audio', 'channels',
    ...(languageMode === 'off' ? [] : ['languages']),
    ...(seadexMode === 'off' ? [] : ['seadex']),
    ...(quality === 'tiers' ? ['tiers'] : []),
    ...(quality === 'best-good-ok' ? ['scoreBands'] : []),
    ...(quality === 'percentages' ? ['percentages'] : []),
  ];
  return categories.flatMap((category) => filename.has(category) ? [] : (
    categoryFragments(category, selected).map((expression) => ({category, expression}))
  ));
}

export function markerFragmentsForPlan(plan) {
  if (!plan || !Array.isArray(plan.markerFragments)) throw new TypeError('markerFragmentsForPlan requires a DetectionPlan.');
  return plan.markerFragments.map((fragment) => ({...fragment}));
}

export function generateLegacyFormatter({style, languageMode = 'off'}) {
  const visible = visibleFormatter(style);
  if (style === 'jeor') {
    return assertFormatterWithinLimit({
      name: visible.name,
      description: visible.description + sourceFacts() + seaDexFacts() + commonFacts(),
    });
  }
  return assertFormatterWithinLimit({
    name: visible.name,
    description: visible.description + markerSuffix({languageMode}),
  });
}

export function generateFormatter({
  style, quality = 'source', languageMode = 'off', seadexMode = 'split', filenameMask = 0,
}) {
  const visible = visibleFormatter(style);
  const suffix = markerFragmentsForSelection({quality, languageMode, seadexMode, filenameMask})
    .map(({expression}) => expression)
    .join('');
  return assertFormatterWithinLimit({
    name: visible.name,
    description: visible.description + suffix,
  });
}

export function assertFormatterWithinLimit(formatter) {
  for (const [field, value] of Object.entries(formatter)) {
    if (value.length > 5000) throw new RangeError(`formatter ${field} must remain at most 5000 characters`);
  }
  return formatter;
}
