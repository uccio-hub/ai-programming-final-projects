# Scene — TV Show Explorer

Scene is a responsive, dependency-free web application built on the public
[TVmaze REST API](https://www.tvmaze.com/api). A search word returns all related
shows; every result can then be explored through a complete profile containing
episodes, seasons, cast, crew, images, alternative titles and API metadata.

## Why this project stands out

- Live suggestions while typing and a five-item recent-search history
- Filters for genre, status and language, plus four sorting modes
- Persistent watchlist stored locally in the browser
- Detailed profiles assembled concurrently from eight TVmaze endpoints
- Complete episode guide including specials, cast, crew and image gallery
- Shareable deep links for both searches and individual shows
- Short-lived response cache with cached-data fallback during network problems
- Safe rendering of API text and validation of external URLs
- Responsive interface, keyboard shortcut (`/`) and reduced-motion support
- Raw combined JSON view exposing every field used by the application
- Automated static checks with Node's built-in test runner

## Run locally

No API key, installation or build step is required.

```powershell
cd 03-tvmaze-explorer
py -m http.server 5500
```

Open [http://localhost:5500](http://localhost:5500). Stop the server with
`Ctrl+C`.

## Tests

With Node.js installed:

```powershell
npm test
```

The checks validate the project structure, DOM contracts, endpoint coverage,
security safeguards and advanced features.

## API endpoints

| Purpose | Endpoint |
|---|---|
| Search | `/search/shows?q=:query` |
| Show | `/shows/:id` |
| Episodes | `/shows/:id/episodes?specials=1` |
| Seasons | `/shows/:id/seasons` |
| Cast | `/shows/:id/cast` |
| Crew | `/shows/:id/crew` |
| Alternative names | `/shows/:id/akas` |
| Gallery | `/shows/:id/images` |
| Alternative episode lists | `/shows/:id/alternatelists` |

The detailed profile uses `Promise.allSettled`: the main show request is
essential, while optional sections can still render if one secondary endpoint
is temporarily unavailable.

## Architecture

- `index.html` — semantic structure, templates and accessible controls
- `styles.css` — design system, responsive layout and interaction states
- `app.js` — API client, cache, state, filters and UI rendering
- `tests/` — automated source-level checks
- `PROJECT_REPORT.md` — design decisions, data flow and future work

The project intentionally uses plain HTML, CSS and JavaScript. This keeps the
runtime small and makes the API integration and state management fully visible.

## Privacy and data

The app has no authentication and sends no personal information to a custom
backend. Watchlist and recent searches remain in the browser through
`localStorage`; API responses are cached for 30 minutes in `sessionStorage`.

## Credits

Data and images are provided by [TVmaze](https://www.tvmaze.com/). This is an
educational project and is not affiliated with TVmaze.
