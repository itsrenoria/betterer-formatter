import assert from 'node:assert/strict';
import test from 'node:test';

import {filenameDetectorForMarker, PRODUCTION_FILENAME_DETECTORS} from '../src/filename-detectors.mjs';
import {MARKERS as M} from '../src/protocol.mjs';

test('tracks one production filename detector for every filename-capable marker fact', () => {
  assert.equal(PRODUCTION_FILENAME_DETECTORS.length, 53);
  for (const detector of PRODUCTION_FILENAME_DETECTORS) {
    assert.match(detector.icuPattern, /^\(\?i\)/u);
    assert(['BetterFormatter', 'Our Filename Regex', 'SOL Regex'].includes(detector.method));
    assert.match(detector.provenance, /^https:\/\/github\.com\//u);
    assert(['number', 'object'].includes(typeof detector.score.rightWhenShown));
    assert(['number', 'object'].includes(typeof detector.score.foundWhenPresent));
  }
  assert.equal(filenameDetectorForMarker(M.IMAXEnhanced).score.rightWhenShown, null);
});

test('uses the approved detector method for resolution, ordinary languages, and Multi Dual', () => {
  assert.equal(filenameDetectorForMarker(M.Resolution4K).method, 'BetterFormatter');
  assert.equal(filenameDetectorForMarker(M.Resolution1080p).icuPattern, String.raw`(?i)\b1080[pi]?\b`);
  assert.equal(filenameDetectorForMarker(M.Web).method, 'Our Filename Regex');
  assert.equal(filenameDetectorForMarker(M.English).method, 'SOL Regex');
  assert.equal(filenameDetectorForMarker(M.MultiDual).method, 'Our Filename Regex');
});

test('keeps state-only facts out of the filename detector catalog', () => {
  for (const marker of [M.SeaDex, M.Tier1, M.Best, M.Score]) {
    assert.equal(filenameDetectorForMarker(marker), null);
  }
});
