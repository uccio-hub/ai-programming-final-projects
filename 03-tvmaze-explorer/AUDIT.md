# Audit — Scene TVmaze Explorer

Audit date: **19 November 2026**  
Scope: secrets, dependencies, API handling, browser persistence, UI behavior, documentation and automated checks.

## 1. Baseline audit

| Check | Initial finding | Decision |
|---|---|---|
| Secrets/personal data | No API key is required; no secret, account or personal dataset found. | Explicitly document that TVmaze is public and keyless. |
| Dependencies/exclusions | Runtime has no dependencies; `node_modules`, logs, editor and OS files are ignored. | Retain the minimal setup and optional Node test requirement. |
| API coverage | Search plus eight show-detail resources are represented. | Document endpoints in the main README. |
| Resilience/security | Request cancellation, partial results, cache fallback, text escaping and URL validation are implemented. | Surface these choices for evaluation. |
| UI issue | Live suggestions could appear clipped at the boundary between the hero and catalogue sections. | Change stacking/overflow rules and add a regression check. |
| Required README topics | Run instructions and privacy existed; collection, interaction, learning, limitations and assistance were not all explicit. | Reorganize the README around the rubric. |
| Demonstration | No screenshot was stored in the project folder. | Add the search demonstration image. |

## 2. Changes made

- fixed suggestion visibility by allowing the hero to overflow, raising the search layer and keeping the suggestions list internally scrollable;
- extended the automated stylesheet check to protect the fix;
- rewrote `README.md` with all required headings and a complete evaluator setup;
- documented every API resource, storage lifetime, partial failure behavior and user interaction;
- added learning, limitations, assistance and screenshot evidence.

## 3. Re-check

Command:

```bash
npm test
```

Result on 19 November 2026: **5 tests passed, 0 failed**.

The checks cover essential DOM contracts, required TVmaze resources, advanced features, defensive API rendering, responsive design and reduced-motion styles. JavaScript syntax also passed as part of the project checks.

## 4. Manual verification completed

The live application was served locally on 19 November 2026. API availability, search suggestions, visible suggestion overflow, result cards, detailed show information, cast, crew, seasons, episodes and watchlist persistence after refresh were verified successfully. A no-result query and offline-after-cache behavior remain optional resilience checks rather than core completion blockers.

## 5. Remaining limitations

The application depends on TVmaze availability and result quality, caches only within a tab, stores watchlists only in one browser profile, and does not include service-worker offline installation or live-API end-to-end automation. These limitations are disclosed in the README.
