# AI Programming — Final Projects

This repository contains the final projects developed for the AI Programming course.

## Projects

| # | Project | Folder | Audit |
|---|---|---|---|
| 1 | Momentum Dash replica: **Aurora Focus** Chrome extension | [`01-chrome-extension/`](01-chrome-extension/) | [AUDIT.md](01-chrome-extension/AUDIT.md) |
| 2 | Books to Scrape: **Books Pipeline** with Supabase and the Leaf & Letter catalogue | [`02-books-scraper-supabase/`](02-books-scraper-supabase/) | [AUDIT.md](02-books-scraper-supabase/AUDIT.md) |
| 3 | TVmaze API: **Scene** show explorer | [`03-tvmaze-explorer/`](03-tvmaze-explorer/) | [AUDIT.md](03-tvmaze-explorer/AUDIT.md) |

Each project README covers purpose, data collection, data persistence, user interaction, setup, learning and limitations, with screenshots.

### 1. [Aurora Focus — Chrome Extension](01-chrome-extension/)

A Momentum-style new tab dashboard for Chrome featuring:

- Daily goals and task management
- Focus and break timers
- Ambient sounds
- Chrome notifications
- Weekly productivity statistics
- Activity streaks
- Local data storage and export
- Responsive and accessible interface

**Technologies:** HTML, CSS, JavaScript, Chrome Extension APIs and Manifest V3.

### 2. [Books Scraper and Supabase Application](02-books-scraper-supabase/)

A complete data pipeline that extracts book information, stores it in Supabase and displays it through a web application.

**Technologies:** Python, BeautifulSoup, Supabase, PostgreSQL, HTML, CSS and JavaScript.

### 3. [TVmaze Explorer](03-tvmaze-explorer/)

A responsive web application that searches television shows and displays detailed information obtained from the TVmaze API.

**Technologies:** REST API, JSON, HTML, CSS and JavaScript.

## Quick start

| Project | How to try it |
|---|---|
| 1 | Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `01-chrome-extension`, then open a new tab. |
| 2 | `cd 02-books-scraper-supabase` then `py -m http.server 5500 --directory web` (works offline with the included 1,000-book snapshot). |
| 3 | `cd 03-tvmaze-explorer` then `py -m http.server 5500`, and open http://localhost:5500. |

Full setup, including the Python pipeline and Supabase, is in each project's README.

## Repository structure

Each project is contained in a separate numbered folder with its own README, AUDIT.md, screenshots and, where needed, its own `.gitignore`. The root `.gitignore` excludes secrets, virtual environments, caches, dependencies and editor files for all projects.

## Author

Eustachio Santeramo
