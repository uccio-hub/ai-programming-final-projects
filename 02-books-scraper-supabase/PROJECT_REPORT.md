# Project Report — Books Pipeline & Leaf & Letter

## Objective

The objective was to build a complete data flow rather than an isolated scraper: collect a real catalogue, normalize it, store it in a cloud database, verify the connection, and expose the data through an interactive application.

## Engineering decisions

### Stable identity and idempotency

The source UPC is used as `book_id`. It is both the PostgreSQL primary key and the Supabase upsert conflict key. A repeated run therefore updates a book instead of duplicating it.

### Resilient extraction

The HTTP session retries temporary network and server failures with backoff. The scraper can either continue while reporting failed URLs or stop immediately in strict mode. A delay between requests makes the crawl respectful and predictable.

### Data integrity

Prices use decimal parsing in Python and constrained numeric columns in PostgreSQL. Database checks reject negative prices, invalid ratings, negative review counts, and negative stock quantities.

### Safe persistence

The CSV backup is written to a temporary file and then replaced atomically. Supabase writes use batches to keep requests manageable. The pipeline reports successful records, failures, synchronized rows, final table count, and elapsed time.

### Least-privilege frontend

The Python pipeline uses a server-side secret stored in `.env`. The web app uses a publishable browser key. Row Level Security grants anonymous users only `SELECT`; mutations remain unavailable.

## Verification

The project contains deterministic unit tests for price normalization, quantity extraction, HTML parsing, invalid scraper configuration, and CSV output. `test_connection.py` independently verifies the cloud write/read/delete cycle.

## Limitations and future work

- The source is a training site and does not expose authors or publication dates.
- A production crawler would add scheduled orchestration, structured logging, monitoring, and alerting.
- Incremental crawling could compare source changes before updating rows.
- The frontend could add authenticated personal shelves and recommendation models.

