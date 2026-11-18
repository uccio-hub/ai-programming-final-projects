# Aurora Focus — Productivity Dashboard v4.1

This version does **not** replace Chrome's New Tab page.

## Install

1. Extract the ZIP file.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extracted `aurora_focus_v4` folder containing `manifest.json`.

## Open Aurora

Click the Extensions puzzle icon in Chrome, pin **Aurora Dashboard**, then click its icon whenever you want to open the dashboard.

The sparkle button in the top-right cycles through the three included backgrounds.

## Main features

- Goal of the day
- Persistent to-do list with task editing and daily completion tracking
- Focus and break modes with presets or a custom duration
- Soft rain, brown noise or generated calm focus music
- Optional full-screen focus view and keyboard shortcuts
- Timer persistence and Chrome completion notifications
- Seven-day focus analytics, completed-task count and activity streak
- Personal settings, 12/24-hour clock and data export
- Three locally bundled backgrounds
- First-run onboarding that explains the product and its privacy model

## Technical highlights

- Chrome Manifest V3
- Service worker, `chrome.alarms`, `chrome.notifications` and `chrome.storage`
- Local-first data model: no account, tracking or external server
- Web Audio API for sounds generated entirely in the browser
- Responsive and accessible interface

## Keyboard shortcuts

- `F`: open focus mode
- `N`: add a task
- `Space`: start or pause the timer while focus mode is open
- `Esc`: exit full screen

## Privacy

Aurora does not send personal information anywhere. Goals, tasks, settings and statistics remain in the extension's local browser storage. Users can export or delete their data from Settings.

Chrome always allows the user to leave full screen with Esc or close the tab. Extensions cannot lock the computer or prevent navigation.
