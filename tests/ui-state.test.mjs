import assert from 'node:assert/strict';
import test from 'node:test';

import {DEFAULT_STATE, detectionCategoryLabel, resolveSelection} from '../src/ui-state.mjs';
import {markerIdsInText} from '../src/protocol.mjs';

test('labels the language detection carrier by its selected semantics', () => {
  assert.equal(detectionCategoryLabel('languages', 'uLanguages'), 'Languages (Preferred)');
  assert.equal(detectionCategoryLabel('languages', 'languages'), 'Languages (Detected)');
  assert.equal(detectionCategoryLabel('resolution', 'uLanguages'), 'Resolution');
});

test('resolves the default UI state to a matched formatter and Fusion pair', () => {
  const selected = resolveSelection(DEFAULT_STATE);
  assert.equal(DEFAULT_STATE.priority, 'dv');
  assert.equal(selected.dolbyProfile, 'compact-dv-combined');
  assert.equal(selected.badgeFamily, 'modern');
  assert.equal(selected.icon, 'colored');
  assert.equal(selected.pairingPriorityVisible, false);
  assert.equal(selected.quality, 'tiers');
  assert.equal(selected.formatterStyle, 'classic');
  assert.equal(selected.sourceBadgeStyle, 'detailed');
  assert.equal(selected.seadexMode, 'split');
  assert.equal(selected.detectionMode, 'markers');
  assert.match(selected.fusionUrl, /\/v1\/fusion\.json\?/);
  assert.match(selected.formatterUrl, /\/v1\/formatter\.json\?/);
  assert.equal(new URL(selected.fusionUrl).searchParams.get('filenameMask'), '00');
  assert.deepEqual(
    [...new Set(markerIdsInText(selected.markerSnippet).filter((id) => id >= 49))].sort((a, b) => a - b),
    Array.from({length: 29}, (_, index) => index + 49),
  );
});

test('normalizes Legacy selections to supported standalone badges', () => {
  const selected = resolveSelection({
    ...DEFAULT_STATE,
    badgeFamily: 'legacy',
    icon: 'mono',
    carrier: 'combined',
    dvAudio: 'combined',
    priority: 'dv',
  });
  assert.equal(selected.carrier, 'separate');
  assert.equal(selected.dvAudio, 'separate');
  assert.equal(selected.dolbyProfile, 'detailed-separate');
  assert.equal(selected.pairingPriorityVisible, false);
  assert.equal(new URL(selected.fusionUrl).searchParams.get('badgeFamily'), 'legacy');
  assert.equal(new URL(selected.formatterUrl).searchParams.get('style'), 'classic');
});

test('changes only the Fusion export when the badge family changes', () => {
  const modern = resolveSelection(DEFAULT_STATE);
  const legacy = resolveSelection({...DEFAULT_STATE, badgeFamily: 'legacy'});
  assert.notEqual(modern.fusionUrl, legacy.fusionUrl);
  assert.equal(modern.formatterUrl, legacy.formatterUrl);
  assert.equal(modern.markerSnippet, legacy.markerSnippet);
});

test('preserves the compact source preference while canonicalizing unsupported selections', () => {
  const compact = {...DEFAULT_STATE, sourceBadgeStyle: 'icon-only'};
  const modern = resolveSelection(compact);
  const legacy = resolveSelection({...compact, badgeFamily: 'legacy'});
  const scores = resolveSelection({...compact, quality: 'best-good-ok'});
  assert.equal(modern.sourceBadgeStyle, 'icon-only');
  assert.equal(modern.fusionConfiguration.sourceBadgeStyle, 'icon-only');
  assert.equal(legacy.sourceBadgeStyle, 'icon-only');
  assert.equal(legacy.fusionConfiguration.sourceBadgeStyle, 'detailed');
  assert.equal(scores.sourceBadgeStyle, 'icon-only');
  assert.equal(scores.fusionConfiguration.sourceBadgeStyle, 'detailed');
});

test('maps every SeaDex display mode to both members of the matched pair', () => {
  const formatterUrl = resolveSelection(DEFAULT_STATE).formatterUrl;
  for (const seadexMode of ['split', 'combined', 'off']) {
    const selected = resolveSelection({...DEFAULT_STATE, seadexMode});
    assert.equal(new URL(selected.fusionUrl).searchParams.get('seadexMode'), seadexMode);
    assert.equal(new URL(selected.formatterUrl).searchParams.get('seadexMode'), seadexMode);
    if (seadexMode !== DEFAULT_STATE.seadexMode) assert.notEqual(selected.formatterUrl, formatterUrl);
  }
});

test('shows pairing priority only for two overlapping combined choices', () => {
  const hidden = resolveSelection({...DEFAULT_STATE, carrier: 'combined', dvAudio: 'separate'});
  const shown = resolveSelection({...DEFAULT_STATE, carrier: 'combined', dvAudio: 'combined', priority: 'dv'});
  assert.equal(hidden.pairingPriorityVisible, false);
  assert.equal(shown.pairingPriorityVisible, true);
  assert.equal(shown.dolbyProfile, 'audio-combined-dv-priority');
});

test('removes languages from both sides of the matched pair', () => {
  const selected = resolveSelection({...DEFAULT_STATE, languageMode: 'off'});
  assert.equal(new URL(selected.fusionUrl).searchParams.get('languageMode'), 'off');
  assert.equal(new URL(selected.formatterUrl).searchParams.get('languageMode'), 'off');
  assert.equal(markerIdsInText(selected.markerSnippet).some((id) => id >= 49 && id <= 77), false);
});

test('keeps language modes explicit in both matched service URLs', () => {
  const all = resolveSelection({...DEFAULT_STATE, languageMode: 'languages'});
  const configured = resolveSelection({...DEFAULT_STATE, languageMode: 'uLanguages'});
  assert.notEqual(all.fusionUrl, configured.fusionUrl);
  assert.notEqual(all.formatterUrl, configured.formatterUrl);
  assert.match(all.markerSnippet, /stream\.languages/);
  assert.match(configured.markerSnippet, /stream\.uLanguages/);
});

test('changes the formatter URL for settings that change selected marker facts', () => {
  const base = resolveSelection(DEFAULT_STATE).formatterUrl;
  for (const change of [{quality: 'percentages'}, {seadexMode: 'off'}]) {
    assert.notEqual(resolveSelection({...DEFAULT_STATE, ...change}).formatterUrl, base);
  }
  for (const change of [{carrier: 'combined'}, {badgeFamily: 'legacy'}, {icon: 'mono'}]) {
    assert.equal(resolveSelection({...DEFAULT_STATE, ...change}).formatterUrl, base);
  }
});

test('explains each quality prerequisite', () => {
  assert.match(resolveSelection({...DEFAULT_STATE, quality: 'best-good-ok'}).prerequisite, /scored sorting/i);
  assert.match(resolveSelection({...DEFAULT_STATE, quality: 'percentages'}).prerequisite, /scored sorting/i);
  assert.match(resolveSelection({...DEFAULT_STATE, quality: 'tiers'}).prerequisite, /VidHin/i);
  assert.match(resolveSelection({...DEFAULT_STATE, quality: 'source'}).prerequisite, /does not require/i);
});

test('resolves a session custom formatter locally while keeping Fusion serverless', () => {
  const customFormatter = {name: 'Custom name', description: 'Custom description'};
  const selected = resolveSelection(
    {...DEFAULT_STATE, formatterStyle: 'custom'},
    {customFormatter},
  );
  assert.equal(selected.formatterStyle, 'custom');
  assert.equal(selected.formatterUrl, null);
  assert.equal(selected.formatter.name, customFormatter.name);
  assert(selected.formatter.description.length > customFormatter.description.length);
  assert.equal(selected.formatterAction, 'download');
  assert.match(selected.fusionUrl, /\/v1\/fusion\.json\?/);
});

test('exposes automatic filename moves and a persistent irreducible capacity error', () => {
  const moved = resolveSelection(
    {...DEFAULT_STATE, formatterStyle: 'custom', languageMode: 'languages'},
    {customFormatter: {name: 'Name', description: 'd'.repeat(4300)}},
  );
  assert(moved.plan.automaticallyMoved.length > 0);
  assert.notEqual(moved.plan.filenameMask, 0);
  assert.equal(new URL(moved.fusionUrl).searchParams.get('filenameMask'), moved.plan.filenameMask.toString(16).padStart(2, '0'));

  const impossible = resolveSelection(
    {...DEFAULT_STATE, formatterStyle: 'custom', detectionMode: 'filename', quality: 'tiers'},
    {customFormatter: {name: '', description: 'd'.repeat(5000)}},
  );
  assert.equal(impossible.plan.fit, false);
  assert.equal(impossible.formatter, null);
  assert.match(impossible.persistentError, /requires .* available.*name.*cannot be used/i);
});
