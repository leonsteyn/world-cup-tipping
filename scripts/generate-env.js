/**
 * Runs at Netlify build time.
 * Writes js/env-config.js from environment variables so keys
 * are never committed to git.
 */
const fs = require('fs');
const path = require('path');

const url  = process.env.SUPABASE_URL      || '';
const key  = process.env.SUPABASE_ANON_KEY || '';

// Log clearly so Netlify build logs show what happened
console.log('[generate-env] SUPABASE_URL set:      ', !!url);
console.log('[generate-env] SUPABASE_ANON_KEY set: ', !!key);

if (!url || !key) {
  console.warn('[generate-env] WARNING: one or more variables are empty.');
  console.warn('  Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in');
  console.warn('  Netlify → Site configuration → Environment variables');
  console.warn('  and that the "Builds" scope is enabled for both.');
}

const content = `// Auto-generated at build time by scripts/generate-env.js — do not edit or commit.
const SUPABASE_URL = "${url}";
const SUPABASE_ANON_KEY = "${key}";
`;

const outPath = path.join(__dirname, '..', 'js', 'env-config.js');
fs.writeFileSync(outPath, content, 'utf8');
console.log('[generate-env] Written to js/env-config.js ✓');
