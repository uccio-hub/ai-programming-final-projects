# Audit — Scene TVmaze Explorer

I ran the course audit prompt from this folder with ChatGPT Plus (19 November 2026) and again with Claude on the final repository (26 November 2026). Below is each issue I fixed. The TVmaze API needs no key, so there were no secrets to protect.

## 1. Search suggestions were cut off

- **What was wrong:** the live suggestion list was clipped where the hero section ended, so the first interaction looked broken.
- **How I fixed it:** in `styles.css` I let the hero overflow, stopped its decorative layer from capturing clicks, gave the suggestions their own layer and made long lists scroll inside a fixed height.
- **How it looks now:** the full list appears above the next section and scrolls when it is long.

## 2. Nothing protected that fix

- **What was wrong:** a later CSS change could break the suggestions again without anyone noticing.
- **How I fixed it:** I added a regression test in `tests/project.test.mjs` that checks the overflow, layer and scrolling rules.
- **How it looks now:** `npm test` passes 6/6, and the new test fails if I undo the fix.

## 3. The README did not explain the API or the tests

- **What was wrong:** the endpoints, caching and error handling were not explained, the tests sounded like full functional tests, and learning and a challenge were missing.
- **How I fixed it:** I listed the nine endpoints, explained cancellation, caching and partial failures, said that the tests are static source checks, and added learning, challenge, limitations and screenshots.
- **How it looks now:** a reader can see how the app uses the API and what the tests do and do not prove.

## Checks after the fixes

- `npm test`: 6 passed, 0 failed.
- Manual check with the live API: suggestions, filters, show details, episodes, cast, crew, gallery and the watchlist after a refresh.

## Still limited

Searches need TVmaze and an internet connection. The watchlist is stored in one browser only.
