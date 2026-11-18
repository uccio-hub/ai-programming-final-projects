from __future__ import annotations

import argparse
import time

from scraper import BookScraper, write_csv
from supabase_client import count_books, get_client, upsert_books


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape Books to Scrape and synchronize it with Supabase"
    )
    parser.add_argument("--limit", type=int, default=None, help="Maximum books")
    parser.add_argument("--csv", default="books.csv", help="Local backup CSV")
    parser.add_argument("--delay", type=float, default=0.15, help="Request delay")
    parser.add_argument("--timeout", type=float, default=20, help="HTTP timeout")
    parser.add_argument("--batch-size", type=int, default=100, help="Upsert batch")
    parser.add_argument(
        "--skip-csv",
        action="store_true",
        help="Do not create a local CSV backup",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Stop if any product cannot be scraped",
    )
    args = parser.parse_args()

    started = time.perf_counter()
    with BookScraper(delay=args.delay, timeout=args.timeout) as scraper:
        books = scraper.scrape(
            limit=args.limit,
            continue_on_error=not args.strict,
        )
        failed = len(scraper.failures)

    if not books:
        raise RuntimeError("The scraper returned no books; nothing was synchronized")
    if not args.skip_csv:
        write_csv(books, args.csv)

    client = get_client()
    written = upsert_books(client, books, batch_size=args.batch_size)
    database_total = count_books(client)
    elapsed = time.perf_counter() - started

    print("\nPIPELINE COMPLETE")
    print(f"  Scraped successfully : {len(books)}")
    print(f"  Scrape failures      : {failed}")
    print(f"  Supabase rows synced : {written}")
    print(f"  Books now in table   : {database_total}")
    print(f"  Elapsed time         : {elapsed:.1f}s")


if __name__ == "__main__":
    main()

