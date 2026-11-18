from __future__ import annotations

import os
from collections.abc import Iterable

from dotenv import load_dotenv
from supabase import Client, create_client


load_dotenv()


def get_client() -> Client:
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_SECRET_KEY") or "").strip()
    if not url or not key:
        raise RuntimeError(
            "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. "
            "Copy .env.example to .env and add your project values."
        )
    if not url.startswith("https://") or ".supabase.co" not in url:
        raise RuntimeError("SUPABASE_URL does not look like a Supabase project URL")
    if key.startswith("sb_publishable_"):
        raise RuntimeError(
            "The pipeline needs a server-side secret key, not a publishable key"
        )
    return create_client(url, key)


def chunks(rows: list[dict], size: int = 100) -> Iterable[list[dict]]:
    if size <= 0:
        raise ValueError("batch size must be greater than zero")
    for start in range(0, len(rows), size):
        yield rows[start : start + size]


def upsert_books(client: Client, rows: list[dict], batch_size: int = 100) -> int:
    if not rows:
        return 0

    written = 0
    for batch in chunks(rows, batch_size):
        response = (
            client.table("books")
            .upsert(batch, on_conflict="book_id")
            .execute()
        )
        written += len(response.data or batch)
        print(f"Supabase: processed {min(written, len(rows))}/{len(rows)} rows")
    return written


def count_books(client: Client) -> int:
    response = (
        client.table("books")
        .select("book_id", count="exact")
        .limit(1)
        .execute()
    )
    return int(response.count or 0)

