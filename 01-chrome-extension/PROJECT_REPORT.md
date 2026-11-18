# Aurora Focus v4 — Project report

## 1. Project objective

Aurora Focus is a Chrome extension designed to turn an optional browser dashboard into a private productivity environment. The project combines daily planning, task management, timed focus sessions and lightweight behavioural feedback without requiring an account or external server. A first-run onboarding flow explains the product's value, main workflow and privacy model before the user begins.

The core design question is: **how can a browser extension support focus without becoming another source of distraction?** Aurora answers with a low-friction interface, locally stored information and a dedicated full-screen session view.

## 2. Main user flow

1. The user opens the extension from the Chrome toolbar.
2. Aurora shows the current time, a personalised greeting and a daily goal.
3. The user adds or completes tasks.
4. Focus Mode starts a focus or break timer, optionally in full screen.
5. A Chrome alarm and notification mark the end of the session even when the dashboard is not in the foreground.
6. Completed sessions and tasks update the seven-day dashboard and activity streak.

## 3. Architecture

| Component | Responsibility |
| --- | --- |
| `manifest.json` | Manifest V3 configuration, permissions and icons |
| `background.js` | Toolbar behaviour, persistent alarms and Chrome notifications |
| `dashboard.html` | Semantic structure of the user interface |
| `styles.css` | Responsive glass interface, themes and reduced-motion support |
| `dashboard.js` | Goals, tasks, timer, statistics, settings, sounds and data export |
| `backgrounds/` | Locally bundled visual assets |
| `icons/` | Extension icons for Chrome and notifications |

The background service worker and dashboard communicate through `chrome.runtime.sendMessage`. The dashboard schedules an alarm when a session starts and clears it when the user pauses or resets the timer.

## 4. Data model

Aurora stores four main categories locally:

- **Goal:** text, date and completion status.
- **Task:** unique ID, text, creation timestamp, completion status and completion timestamp.
- **Focus session:** unique ID, completion timestamp, date and duration.
- **Settings:** default duration, time format and full-screen preference.

The timer also stores its mode, selected duration, remaining seconds and expected end timestamp. This allows the interface to reconstruct an active session after reopening.

## 5. Chrome APIs and browser technologies

- `chrome.action` opens the dashboard from the toolbar.
- `chrome.alarms` schedules timer completion independently from the page interval.
- `chrome.notifications` informs the user when a focus or break session ends.
- `chrome.storage.local` stores the service worker's active timer record.
- `localStorage` retains private dashboard data inside the extension origin.
- Fullscreen API creates a distraction-reduced session view.
- Web Audio API generates ambient sound without downloading or streaming audio.
- Blob and Object URL APIs export the user's data as JSON.

## 6. Privacy and security

Aurora is local-first. It does not use analytics, advertising, remote scripts, external accounts or a back-end database. Its permissions are limited to the features it implements: storage, alarms and notifications. All packaged scripts comply with Manifest V3's restriction against remotely hosted code.

## 7. Accessibility and usability

- Semantic forms, labels and ARIA descriptions are used for interactive controls.
- Keyboard shortcuts support the most common actions.
- Focus indicators and native form controls remain available.
- The layout adapts to smaller screens.
- `prefers-reduced-motion` disables decorative animation.
- Text is placed on dark overlays to preserve contrast across backgrounds.

## 8. Distinguishing features

The extension goes beyond a basic static new-tab clone through:

- background alarms and system notifications;
- persistent focus state;
- focus and break modes with custom durations;
- seven-day productivity statistics and streak calculation;
- editable daily tasks and automatic daily goal reset;
- generated ambient audio;
- configurable behaviour and privacy-friendly data export;
- complete technical and user documentation.

## 9. Manual testing checklist

- Load the unpacked extension without manifest errors.
- Click the toolbar icon and verify that the dashboard opens.
- Save, edit and complete the daily goal.
- Add, edit, complete and delete a task.
- Start, pause, resume and reset the timer.
- Verify focus and break modes and a custom duration.
- Close or change tabs during a short timer and verify the notification.
- Complete a focus session and confirm that insights update.
- Change settings, reload the dashboard and verify persistence.
- Export the local data file.
- Test keyboard shortcuts and reduced-motion mode.

## 10. Possible future development

Future iterations could add optional cross-device synchronisation, calendar integration, user-defined background uploads and a richer long-term analytics view. These features are intentionally excluded from this version to preserve the extension's small permission surface and local-first privacy model.
