# Audit — Books Pipeline & Leaf & Letter

Audit date: **19 November 2026**  
Scope: secrets, data files, dependencies, scraper/database/frontend documentation, tests and reproducibility.

## 1. Baseline audit

| Check | Initial finding | Decision |
|---|---|---|
| Secrets/personal data | Final source folder contained `.env.example` placeholders only. `web/config.js` contains a publishable browser key, not a server secret. | Keep the publishable key but explain the trust boundary; require the secret only in ignored `.env`. |
| Exclusions | `.env`, virtual environments, caches, generated CSV and editor files were already ignored. | Retain and verify the rules. |
| Generated data | `books-fallback.json` is intentionally committed: it is the reproducible 1,000-record demo snapshot, not a cache accident. | Document why it belongs in the repository. |
| Dependencies | `requirements.txt` exists. The audit environment lacked `bs4` before installation. | Make environment creation/installation the first setup step and record the limitation honestly. |
| Setup/configuration | Python, Supabase and web setup existed, but the fallback-only path and secret/publishable-key distinction could be clearer. | Split setup into five numbered stages. |
| Required README topics | Architecture was strong; learning, assistance and limitations were mainly in a separate report. | Move explicit assessment sections into the main README. |
| Demonstration | No evidence image was stored with the project. | Add the successful 1,000-row pipeline screenshot. |

## 2. Security review

- searched source/configuration for server secrets and private-key markers;
- confirmed `.env` is excluded and `.env.example` contains placeholders;
- confirmed the frontend uses a publishable key and `frontend_access.sql` grants anonymous `SELECT` only;
- confirmed `schema.sql` reserves write operations for the service role;
- documented that screenshots must never reveal `.env` values.

If a real server secret was ever committed to any Git history, deleting the file is not sufficient: rotate the secret in Supabase and remove it from repository history before publishing.

## 3. Changes made

- rewrote `README.md` around Purpose, collection, persistence, interaction, setup, learning, limitations and assistance;
- explained atomic CSV writing, idempotent UPC upserts, fallback JSON and browser-local saved books;
- added separate offline/fallback and live-Supabase instructions;
- added a successful pipeline screenshot;
- added explicit limitations for source fragility, cloud pausing, network dependence and stale snapshots.

## 4. Re-check

| Verification | Result |
|---|---|
| `python -m py_compile pipeline.py scraper.py supabase_client.py test_connection.py` | Pass |
| Required configuration example | Present, placeholders only |
| Secret/generated-file ignore rules | Present |
| Fallback catalogue size | 1,000 records included |
| `python -m unittest discover -s tests -v` | Pass: 5 tests run, 0 failures |
| `test_connection.py` live Supabase smoke test | Pass: temporary row written, read and removed |
| `pipeline.py --limit 10` | Pass: 10 scraped, 0 failures, 10 rows synced; 1,000 rows in table |
| Frontend manual test | Pass: live data, search, filters, detail view and saved-book persistence verified |

## 5. Follow-through completed

The submission computer was configured with an isolated virtual environment and the required dependencies. The unit suite, live connection test, 10-book pipeline sample and browser interface were all verified on 19 November 2026. Credential values were not recorded in the evidence.

## 6. Remaining limitations

HTML selectors may break if the source changes; Supabase can pause; the fallback becomes stale; and there is no scheduler, monitoring or incremental crawler. These are now disclosed in the README.
