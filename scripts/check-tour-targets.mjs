#!/usr/bin/env node
/**
 * Guided tours rot silently. A renamed route or a deleted button leaves a step
 * pointing at nothing, and nobody finds out until a reader watches the card
 * hang. This check is what stops that: every registered anchor must be rendered
 * somewhere, every anchor a tour references must be registered, and the step
 * counts the launcher promises must match the definitions.
 *
 * Run from UI/web:  node scripts/check-tour-targets.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const TARGETS_FILE = join(SRC, 'tour/engine/targets.ts');
const TOURS_DIR = join(SRC, 'tour/tours');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

const errors = [];

/* ---- 1. the registry ---------------------------------------------------- */
const registrySource = readFileSync(TARGETS_FILE, 'utf8');
const targets = new Map();
for (const match of registrySource.matchAll(/'([\w.]+)':\s*'([\w-]+)',/g)) {
  targets.set(match[1], match[2]);
}
if (targets.size === 0) errors.push('No targets found in tour/engine/targets.ts.');

/* ---- 2. every registered anchor is rendered ----------------------------- */
const files = walk(SRC).filter((f) => f !== TARGETS_FILE);
const sources = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));

const rendering = sources.filter(({ file }) => !file.includes(`${SRC}/tour/`));
for (const [id, attr] of targets) {
  const rendered = rendering.some(
    ({ text }) => text.includes(`'${attr}'`) || text.includes(`"${attr}"`),
  );
  if (!rendered) {
    errors.push(`Anchor "${id}" (data-tour="${attr}") is registered but nothing renders it.`);
  }
}

/* ---- 3. an anchor on a component must actually reach the DOM ------------ */
/**
 * TypeScript allows any hyphenated attribute on any JSX element, components
 * included — so `<Callout data-tour="…">` compiles, the attribute is silently
 * dropped unless that component forwards it, and the tour then points at
 * nothing. The grep above still passes, because the string is in the source.
 *
 * These are the components known to spread the rest of their props onto a DOM
 * node. Anything else must take an explicit `tour` prop.
 */
const FORWARDS_PROPS = new Set([
  'Button',
  'LinkButton',
  'ExternalButton',
  // react-router renders a real <a> and spreads the rest onto it.
  'Link',
  'NavLink',
]);

for (const { file, text } of sources) {
  let at = text.indexOf('data-tour=');
  while (at !== -1) {
    // Walk back to the tag this attribute belongs to. Linear, and it cannot
    // run away on a long file the way a lazy regex can.
    const open = text.lastIndexOf('<', at);
    if (open !== -1) {
      const tag = /^<([A-Za-z][\w.]*)/.exec(text.slice(open, open + 40))?.[1];
      if (tag && /^[A-Z]/.test(tag) && !FORWARDS_PROPS.has(tag)) {
        errors.push(
          `${relative(ROOT, file)}: <${tag} data-tour=…> is dropped — ${tag} does not forward ` +
            'unknown props. Give it a `tour` prop that renders data-tour, or anchor a DOM element.',
        );
      }
    }
    at = text.indexOf('data-tour=', at + 1);
  }
}

/* ---- 4. every referenced anchor is registered --------------------------- */
const tourFiles = readdirSync(TOURS_DIR).filter((f) => f.endsWith('.tour.ts'));
const stepCounts = new Map();

for (const name of tourFiles) {
  const text = readFileSync(join(TOURS_DIR, name), 'utf8');
  const id = name.replace('.tour.ts', '');
  stepCounts.set(id, (text.match(/^\s{6}id: '/gm) ?? []).length);

  for (const match of text.matchAll(/(?:anchor|mobileAnchor):\s*'([\w.]+)'/g)) {
    const ref = match[1];
    if (ref === 'center') continue;
    if (!targets.has(ref)) {
      errors.push(`${name}: step anchor "${ref}" is not in TARGETS.`);
    }
  }
}

/* ---- 5. the launcher promises the real number of steps ------------------ */
const catalogue = readFileSync(join(TOURS_DIR, 'catalogue.ts'), 'utf8');
for (const match of catalogue.matchAll(/id: '(\w+)',[\s\S]*?steps: (\d+),/g)) {
  const [, id, promised] = match;
  const actual = stepCounts.get(id);
  if (actual === undefined) {
    errors.push(`catalogue.ts lists "${id}" but there is no ${id}.tour.ts.`);
  } else if (Number(promised) !== actual) {
    errors.push(`catalogue.ts promises ${promised} steps for "${id}" but it has ${actual}.`);
  }
}

/* ---- report ------------------------------------------------------------- */
if (errors.length > 0) {
  console.error(`\ncheck-tour-targets: ${errors.length} problem(s)\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error('');
  process.exit(1);
}

console.log(
  `check-tour-targets: ${targets.size} anchors, ${tourFiles.length} tours, all resolved.`,
);
