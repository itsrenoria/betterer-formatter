import assert from 'node:assert/strict';
import test from 'node:test';

import {planDetection} from '../src/detection.mjs';
import {visibleFormatter} from '../src/formatters.mjs';
import {PUBLIC_API_BASE, formatterServiceUrl, fusionServiceUrl} from '../src/service-urls.mjs';

const selection = Object.freeze({
  badgeFamily: 'modern', quality: 'tiers', languageMode: 'languages', formatterStyle: 'classic',
  sourceBadgeStyle: 'detailed', seadexMode: 'split', icon: 'colored',
  dolbyProfile: 'compact-dv-combined', hdrPolicy: 'suppress-with-dv',
});

test('builds canonical matched Worker URLs with a two-digit hexadecimal mask', () => {
  assert.equal(PUBLIC_API_BASE, 'https://betterformatter-json.itsrenoria.workers.dev/');
  const plan = planDetection(visibleFormatter('classic'), {
    requestedMode: 'filename', quality: 'tiers', languageMode: 'languages', seadexMode: 'split',
  });
  const base = 'https://betterformatter-json.example.workers.dev/';
  const formatter = new URL(formatterServiceUrl(selection, plan, base));
  const fusion = new URL(fusionServiceUrl(selection, plan, base));

  assert.equal(formatter.pathname, '/v1/formatter.json');
  assert.equal(fusion.pathname, '/v1/fusion.json');
  assert.equal(formatter.searchParams.get('filenameMask'), '3f');
  assert.equal(fusion.searchParams.get('filenameMask'), '3f');
  assert.deepEqual([...formatter.searchParams.keys()], ['style', 'quality', 'languageMode', 'seadexMode', 'filenameMask']);
});

test('never puts uploaded formatter content into a Fusion service URL', () => {
  const custom = {...selection, formatterStyle: 'custom', customFormatter: {name: 'secret', description: 'private'}};
  const plan = planDetection({name: 'secret', description: 'private'}, {
    requestedMode: 'markers', quality: 'tiers', languageMode: 'languages', seadexMode: 'split',
  });
  const url = fusionServiceUrl(custom, plan, 'https://worker.example/');
  assert.doesNotMatch(url, /secret|private|customFormatter/u);
});
