export const PUBLIC_API_BASE = 'https://betterformatter-json.itsrenoria.workers.dev/';

function hexadecimalMask(plan) {
  if (!Number.isInteger(plan?.filenameMask) || plan.filenameMask < 0 || plan.filenameMask > 63) {
    throw new TypeError('A valid DetectionPlan is required to build service URLs.');
  }
  return plan.filenameMask.toString(16).padStart(2, '0');
}

function urlFor(path, entries, serviceBase) {
  const url = new URL(path, serviceBase);
  for (const [key, value] of entries) url.searchParams.set(key, String(value));
  return url.href;
}

export function formatterServiceUrl(selection, plan, serviceBase = PUBLIC_API_BASE) {
  return urlFor('/v1/formatter.json', [
    ['style', selection.formatterStyle ?? selection.style],
    ['quality', selection.quality],
    ['languageMode', selection.languageMode],
    ['seadexMode', selection.seadexMode],
    ['filenameMask', hexadecimalMask(plan)],
  ], serviceBase);
}

export function fusionServiceUrl(selection, plan, serviceBase = PUBLIC_API_BASE) {
  return urlFor('/v1/fusion.json', [
    ['badgeFamily', selection.badgeFamily],
    ['quality', selection.quality],
    ['languageMode', selection.languageMode],
    ['sourceBadgeStyle', selection.sourceBadgeStyle],
    ['seadexMode', selection.seadexMode],
    ['icon', selection.icon],
    ['dolbyProfile', selection.dolbyProfile],
    ['hdrPolicy', selection.hdrPolicy],
    ['filenameMask', hexadecimalMask(plan)],
  ], serviceBase);
}
