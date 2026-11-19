# Project report — Scene

## 1. Objective

The assignment required an interface that accepts a word, retrieves every
related television show and exposes all the information available through the
TVmaze API. Scene turns that requirement into a catalogue-style application
rather than a single search-result page.

## 2. User experience

The main journey has three levels:

1. The user receives suggestions while typing or reuses a recent search.
2. Results can be filtered, sorted and saved to a persistent watchlist.
3. A detail dialog combines show, episode, season, cast, crew, image and
   metadata resources without leaving the page.

Loading skeletons, empty states, error messages, API status and cached fallback
make the state of the application explicit. Search and show IDs are encoded in
the URL hash, so a specific result can be bookmarked or shared.

## 3. Data flow

```text
search term -> TVmaze search -> filters/sort -> result cards
                                      |
                                      v
                               selected show ID
                                      |
                                      v
                     parallel detail endpoint requests
                                      |
                                      v
                     tabbed profile + combined raw JSON
```

Search requests and suggestions use `AbortController`, preventing older,
slower responses from replacing newer ones. Detail requests use
`Promise.allSettled`, allowing a partially complete profile instead of failing
the entire view when an optional resource is unavailable.

## 4. State and persistence

Runtime state tracks the active query, source results, filtered results,
requests and detail cache. Browser storage has two deliberate roles:

- `localStorage`: watchlist and recent searches, persistent across sessions;
- `sessionStorage`: API response cache, scoped to the browser tab and limited
  to 30 minutes.

No secret or API key is present because TVmaze offers a public CORS-enabled API.

## 5. Security and resilience

- API summaries are converted to plain text before insertion.
- Dynamic text and attributes are escaped.
- External links accept only HTTP or HTTPS URLs.
- New-tab links use `noopener noreferrer`.
- Failed network calls can use previously cached data.
- Requests are cancelled when superseded.
- The UI handles missing images, dates, ratings and optional metadata.

## 6. Accessibility

The interface includes semantic forms and headings, labelled controls,
announced status messages, keyboard-operable buttons, focus-visible states and
a native dialog. The `/` shortcut focuses search, while the reduced-motion
media query respects the user's operating-system preference.

## 7. Verification

The automated checks confirm:

- required files and DOM elements exist;
- every detail endpoint is represented;
- watchlist, suggestions, cache and sharing are implemented;
- API summaries are not injected as raw HTML;
- modern code syntax remains valid.

Manual acceptance checks should cover desktop and mobile widths, an empty
query, a query with no results, watchlist persistence, a shareable show URL and
offline cached results.

## 8. Possible future development

- paginate the full TVmaze show index;
- add episode-level progress tracking;
- introduce service-worker precaching for a true installable PWA;
- add localisation and automated browser-level end-to-end tests.

