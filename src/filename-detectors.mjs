import {MARKERS as M} from './protocol.mjs';

const AIO_COMMIT = '57f5a3e323dd491d93af704594ac9e3d04b039d6';
const BETTERFORMATTER_COMMIT = 'd96eaa1b768ada28f1a611e6967359f05cd2f733';
const PTT_COMMIT = 'b58bbb65175c68b25ea4fec0cab1b7a74a10c044';
const AIO_REGEX = `https://github.com/Viren070/AIOStreams/blob/${AIO_COMMIT}/packages/core/src/parser/regex.ts`;
const BETTERFORMATTER_FILTERS = `https://github.com/9mousaa/BetterFormatter/blob/${BETTERFORMATTER_COMMIT}/fusion-tags.json`;
const PTT_HANDLERS = `https://github.com/Viren070/parse-torrent-title/blob/${PTT_COMMIT}/src/handlers.ts`;

const LEFT = String.raw`(?<![^\s\[(_\-.,])`;
const RIGHT = String.raw`(?=[\s\)\]_.\-,]|$)`;
const bounded = (raw) => `${LEFT}(?:${raw})${RIGHT}`;

const scores = Object.freeze({
  'resolution-4k': [0.9971270264723989, 0.9836032388663968],
  'resolution-1080p': [0.998836785360857, 0.9253981019784462],
  'resolution-720p': [0.9941900541605121, 0.8449949782390358],
  'source-remux': [1, 0.9745042492917847], 'source-bluray': [0.9985616506298979, 1], 'source-web': [0.9984378183794064, 1],
  'visual-sdr': [1, 1], 'visual-hdr10-plus': [1, 1], 'visual-hdr10': [1, 1], 'visual-hdr': [1, 1],
  'visual-dv': [1, 1], 'visual-imax': [1, 1], 'visual-imax-enhanced': [null, null],
  'audio-atmos': [1, 1], 'audio-dd-plus': [1, 1], 'audio-dd': [0.9996961409905804, 1],
  'audio-dtsx': [1, 1], 'audio-dts-hd-ma': [1, 1], 'audio-dts-hd': [1, 1], 'audio-dts': [1, 1], 'audio-truehd': [1, 1],
  'channels-7-1': [1, 1], 'channels-6-1': [0.9285714285714286, 1], 'channels-5-1': [0.9994359842075579, 1],
  'language-english': [0.9934857934857935, 0.943406159515662], 'language-spanish': [0.9645441389290883, 0.853393085787452],
  'language-french': [0.9995932754880694, 0.9948724868438807], 'language-german': [0.9258333333333333, 0.9754170324846356],
  'language-italian': [0.9783050847457627, 0.9876796714579056], 'language-portuguese': [0.9996174445294568, 0.9901477832512315],
  'language-portuguese-brazil': [0.9521625163826999, 0.997254632807138], 'language-russian': [0.9968628898320724, 0.9988905325443787],
  'language-chinese': [0.9990972692394493, 0.9985714285714286], 'language-japanese': [0.9984405458089669, 0.995852235904083],
  'language-korean': [0.9386189258312021, 0.9993192648059904], 'language-dutch': [0.9826789838337182, 0.9953216374269006],
  'language-swedish': [1, 0.971953578336557], 'language-norwegian': [1, 0.9988610478359908], 'language-danish': [1, 0.9275720164609054],
  'language-finnish': [0.9969325153374233, 0.9777376654632972], 'language-polish': [0.9807692307692307, 1],
  'language-arabic': [0.9742304939155333, 0.9742304939155333], 'language-hindi': [1, 0.9959931310818546],
  'language-turkish': [1, 0.998046875], 'language-greek': [0.7912087912087912, 0.9813486370157819],
  'language-hungarian': [1, 1], 'language-czech': [0.9466911764705882, 0.998062015503876],
  'language-ukrainian': [0.991362763915547, 0.9990328820116054], 'language-romanian': [0.9905660377358491, 0.9170305676855895],
  'language-bulgarian': [1, 1], 'language-vietnamese': [0.9047619047619048, 0.9925373134328358],
  'language-thai': [0.8840445269016698, 0.9906444906444907], 'language-multi-dual': [1, 0.9222044302108353],
});

const definitions = [
  ['resolution-4k', 'resolution', M.Resolution4K, String.raw`^(?=.*(?:2160[pi]?|4k|uhd))(?!.*(?:1080[pi]?|720[pi]?))`, 'BetterFormatter', BETTERFORMATTER_FILTERS],
  ['resolution-1080p', 'resolution', M.Resolution1080p, String.raw`\b1080[pi]?\b`, 'BetterFormatter', BETTERFORMATTER_FILTERS],
  ['resolution-720p', 'resolution', M.Resolution720p, String.raw`\b720[pi]?\b`, 'BetterFormatter', BETTERFORMATTER_FILTERS],
  ['source-remux', 'source', M.Remux, `^(?!.*dvd.*(?:bd|br|b|uhd)?remux).*?${bounded(String.raw`(bd|br|b|uhd)?remux(?!.*dvd)`)}`, 'Our Filename Regex', AIO_REGEX],
  ['source-bluray', 'source', M.BluRay, `^(?!.*remux).*?${bounded(String.raw`((bd|blu[ .\-_]?ray)([ .\-_]?rip)?|br[ .\-_]?rip)`)}`, 'Our Filename Regex', AIO_REGEX],
  ['source-web', 'source', M.Web, bounded(String.raw`web[ .\-_]?(dl)?(?![ .\-_]?(rip|DLRip|cam))`), 'Our Filename Regex', AIO_REGEX],
  ['visual-sdr', 'visual', M.SDR, bounded('sdr'), 'Our Filename Regex', AIO_REGEX],
  ['visual-hdr10-plus', 'visual', M.HDR10Plus, bounded(String.raw`hdr[ .\-_]?10[ .\-_]?(p(lus)?|[+])`), 'Our Filename Regex', AIO_REGEX],
  ['visual-hdr10', 'visual', M.HDR10, bounded(String.raw`hdr[ .\-_]?10(?![ .\-_]?(?:\+|p(?:lus)?|bit|hi))`), 'Our Filename Regex', AIO_REGEX],
  ['visual-hdr', 'visual', M.HDR, bounded(String.raw`hdr(?![ .\-_]?(?:10(?![ .\-_]?(?:bit|hi))|\+|p(?:lus)?))`), 'Our Filename Regex', AIO_REGEX],
  ['visual-dv', 'visual', M.DV, bounded(String.raw`do?(lby)?[ .\-_]?vi?(sion)?(?:[ .\-_]?atmos)?|dv`), 'Our Filename Regex', AIO_REGEX],
  ['visual-imax', 'visual', M.IMAX, bounded('imax'), 'Our Filename Regex', AIO_REGEX],
  ['visual-imax-enhanced', 'visual', M.IMAXEnhanced, bounded(String.raw`imax(?:[ ._-]?enhanced|enhanced)`), 'Our Filename Regex', AIO_REGEX],
  ['audio-atmos', 'audio', M.Atmos, bounded(String.raw`atmos|ddpa\d?`), 'Our Filename Regex', AIO_REGEX],
  ['audio-dd-plus', 'audio', M.DDPlus, bounded(String.raw`(d(olby)?[ .\-_]?d(igital)?[ .\-_]?((p(lus)?|\+)a?)(?:[ .\-_]?(2[ .\-_]?0|5[ .\-_]?1|7[ .\-_]?1))?)|e[ .\-_]?ac[ .\-_]?3`), 'Our Filename Regex', AIO_REGEX],
  ['audio-dd', 'audio', M.DD, bounded(String.raw`(d(olby)?[ .\-_]?d(igital)?(?:[ .\-_]?(5[ .\-_]?1|7[ .\-_]?1|2[ .\-_]?0?))?)|(?<!e[ .\-_]?)ac[ .\-_]?3`), 'Our Filename Regex', AIO_REGEX],
  ['audio-dtsx', 'audio', M.DTSX, bounded(String.raw`dts[ .\-:_]?x`), 'Our Filename Regex', AIO_REGEX],
  ['audio-dts-hd-ma', 'audio', M.DTSHDMA, bounded(String.raw`dts[ .\-_]?hd[ .\-_]?ma`), 'Our Filename Regex', AIO_REGEX],
  ['audio-dts-hd', 'audio', M.DTSHD, bounded(String.raw`dts[ .\-_]?hd(?![ .\-_]?ma)`), 'Our Filename Regex', AIO_REGEX],
  ['audio-dts', 'audio', M.DTS, bounded(String.raw`dts(?![ .\-:_]?(x(?=[\s\)\]_.\-,]|$)|hd[ .\-_]?(ma)?|es))`), 'Our Filename Regex', AIO_REGEX],
  ['audio-truehd', 'audio', M.TrueHD, bounded(String.raw`true[ .\-_]?hd`), 'Our Filename Regex', AIO_REGEX],
  ['channels-7-1', 'channels', M.Channels71, bounded(String.raw`(d(olby)?[ .\-_]?d(igital)?[ .\-_]?((p(lus)?|\+)a?)?)?7[ .\-_]?1(ch)?`), 'Our Filename Regex', AIO_REGEX],
  ['channels-6-1', 'channels', M.Channels61, bounded(String.raw`(d(olby)?[ .\-_]?d(igital)?[ .\-_]?((p(lus)?|\+)a?)?)?6[ .\-_]?1(ch)?`), 'Our Filename Regex', AIO_REGEX],
  ['channels-5-1', 'channels', M.Channels51, bounded(String.raw`(d(olby)?[ .\-_]?d(igital)?[ .\-_]?((p(lus)?|\+)a?)?)?5[ .\-_]?1(ch)?`), 'Our Filename Regex', AIO_REGEX],
];

const SOL_LEFT = String.raw`(?:^|[\s\[(_.,/+|-])`;
const SOL_RIGHT = String.raw`(?=[\s\)\]_.\-,/+|]|$)`;
const solBounded = (raw) => `${SOL_LEFT}(?:${raw})${SOL_RIGHT}`;
const languagePatterns = Object.freeze({
  english: String.raw`(?!^(?:the[ ._-])?english(?:[ ._-]|$)).*${solBounded(String.raw`english?|eng|engl?|eng?sub\w*|esub|ingl[eéê]s`)}`,
  spanish: String.raw`(?:(?!^(?:the[ ._-])?spanish(?:[ ._-]|$)).*${solBounded(String.raw`spanish|spa|esp|espa[nñ]ol[ae]?|castellano`)}|.*(?:[/|+]es(?:-(?:la|es))?)(?=[/|+\]\s]))`,
  french: String.raw`(?!^(?:the[ ._-])?french(?:[ ._-]|$)).*${solBounded(String.raw`french|fra|fre|fr|vf[fqrib2]?|vost(?:fr?|a)|sub[ ._-]?french|true[ ._-]?french`)}`,
  german: String.raw`(?!^(?:the[ ._-])?german(?:[ ._-]|$)).*${solBounded(String.raw`german|deu(?:tsch)?(?:land)?|ger|alem[aã]o`)}`,
  italian: String.raw`(?!^(?:the[ ._-])?italian(?:[ ._-]|$)).*${solBounded(String.raw`italian[oa]?|ita`)}`,
  portuguese: String.raw`(?!^(?:the[ ._-])?portuguese(?:[ ._-]|$)).*${solBounded(String.raw`portugu[eèê]s[ea]?|portuguese|por|pt(?:[ ._-]?(?:br|pt|eng?|subs?|titles?))?|leg(?:endado|endas?)|dublado`)}`,
  'portuguese-brazil': String.raw`.*${solBounded(String.raw`(?:p[rt]|en|port)[ ._()\/-]*br|br(?:a|azil|azilian)[ ._-]+(?:pt|por)|(?:leg(?:endado|endas?)?|dub(?:lado)?|portugu[eèê]se?)[ ._-]*br`)}`,
  russian: String.raw`.*(?:${solBounded(String.raw`russian|rus?|russo`)}|\p{Script=Cyrillic})`,
  chinese: String.raw`.*(?:${solBounded(String.raw`chinese|chin[eê]s|traditional[ ._-]*chinese|chinese[ ._-]*traditional|zh[ ._-]*hant|zh[ ._-]*hans|mand[ae]rin|ch[ist]`)}|\p{Script=Han})`,
  japanese: String.raw`(?!.*${solBounded(String.raw`japanese[ ._-]+ver\.?`)}).*(?:${solBounded(String.raw`japanese|jap|jpn|jp|japon[eê]s`)}|[\p{Script=Hiragana}\p{Script=Katakana}])`,
  korean: String.raw`.*(?:${solBounded(String.raw`korean|kor(?:[ ._-]?sub)?|coreano`)}|\p{Script=Hangul})`,
  dutch: String.raw`.*${solBounded(String.raw`dutch|dut|nl|holand[eê]s|flemish`)}`,
  swedish: String.raw`.*${solBounded(String.raw`swedish|swe|swesubs?|sv(?:ensk)?|sueco|nordic`)}`,
  norwegian: String.raw`.*${solBounded(String.raw`norwegian|nor|norsk|norsub|nordic|noruegu[eê]s|bokm[aå]l|nob`)}`,
  danish: String.raw`.*${solBounded(String.raw`danish|dk|danska|dansub|dinamarqu[eê]s|nordic`)}`,
  finnish: String.raw`.*${solBounded(String.raw`finnish|fin|finsk|finsub|nordic`)}`,
  polish: String.raw`.*${solBounded(String.raw`polish|pol|pl|polon[eê]s|polaco|pldub|plsub|dubpl|dubbingpl|lekpl|lektorpl`)}`,
  arabic: String.raw`.*(?:${solBounded(String.raw`arabic|ara|[aá]rabe`)}|\p{Script=Arabic})`,
  hindi: String.raw`.*${solBounded(String.raw`hindi|hin`)}`, turkish: String.raw`.*${solBounded(String.raw`turkish|tur(?:co)?|tivibu|bitturk|turktorrent`)}`,
  greek: String.raw`(?!^(?:the[ ._-])?greek(?:[ ._-]|$)).*${solBounded(String.raw`greek|ell`)}`,
  hungarian: String.raw`.*${solBounded(String.raw`hungarian|hun|hu`)}`, czech: String.raw`.*${solBounded(String.raw`czech|cze|cz[eh]?`)}`,
  ukrainian: String.raw`.*${solBounded(String.raw`ukrainian|ukr`)}`, romanian: String.raw`.*${solBounded(String.raw`romanian|rum|rom|ro(?=[ .,_/-]*(?:[a-z]{2}[ .,_/-]+)*sub)`)}`,
  bulgarian: String.raw`.*${solBounded(String.raw`bulgarian|bul`)}`, vietnamese: String.raw`.*${solBounded(String.raw`vietnamese|vietnam|vie`)}`,
  thai: String.raw`.*${solBounded(String.raw`thai|tha|tailand[eê]s`)}`,
});

const languageMarkers = Object.freeze({
  english: M.English, spanish: M.Spanish, french: M.French, german: M.German, italian: M.Italian,
  portuguese: M.Portuguese, 'portuguese-brazil': M.PortugueseBrazil, russian: M.Russian, chinese: M.Chinese,
  japanese: M.Japanese, korean: M.Korean, dutch: M.Dutch, swedish: M.Swedish, norwegian: M.Norwegian,
  danish: M.Danish, finnish: M.Finnish, polish: M.Polish, arabic: M.Arabic, hindi: M.Hindi,
  turkish: M.Turkish, greek: M.Greek, hungarian: M.Hungarian, czech: M.Czech, ukrainian: M.Ukrainian,
  romanian: M.Romanian, bulgarian: M.Bulgarian, vietnamese: M.Vietnamese, thai: M.Thai,
});

for (const [language, marker] of Object.entries(languageMarkers)) {
  definitions.push([`language-${language}`, 'languages', marker, `^${languagePatterns[language]}`, 'SOL Regex', PTT_HANDLERS]);
}
definitions.push([
  'language-multi-dual', 'languages', M.MultiDual,
  bounded(String.raw`multi(?![ .\-_]?sub(title)?s?)|dual[ .\-_]?(audio|lang(uage)?|flac|ac3|aac2?)(?![ .\-_]?sub(title)?s?)`),
  'Our Filename Regex', AIO_REGEX,
]);

export const PRODUCTION_FILENAME_DETECTORS = Object.freeze(definitions.map(([
  id, category, marker, pattern, method, provenance,
]) => {
  const [rightWhenShown, foundWhenPresent] = scores[id];
  return Object.freeze({
    id, category, marker, method, provenance,
    icuPattern: `(?i)${pattern}`,
    jsPattern: pattern,
    score: Object.freeze({rightWhenShown, foundWhenPresent, corpusRows: 100189}),
    evidence: rightWhenShown == null ? 'insufficient-independent-evidence' : 'measured',
    selectionRationale: category === 'resolution'
      ? 'BetterFormatter was explicitly selected for resolution despite its measured 1080p and 720p catch-rate tradeoff.'
      : method === 'SOL Regex'
        ? 'SOL Regex was selected for ordinary detected-language facts.'
        : 'Our AIOStreams-derived filename expression was selected by the retained corpus study.',
  });
}));

const BY_MARKER = new Map(PRODUCTION_FILENAME_DETECTORS.map((detector) => [detector.marker, detector]));

export function filenameDetectorForMarker(marker) {
  return BY_MARKER.get(marker) ?? null;
}
