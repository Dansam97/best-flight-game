// Canyon Courier — the hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop browser
// loads offline, no build step and no network request. This program hands it
// in: it copies game/ and screenshots/ from beside this file into the output
// directory and writes dossier.json, the summary the judge reads, with the
// vendored make.fun game library.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's own caps: at most 4 screenshots of at most 256 KiB each, at
// most 993 files and 48 MiB under game/, no game/ path over 1000 bytes, and
// the dossier's source outline capped at 160 KiB of text.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
