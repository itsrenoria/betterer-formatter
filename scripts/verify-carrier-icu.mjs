import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {allFusionConfigurations} from '../src/configuration.mjs';
import {generateFusionExport} from '../src/fusion.mjs';
import {stringifyExport} from '../src/protocol.mjs';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'betterformatter-icu-'));
try {
  const unique = new Map();
  for (const configuration of allFusionConfigurations()) {
    for (let filenameMask = 0; filenameMask < 64; filenameMask += 1) {
      for (const filter of generateFusionExport(configuration, {filenameMask}).filters) {
        if (!unique.has(filter.pattern)) unique.set(filter.pattern, {...filter, id: `pattern-${unique.size + 1}`});
      }
    }
  }
  fs.writeFileSync(path.join(temporary, 'carrier-patterns.json'), stringifyExport({filters: [...unique.values()], groups: []}));
  execFileSync('swift', ['scripts/verify-icu.swift', temporary], {stdio: 'inherit'});
  process.stdout.write(`Verified ${unique.size.toLocaleString('en-US')} unique patterns across all 64 filename masks.\n`);
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
