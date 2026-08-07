import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../worker/index.mjs';
import {generateFormatter} from '../src/formatters.mjs';
import {generateFusionExport} from '../src/fusion.mjs';
import {stringifyExport} from '../src/protocol.mjs';

const origin = 'https://betterformatter-json.example.workers.dev';
const formatterQuery = 'style=classic&quality=source&languageMode=off&seadexMode=split&filenameMask=00';
const fusionQuery = 'badgeFamily=modern&quality=source&languageMode=off&sourceBadgeStyle=detailed&seadexMode=split&icon=colored&dolbyProfile=compact-separate&hdrPolicy=suppress-with-dv&filenameMask=00';

async function call(path, init) {
  return worker.fetch(new Request(`${origin}${path}`, init));
}

test('serves browser and Worker formatter JSON byte-for-byte', async () => {
  const response = await call(`/v1/formatter.json?${formatterQuery}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('cache-control'), /public/u);
  assert.equal(await response.text(), stringifyExport(generateFormatter({
    style: 'classic', quality: 'source', languageMode: 'off', seadexMode: 'split', filenameMask: 0,
  })));
});

test('serves carrier-specific Fusion JSON byte-for-byte and supports HEAD', async () => {
  const response = await call(`/v1/fusion.json?${fusionQuery.replace('00', '1d')}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), generateFusionExport({
    badgeFamily: 'modern', quality: 'source', languageBadges: false,
    sourceBadgeStyle: 'detailed', seadexMode: 'split', icon: 'colored',
    dolbyProfile: 'compact-separate', hdrPolicy: 'suppress-with-dv',
  }, {filenameMask: 0x1d}));

  const head = await call(`/v1/fusion.json?${fusionQuery}`, {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('rejects unsafe methods, routes, enum values, masks, and irrelevant language bits', async () => {
  assert.equal((await call(`/v1/fusion.json?${fusionQuery}`, {method: 'POST'})).status, 405);
  assert.equal((await call('/v1/missing.json')).status, 404);
  assert.equal((await call(`/v1/fusion.json?${fusionQuery.replace('quality=source', 'quality=nope')}`)).status, 400);
  assert.equal((await call(`/v1/fusion.json?${fusionQuery.replace('filenameMask=00', 'filenameMask=40')}`)).status, 400);
  assert.equal((await call(`/v1/fusion.json?${fusionQuery.replace('filenameMask=00', 'filenameMask=20')}`)).status, 400);
  assert.equal((await call(`/v1/fusion.json?${fusionQuery.replace('badgeFamily=modern', 'badgeFamily=legacy').replace('sourceBadgeStyle=detailed', 'sourceBadgeStyle=icon-only')}`)).status, 400);
});

test('answers CORS preflight and never reflects arbitrary asset origins', async () => {
  const preflight = await call('/v1/fusion.json', {method: 'OPTIONS'});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');
  const injected = await call(`/v1/fusion.json?${fusionQuery}&assetBase=https://evil.example/`);
  assert.equal(injected.status, 400);
});
