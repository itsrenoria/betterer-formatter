import {
  FORMATTER_STYLES,
  HDR_POLICIES,
  ICONS,
  LANGUAGE_MODES,
  QUALITIES,
  SEADEX_MODES,
  SOURCE_BADGE_STYLES,
  dolbyProfilesFor,
  sourceBadgeStylesFor,
} from '../src/configuration.mjs';
import {generateFormatter, visibleFormatter} from '../src/formatters.mjs';
import {generateFusionExport} from '../src/fusion.mjs';
import {decodeFilenameMask, planDetection} from '../src/detection.mjs';
import {stringifyExport} from '../src/protocol.mjs';

const CACHE_CONTROL = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
const CORS_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
});
const JSON_HEADERS = Object.freeze({
  ...CORS_HEADERS,
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': CACHE_CONTROL,
});

function errorResponse(status, message, method = 'GET') {
  const body = method === 'HEAD' ? null : `${JSON.stringify({error: message})}\n`;
  return new Response(body, {status, headers: {...JSON_HEADERS, 'Cache-Control': 'no-store'}});
}

function exactParameters(url, names) {
  const actual = [...url.searchParams.keys()];
  if (actual.length !== names.length || actual.some((name) => !names.includes(name))) {
    throw new TypeError(`Expected query parameters: ${names.join(', ')}.`);
  }
  return Object.fromEntries(names.map((name) => [name, url.searchParams.get(name)]));
}

function oneOf(value, values, name) {
  if (!values.includes(value)) throw new TypeError(`Invalid ${name}.`);
  return value;
}

function filenameMask(value, languageMode) {
  if (!/^(?:[0-2][0-9a-f]|3[0-9a-f])$/u.test(value ?? '')) throw new TypeError('Invalid canonical filenameMask.');
  const mask = Number.parseInt(value, 16);
  if (decodeFilenameMask(mask).includes('languages') && languageMode !== 'languages') {
    throw new TypeError('Languages can use filename detection only in All Detected mode.');
  }
  return mask;
}

function formatterConfiguration(url) {
  const value = exactParameters(url, ['style', 'quality', 'languageMode', 'seadexMode', 'filenameMask']);
  const style = oneOf(value.style, FORMATTER_STYLES, 'style');
  const quality = oneOf(value.quality, QUALITIES, 'quality');
  const languageMode = oneOf(value.languageMode, LANGUAGE_MODES, 'languageMode');
  const seadexMode = oneOf(value.seadexMode, SEADEX_MODES, 'seadexMode');
  const mask = filenameMask(value.filenameMask, languageMode);
  const plan = planDetection(visibleFormatter(style), {
    requestedMode: 'custom', quality, languageMode, seadexMode,
    filenameCategories: decodeFilenameMask(mask),
  });
  if (!plan.fit || plan.filenameMask !== mask) throw new TypeError('filenameMask does not fit this formatter selection.');
  return {style, quality, languageMode, seadexMode, filenameMask: mask};
}

function fusionConfiguration(url) {
  const value = exactParameters(url, [
    'badgeFamily', 'quality', 'languageMode', 'sourceBadgeStyle', 'seadexMode',
    'icon', 'dolbyProfile', 'hdrPolicy', 'filenameMask',
  ]);
  const badgeFamily = oneOf(value.badgeFamily, ['modern', 'legacy'], 'badgeFamily');
  const quality = oneOf(value.quality, QUALITIES, 'quality');
  const languageMode = oneOf(value.languageMode, LANGUAGE_MODES, 'languageMode');
  oneOf(value.sourceBadgeStyle, SOURCE_BADGE_STYLES, 'sourceBadgeStyle');
  const sourceBadgeStyle = oneOf(value.sourceBadgeStyle, sourceBadgeStylesFor(badgeFamily, quality), 'sourceBadgeStyle');
  const seadexMode = oneOf(value.seadexMode, SEADEX_MODES, 'seadexMode');
  const icon = oneOf(value.icon, ICONS, 'icon');
  const dolbyProfile = oneOf(value.dolbyProfile, dolbyProfilesFor(badgeFamily), 'dolbyProfile');
  const hdrPolicy = oneOf(value.hdrPolicy, HDR_POLICIES, 'hdrPolicy');
  return {
    configuration: {
      badgeFamily, quality, languageBadges: languageMode !== 'off', sourceBadgeStyle,
      seadexMode, icon, dolbyProfile, hdrPolicy,
    },
    filenameMask: filenameMask(value.filenameMask, languageMode),
  };
}

async function fetch(request) {
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS_HEADERS});
  if (!['GET', 'HEAD'].includes(method)) return errorResponse(405, 'Method not allowed.', method);
  const url = new URL(request.url);
  try {
    let value;
    if (url.pathname === '/v1/formatter.json') {
      value = generateFormatter(formatterConfiguration(url));
    } else if (url.pathname === '/v1/fusion.json') {
      const resolved = fusionConfiguration(url);
      value = generateFusionExport(resolved.configuration, {filenameMask: resolved.filenameMask});
    } else {
      return errorResponse(404, 'Not found.', method);
    }
    return new Response(method === 'HEAD' ? null : stringifyExport(value), {status: 200, headers: JSON_HEADERS});
  } catch (error) {
    return errorResponse(400, error instanceof Error ? error.message : 'Invalid request.', method);
  }
}

export default {fetch};
