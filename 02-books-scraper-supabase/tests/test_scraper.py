import tempfile
import unittest
from pathlib import Path

from bs4 import BeautifulSoup

from scraper import BookScraper, integer, money, write_csv


DETAIL_HTML = """
<html><body>
  <ul class="breadcrumb">
    <li><a href="/">Home</a></li>
    <li><a href="/catalogue/category/books_1/index.html">Books</a></li>
    <li><a href="/catalogue/category/books/poetry_23/index.html">Poetry</a></li>
    <li>Example</li>
  </ul>
  <div class="product_main">
    <h1>Example Book</h1>
    <p class="price_color">£12.34</p>
    <p class="star-rating Four"></p>
  </div>
  <div class="item active"><img src="../../media/example.jpg"></div>
  <div id="product_description"></div><p>A useful description.</p>
  <table class="table table-striped">
    <tr><th>UPC</th><td>abc123</td></tr>
    <tr><th>Price (excl. tax)</th><td>£12.34</td></tr>
    <tr><th>Price (incl. tax)</th><td>£12.34</td></tr>
    <tr><th>Tax</th><td>£0.00</td></tr>
    <tr><th>Availability</th><td>In stock (7 available)</td></tr>
    <tr><th>Number of reviews</th><td>2</td></tr>
  </table>
</body></html>
"""


class FixtureScraper(BookScraper):
    def get_soup(self, _url):
        return BeautifulSoup(DETAIL_HTML, "html.parser")


class NormalizationTests(unittest.TestCase):
    def test_money_removes_currency_symbol(self):
        self.assertEqual(float(money("£51.77")), 51.77)
        self.assertIsNone(money(None))

    def test_integer_extracts_quantity(self):
        self.assertEqual(integer("In stock (22 available)"), 22)
        self.assertIsNone(integer("Unavailable"))


class ScraperParsingTests(unittest.TestCase):
    def test_detail_page_is_normalized(self):
        with FixtureScraper(delay=0) as scraper:
            book = scraper.parse_book(
                "https://books.toscrape.com/catalogue/example_1/index.html"
            )
        self.assertEqual(book.book_id, "abc123")
        self.assertEqual(book.title, "Example Book")
        self.assertEqual(book.category, "Poetry")
        self.assertEqual(float(book.price_gbp), 12.34)
        self.assertEqual(book.stock_quantity, 7)
        self.assertEqual(book.rating, 4)
        self.assertEqual(book.review_count, 2)
        self.assertTrue(book.image_url.startswith("https://"))

    def test_invalid_configuration_is_rejected(self):
        with self.assertRaises(ValueError):
            BookScraper(delay=-1)
        with self.assertRaises(ValueError):
            BookScraper(timeout=0)


class CsvTests(unittest.TestCase):
    def test_csv_backup_is_written_with_header(self):
        rows = [{"book_id": "abc123", "title": "Example Book"}]
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "nested" / "books.csv"
            write_csv(rows, destination)
            text = destination.read_text(encoding="utf-8-sig")
        self.assertIn("book_id,title", text)
        self.assertIn("abc123,Example Book", text)


if __name__ == "__main__":
    unittest.main()

