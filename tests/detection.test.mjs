import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeFilenameMask,
  encodeFilenameMask,
  planDetection,
} from '../src/detection.mjs';
import {markerFragmentsForPlan, visibleFormatter} from '../src/formatters.mjs';
import {markerIdsInText} from '../src/protocol.mjs';

const sourceSelection = Object.freeze({
  requestedMode: 'markers',
  quality: 'source',
  languageMode: 'off',
  seadexMode: 'split',
});

test('encodes the six public filename carrier bits in their documented order', () => {
  assert.equal(encodeFilenameMask(['resolution', 'visual', 'languages']), 0b100101);
  assert.deepEqual(decodeFilenameMask(0b111111), [
    'resolution', 'source', 'visual', 'audio', 'channels', 'languages',
  ]);
  assert.throws(() => decodeFilenameMask(64), /six-bit filename mask/i);
});

test('rejects invalid planner selections instead of silently changing public input', () => {
  const base = visibleFormatter('classic');
  assert.throws(() => planDetection(base, {...sourceSelection, quality: 'unknown'}), /unknown quality/i);
  assert.throws(() => planDetection(base, {...sourceSelection, languageMode: 'unknown'}), /unknown language mode/i);
  assert.throws(() => planDetection(base, {...sourceSelection, seadexMode: 'unknown'}), /unknown SeaDex mode/i);
  assert.throws(() => planDetection(base, {
    ...sourceSelection,
    requestedMode: 'custom',
    filenameCategories: ['resolution', 'unknown'],
  }), /unknown detection category/i);
});

test('Markers keeps selected facts in description when the formatter fits', () => {
  const base = visibleFormatter('classic');
  const plan = planDetection(base, sourceSelection);

  assert.equal(plan.fit, true);
  assert.equal(plan.filenameMask, 0);
  assert.deepEqual(plan.filenameCategories, []);
  assert.deepEqual(plan.markerCategories, [
    'resolution', 'source', 'visual', 'audio', 'channels', 'seadex',
  ]);
  assert.deepEqual(plan.automaticallyMoved, []);
  assert.equal(plan.finalDescriptionCharacters, base.description.length + plan.requiredMarkerCharacters);

  const ids = markerIdsInText(markerFragmentsForPlan(plan).map(({expression}) => expression).join(''));
  assert(ids.includes(0) && ids.includes(34));
  assert.equal(ids.includes(3), false, 'tiers were not selected');
  assert.equal(ids.includes(35), false, 'score bands were not selected');
  assert.equal(ids.includes(38), false, 'percentages were not selected');
});

test('Filename moves every eligible category but retains state-only facts as markers', () => {
  const plan = planDetection(visibleFormatter('classic'), {
    ...sourceSelection,
    requestedMode: 'filename',
    languageMode: 'languages',
  });

  assert.equal(plan.filenameMask, 63);
  assert.deepEqual(plan.markerCategories, ['seadex']);
  assert.equal(plan.markerOnlyReasons.seadex.length > 0, true);
  assert.equal(plan.requiredMarkerCharacters, 84);
});

test('Preferred Only language semantics never move to filename detection', () => {
  const plan = planDetection(visibleFormatter('classic'), {
    ...sourceSelection,
    requestedMode: 'filename',
    languageMode: 'uLanguages',
  });

  assert.equal(plan.filenameMask, 31);
  assert(plan.markerCategories.includes('languages'));
  assert.match(plan.markerOnlyReasons.languages, /preferred/i);
});

test('automatic overflow follows languages, channels, audio, visual, source, resolution', () => {
  const roomy = planDetection({name: '', description: 'd'.repeat(3200)}, {
    ...sourceSelection,
    languageMode: 'languages',
  });
  assert.deepEqual(roomy.automaticallyMoved, ['languages']);
  assert.equal(roomy.filenameMask, 32);

  const tighter = planDetection({name: '', description: 'd'.repeat(4300)}, {
    ...sourceSelection,
    languageMode: 'languages',
  });
  assert.deepEqual(tighter.automaticallyMoved.slice(0, 3), ['languages', 'channels', 'audio']);
  assert.equal(tighter.fit, true);
});

test('uses the inclusive 5000-character description boundary without borrowing name capacity', () => {
  const reference = planDetection({name: '', description: ''}, sourceSelection);
  const exact = planDetection({name: 'n'.repeat(5000), description: 'd'.repeat(5000 - reference.requiredMarkerCharacters)}, sourceSelection);
  assert.equal(exact.fit, true);
  assert.equal(exact.finalDescriptionCharacters, 5000);

  const impossible = planDetection({name: '', description: 'd'.repeat(5000)}, {
    ...sourceSelection,
    quality: 'best-good-ok',
    seadexMode: 'split',
  });
  assert.equal(impossible.fit, false);
  assert.equal(impossible.availableMarkerCharacters, 0);
  assert(impossible.overageCharacters > 0);
});

test('Custom preserves requested filename categories and adds only the moves needed to fit', () => {
  const plan = planDetection({name: '', description: 'd'.repeat(4300)}, {
    ...sourceSelection,
    requestedMode: 'custom',
    languageMode: 'languages',
    filenameCategories: ['visual'],
  });

  assert(plan.filenameCategories.includes('visual'));
  assert.deepEqual(plan.automaticallyMoved.slice(0, 2), ['languages', 'channels']);
});

test('round-trips every custom mask for every built-in when no capacity fallback is needed', () => {
  for (const style of ['classic', 'filename', 'renoria', 'jeor', 'snoak']) {
    for (let filenameMask = 0; filenameMask < 64; filenameMask += 1) {
      const plan = planDetection(visibleFormatter(style), {
        requestedMode: 'custom', quality: 'source', languageMode: 'languages', seadexMode: 'off',
        filenameMask,
      });
      if (plan.automaticallyMoved.length === 0) assert.equal(plan.filenameMask, filenameMask, `${style}: ${filenameMask}`);
      assert.equal(plan.fit, true, `${style}: ${filenameMask}`);
    }
  }
});
