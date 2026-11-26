# Audit — Books Pipeline & Leaf & Letter

I ran the course audit prompt from this folder with ChatGPT Plus (19 November 2026) and again with Claude on the final repository (26 November 2026). Below is each issue I fixed.

## 1. The server secret had been exposed outside the repository

- **What was wrong:** my Supabase server secret appeared in a screenshot I shared in a private AI chat. It was never committed, but it could no longer be trusted.
- **How I fixed it:** I rotated the secret in Supabase and kept the new value only in my local `.env`, which is ignored by Git. `.env.example` contains placeholders only.
- **How it looks now:** the old key does not work, and no secret appears in tracked files or Git history. The browser uses only the publishable key, and RLS (`frontend_access.sql`) limits it to reading.

## 2. The fallback catalogue could not be rebuilt

- **What was wrong:** `web/data/books-fallback.json` was committed, but no script could generate it again, so it would go stale.
- **How I fixed it:** I added an `--export-json PATH` option to `pipeline.py` and `scraper.py`, plus a unit test for it.
- **How it looks now:** `py pipeline.py --export-json web/data/books-fallback.json` refreshes the file in the same run that updates Supabase.

## 3. A screenshot showed a personal detail

- **What was wrong:** `docs/pipeline-complete.png` showed my Windows user folder in the terminal prompt.
- **How I fixed it:** I cropped the image.
- **How it looks now:** it shows only the pipeline output.

## 4. The README was hard to follow

- **What was wrong:** the offline and Supabase steps were mixed, the commands did not say which folder to run them from, and learning, limitations and a challenge were missing.
- **How I fixed it:** I split the setup into five stages starting with `cd 02-books-scraper-supabase`, and added the learning, challenge and limitations sections. The limitations include the source's odd "Default" and "Add a comment" categories.
- **How it looks now:** the catalogue can be tried offline in one command, and the full pipeline step by step.

## Checks after the fixes

- Unit tests: 6 passed, 0 failed (`py -m unittest discover -s tests`).
- `test_connection.py`: temporary row written, read and deleted.
- `py pipeline.py --limit 10`: ran successfully against Supabase.
- Manual check of the catalogue: search, filters, details, saved books.

## Still limited

The scraper depends on the site's current HTML. Supabase free projects can pause; the fallback keeps the catalogue usable.
