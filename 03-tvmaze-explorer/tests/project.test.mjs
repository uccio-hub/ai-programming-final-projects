import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('essential UI contracts are present', () => {
  for (const id of ['search-form', 'search-input', 'results-grid', 'detail-modal', 'watchlist-button', 'search-suggestions']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(js, new RegExp(`#${id}`));
  }
});

test('all requested TVmaze resources are integrated', () => {
  for (const endpoint of ['/search/shows', '/episodes?specials=1', '/seasons', '/cast', '/crew', '/akas', '/images', '/alternatelists']) {
    assert.ok(js.includes(endpoint), `Missing endpoint: ${endpoint}`);
  }
});

test('advanced product features are implemented', () => {
  for (const feature of ['localStorage', 'sessionStorage', 'AbortController', 'navigator.share', 'showWatchlist', 'requestSuggestions']) {
    assert.ok(js.includes(feature), `Missing feature: ${feature}`);
  }
});

test('API content is rendered defensively', () => {
  assert.ok(js.includes('escapeHtml(stripHtml(show.summary)'));
  assert.ok(js.includes('safeUrl(show.officialSite)'));
  assert.ok(!js.includes('${show.summary ||'), 'Raw API summary must not be injected into HTML');
  assert.ok(!js.includes('Object.groupBy'), 'Avoid unsupported Object.groupBy');
});

test('responsive and reduced-motion styles exist', () => {
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test('search suggestions are not clipped by the hero (regression)', () => {
  assert.match(css, /\.hero\s*\{\s*overflow:\s*visible;?\s*\}/, 'The hero must let the suggestions overflow');
  assert.match(css, /\.suggestions\s*\{[^}]*z-index:\s*\d+/, 'Suggestions need their own stacking layer');
  assert.match(css, /\.suggestions\s*\{[^}]*max-height:[^}]*overflow:\s*auto/, 'Long suggestion lists must scroll internally');
});
