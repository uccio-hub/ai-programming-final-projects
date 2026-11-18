from __future__ import annotations

import argparse
import csv
import re
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterator
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


BASE_URL = "https://books.toscrape.com/"
RATING_MAP = {"One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5}


@dataclass(slots=True)
class Book:
    book_id: str
    title: str
    category: str
    price_gbp: Decimal
    price_excl_tax_gbp: Decimal | None
    price_incl_tax_gbp: Decimal | None
    tax_gbp: Decimal | None
    availability: str
    stock_quantity: int | None
    rating: int | None
    review_count: int | None
    description: str | None
    product_url: str
    image_url: str | None
    scraped_at: str

    def to_dict(self) -> dict:
        row = asdict(self)
        for key, value in row.items():
            if isinstance(value, Decimal):
                row[key] = float(value)
        return row


@dataclass(slots=True)
class ScrapeFailure:
    url: str
    error: str


def money(value: str | None) -> Decimal | None:
    """Normalize a displayed price such as '£12.34' to Decimal('12.34')."""
    if not value:
        return None
    cleaned = re.sub(r"[^0-9.]", "", value)
    if not cleaned:
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation as error:
        raise ValueError(f"Invalid monetary value: {value!r}") from error


def integer(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\d+", value)
    return int(match.group()) if match else None


class BookScraper:
    """Polite, retry-enabled scraper for the Books to Scrape training site."""

    def __init__(
        self,
        delay: float = 0.15,
        timeout: float = 20,
        retries: int = 3,
    ) -> None:
        if delay < 0:
            raise ValueError("delay cannot be negative")
        if timeout <= 0:
            raise ValueError("timeout must be greater than zero")

        self.delay = delay
        self.timeout = timeout
        self.failures: list[ScrapeFailure] = []
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "BooksPipeline/2.0 (educational data project)"}
        )
        retry_policy = Retry(
            total=retries,
            connect=retries,
            read=retries,
            backoff_factor=0.5,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({"GET"}),
        )
        adapter = HTTPAdapter(max_retries=retry_policy)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def __enter__(self) -> "BookScraper":
        return self

    def __exit__(self, *_args) -> None:
        self.close()

    def close(self) -> None:
        self.session.close()

    def get_soup(self, url: str) -> BeautifulSoup:
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def listing_urls(self) -> Iterator[str]:
        url: str | None = BASE_URL
        seen: set[str] = set()
        while url:
            soup = self.get_soup(url)
            for card in soup.select("article.product_pod"):
                link = card.select_one("h3 a")
                if link and link.get("href"):
                    product_url = urljoin(url, link["href"])
                    if product_url not in seen:
                        seen.add(product_url)
                        yield product_url
            next_link = soup.select_one("li.next a")
            url = urljoin(url, next_link["href"]) if next_link else None
            if url:
                time.sleep(self.delay)

    def parse_book(self, url: str) -> Book:
        soup = self.get_soup(url)
        title_node = soup.select_one("div.product_main h1")
        price_node = soup.select_one("div.product_main p.price_color")
        if not title_node or not price_node:
            raise ValueError(f"Missing required book fields at {url}")

        product_info: dict[str, str] = {}
        for row in soup.select("table.table.table-striped tr"):
            header, value = row.select_one("th"), row.select_one("td")
            if header and value:
                product_info[header.get_text(strip=True)] = value.get_text(
                    " ", strip=True
                )

        breadcrumbs = soup.select("ul.breadcrumb li a")
        category = breadcrumbs[-1].get_text(strip=True) if breadcrumbs else "Unknown"
        availability = product_info.get("Availability", "")
        rating_node = soup.select_one("p.star-rating")
        rating = None
        if rating_node:
            classes = rating_node.get("class", [])
            rating = next(
                (RATING_MAP[name] for name in RATING_MAP if name in classes), None
            )

        description_heading = soup.find(id="product_description")
        description_node = (
            description_heading.find_next_sibling("p")
            if description_heading
            else None
        )
        image = soup.select_one("div.item.active img")
        current_price = money(price_node.get_text(strip=True))
        if current_price is None:
            raise ValueError(f"Invalid price at {url}")

        return Book(
            book_id=product_info.get("UPC", url.rstrip("/").split("/")[-2]),
            title=title_node.get_text(" ", strip=True),
            category=category,
            price_gbp=current_price,
            price_excl_tax_gbp=money(product_info.get("Price (excl. tax)")),
            price_incl_tax_gbp=money(product_info.get("Price (incl. tax)")),
            tax_gbp=money(product_info.get("Tax")),
            availability=availability,
            stock_quantity=integer(availability),
            rating=rating,
            review_count=integer(product_info.get("Number of reviews")),
            description=(
                description_node.get_text(" ", strip=True)
                if description_node
                else None
            ),
            product_url=url,
            image_url=(
                urljoin(url, image["src"])
                if image and image.get("src")
                else None
            ),
            scraped_at=datetime.now(timezone.utc).isoformat(),
        )

    def scrape(
        self,
        limit: int | None = None,
        *,
        continue_on_error: bool = True,
    ) -> list[dict]:
        if limit is not None and limit <= 0:
            raise ValueError("limit must be greater than zero")

        self.failures.clear()
        books: list[dict] = []
        for index, url in enumerate(self.listing_urls(), start=1):
            if limit is not None and index > limit:
                break
            print(f"[{index}{f'/{limit}' if limit else ''}] {url}")
            try:
                books.append(self.parse_book(url).to_dict())
            except (requests.RequestException, ValueError) as error:
                self.failures.append(ScrapeFailure(url=url, error=str(error)))
                print(f"  WARNING: skipped ({error})")
                if not continue_on_error:
                    raise
            time.sleep(self.delay)

        print(
            f"Scrape summary: {len(books)} succeeded, "
            f"{len(self.failures)} failed"
        )
        return books


def write_csv(rows: list[dict], path: str | Path) -> None:
    """Write a UTF-8 CSV atomically so interrupted runs do not corrupt backups."""
    if not rows:
        raise ValueError("No books were scraped")
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(f"{destination.suffix}.tmp")
    with temporary.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    temporary.replace(destination)
    print(f"Saved {len(rows)} books to {destination.resolve()}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape books.toscrape.com to a normalized CSV"
    )
    parser.add_argument("--limit", type=int, default=None, help="Maximum books")
    parser.add_argument("--output", default="books.csv", help="Destination CSV")
    parser.add_argument("--delay", type=float, default=0.15, help="Request delay")
    parser.add_argument("--timeout", type=float, default=20, help="HTTP timeout")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Stop immediately when one book cannot be processed",
    )
    args = parser.parse_args()

    with BookScraper(delay=args.delay, timeout=args.timeout) as scraper:
        rows = scraper.scrape(
            limit=args.limit,
            continue_on_error=not args.strict,
        )
        write_csv(rows, args.output)


if __name__ == "__main__":
    main()
