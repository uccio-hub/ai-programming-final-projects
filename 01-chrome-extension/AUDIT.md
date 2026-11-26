# Audit — Aurora Focus

I ran the course audit prompt from this folder with ChatGPT Plus (19 November 2026) and again with Claude on the final repository (26 November 2026). Below is each issue I fixed. No secrets, analytics, remote scripts or personal data were found.

## 1. It did not behave like Momentum

- **What was wrong:** the dashboard only opened from the toolbar button. Momentum replaces the new tab page, so my replica missed its main behaviour.
- **How I fixed it:** I added `chrome_url_overrides.newtab` to `manifest.json`, pointing to `dashboard.html`.
- **How it looks now:** every new tab opens Aurora. The toolbar button still works. I checked it in Chrome after reloading the extension.

## 2. No `.gitignore` in the project folder

- **What was wrong:** nothing stopped editor files, OS files, logs or exported data from being committed by mistake.
- **How I fixed it:** I added `01-chrome-extension/.gitignore` for `.vscode/`, `.DS_Store`, `Thumbs.db`, `*.log` and exported `aurora-*.json` files.
- **How it looks now:** Git ignores these files, so only the source code and the intended images are tracked.

## 3. The README did not follow the required topics

- **What was wrong:** purpose, data, setup, learning and limitations were spread around. The setup did not say which folder to load, and there was no challenge or screenshot.
- **How I fixed it:** I reorganized the README by topic, marked data collection "Not applicable", added numbered setup steps, a challenge section, screenshots, and the source of the images.
- **How it looks now:** someone can load the extension by following steps 1–7 and find each required topic under its own heading.

## Checks after the fixes

- `node --check dashboard.js` and `node --check background.js` pass.
- `manifest.json` is valid and still asks only for `storage`, `alarms` and `notifications`.
- Manual check in Chrome: new tab, goals, tasks, focus and break timers, notification, settings.

## Still limited

Data stays in one browser profile and is lost if storage is cleared without an export. The extension must be loaded unpacked.
