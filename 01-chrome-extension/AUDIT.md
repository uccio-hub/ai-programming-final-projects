# Audit — Aurora Focus Chrome Extension

Audit date: **19 November 2026**  
Follow-up audit: **26 November 2026**  
Scope: repository contents, privacy, exclusions, documentation, setup reproducibility and static validation.

## How the audit was run

The publication audit prompt from the course submission guidelines was run from the root of this project folder (`01-chrome-extension`), with ChatGPT Plus on 19 November and with Claude on 26 November. The assistant was asked not to print secret values, modify files, execute project code, commit or push. Its findings were reviewed one by one; the tables below record which ones required action and what was done. Finding no issues would not prove the project safe, so the checks were repeated after each round of fixes.

## 1. Baseline audit

| Check | Initial finding | Decision |
|---|---|---|
| Secrets/personal data | No API keys, passwords, tokens or personal datasets found. | Keep local-first architecture. |
| Generated/unnecessary files | Source folder contained only code and intentional image/icon assets. | Add a small project `.gitignore` for editor/OS/log files. |
| Dependencies | No package dependencies; Chrome is the runtime. | State this explicitly in Setup. |
| Setup/configuration | Installation steps existed but did not explain the exact folder to select or how to reload changes. | Expand numbered setup and requirements. |
| Required README topics | Features and privacy were documented; Purpose, Data collection, persistence, interaction, learning, limitations and assistance were not all explicit headings. | Reorganize the README around the assessment criteria. |
| Demonstration | No screenshot was stored in the project folder. | Add `docs/aurora-dashboard.png`. |
| Validation | A manual checklist existed in the technical report but not in the main README. | Add static commands and an evaluator-facing manual checklist. |

## 2. Changes made

- rewrote `README.md` with every required assessment heading;
- documented the difference between `localStorage`, `chrome.storage.local` and `chrome.alarms`;
- clarified Developer Mode, **Load unpacked**, the correct folder and reload behavior;
- documented keyboard shortcuts, permissions, privacy, limitations and AI assistance;
- added a screenshot and links to the detailed report and this audit;
- planned a project-level `.gitignore` (it was only actually added in the follow-up audit, see section 6).

## 3. Re-check

| Verification | Result |
|---|---|
| `node --check dashboard.js` | Pass |
| `node --check background.js` | Pass |
| `python -m json.tool manifest.json` | Pass |
| Manifest V3 and least-privilege permissions | Confirmed: `storage`, `alarms`, `notifications` only |
| Remote scripts/analytics | None found |
| Required README sections and screenshot | Present |

## 4. Manual verification completed

The unpacked extension was reloaded in Chrome on 19 November 2026 with no runtime error. Opening the dashboard from the toolbar, daily-goal persistence, task persistence across tabs, focus timer start/pause/resume/reset controls and completed-task statistics were verified successfully. The completion notification was verified on 20 November 2026 and is shown in the README screenshots. Export and full storage deletion remain optional edge-case checks.

## 5. Remaining limitations

Data does not synchronize between browser profiles, clearing storage removes unexported information, and the extension is not distributed through the Chrome Web Store. These are disclosed in the README rather than hidden.

## 6. Follow-up audit — 26 November 2026

The audit prompt was run again on the final repository, after the last commits of 25 November.

| Finding | Type | Action |
|---|---|---|
| This file said a project `.gitignore` had been added, but none existed in the folder. | Confirmed | Added `01-chrome-extension/.gitignore` (editor/OS files, logs, exported data). |
| This file said the new-tab override had been verified, but `manifest.json` had no `chrome_url_overrides`; the dashboard only opened from the toolbar. | Confirmed | Added `chrome_url_overrides.newtab` so Aurora replaces the new tab page like Momentum, and corrected section 4. |
| The notification was described as unverified here, while the README screenshot and the evidence PDF show it verified. | Confirmed | Aligned section 4 with the evidence. |
| The README Learning section did not describe a challenge and how it was approached. | Confirmed | Added a "Challenge and how I approached it" subsection. |
| Data collection did not apply but was not marked "Not applicable". | Confirmed | Marked it explicitly. |
| Secrets, analytics, remote code, extra permissions | None found | No action. |

Re-check after fixes: `node --check dashboard.js` and `node --check background.js` pass; `manifest.json` parses as JSON and still declares only `storage`, `alarms` and `notifications`.

Manual check after the fixes (26 November 2026): the unpacked extension was reloaded in Chrome and a new tab opened the Aurora dashboard.
