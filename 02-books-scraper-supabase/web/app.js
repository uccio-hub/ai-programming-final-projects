const PAGE_SIZE = 24;
const config = window.BOOK_APP_CONFIG || {};
const isConfigured =
  /^https:\/\/.+\.supabase\.co$/.test(config.supabaseUrl || "") &&
  /^sb_publishable_/.test(config.supabasePublishableKey || "");
const client = isConfigured
  ? window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey
    )
  : null;

const state = {
  page: 1,
  total: 0,
  savedOnly: false,
  searchTimer: null,
  metadata: [],
  fallbackBooks: null
};
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function getSaved() {
  try {
    const value = JSON.parse(localStorage.getItem("leaf-letter-saved"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function setSaved(ids) {
  const uniqueIds = [...new Set(ids)];
  localStorage.setItem("leaf-letter-saved", JSON.stringify(uniqueIds));
  $("savedCount").textContent = uniqueIds.length;
}

function stars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return `<span class="stars" aria-label="${value} out of 5 stars">${"★".repeat(value)}${"☆".repeat(5 - value)}</span>`;
}

function setConnectionStatus(label, className = "") {
  $("dataStatus").className = `live-status ${className}`.trim();
  $("dataStatus").innerHTML = `<i></i> ${escapeHtml(label)}`;
}

function renderSkeletons() {
  $("skeletonGrid").innerHTML = Array.from(
    { length: 8 },
    () => `<div class="skeleton-card"><div></div><i></i><i></i><i></i></div>`
  ).join("");
  $("skeletonGrid").classList.remove("hidden");
  $("bookGrid").classList.add("hidden");
}

function hideSkeletons() {
  $("skeletonGrid").classList.add("hidden");
  $("bookGrid").classList.remove("hidden");
}

function bookCard(book) {
  const saved = getSaved().includes(book.book_id);
  const imageUrl = safeHttpsUrl(book.image_url);
  return `
    <article class="book-card" data-id="${escapeHtml(book.book_id)}">
      <button class="save-book ${saved ? "saved" : ""}" type="button"
        aria-label="${saved ? "Remove from" : "Add to"} saved books">
        ${saved ? "♥" : "♡"}
      </button>
      <button class="book-open" type="button"
        aria-label="View ${escapeHtml(book.title)}">
        <div class="cover-wrap">
          ${imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy">`
            : '<span class="cover-fallback">No cover</span>'}
        </div>
        <div class="book-meta">
          <span>${escapeHtml(book.category)}</span>${stars(book.rating)}
        </div>
        <h3>${escapeHtml(book.title)}</h3>
        <div class="book-bottom">
          <strong>£${Number(book.price_gbp).toFixed(2)}</strong>
          <span>${book.stock_quantity > 0 ? "In stock" : "Unavailable"}</span>
        </div>
      </button>
    </article>`;
}

function sortSettings() {
  const [column, direction] = $("sortFilter").value.split("-");
  const columns = { title: "title", price: "price_gbp", rating: "rating" };
  return {
    column: columns[column] || "title",
    ascending: direction === "asc"
  };
}

function updateUrl() {
  const parameters = new URLSearchParams();
  const values = {
    q: $("searchInput").value.trim(),
    category: $("categoryFilter").value,
    rating: $("ratingFilter").value,
    price: $("priceFilter").value,
    sort: $("sortFilter").value
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value && !(key === "sort" && value === "title-asc")) {
      parameters.set(key, value);
    }
  });
  if (state.savedOnly) parameters.set("saved", "1");
  const query = parameters.toString();
  history.replaceState(
    null,
    "",
    `${location.pathname}${query ? `?${query}` : ""}${location.hash || ""}`
  );
}

function restoreFilters() {
  const parameters = new URLSearchParams(location.search);
  $("searchInput").value = parameters.get("q") || "";
  $("categoryFilter").value = parameters.get("category") || "";
  $("ratingFilter").value = parameters.get("rating") || "";
  $("priceFilter").value = parameters.get("price") || "";
  $("sortFilter").value = parameters.get("sort") || "title-asc";
  state.savedOnly = parameters.get("saved") === "1";
  $("savedButton").classList.toggle("active", state.savedOnly);
}

function renderMetrics(rows) {
  const categories = new Set(rows.map((row) => row.category).filter(Boolean));
  const ratings = rows.map((row) => Number(row.rating)).filter(Boolean);
  const average = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : 0;
  const timestamps = rows
    .map((row) => Date.parse(row.scraped_at))
    .filter(Number.isFinite);
  const latest = timestamps.length ? new Date(Math.max(...timestamps)) : null;

  $("metricBooks").textContent = rows.length.toLocaleString();
  $("metricCategories").textContent = categories.size.toLocaleString();
  $("metricRating").textContent = average.toFixed(2);
  $("metricSync").textContent = latest
    ? latest.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "Unknown";
}

function populateCategories(rows) {
  const categories = [
    ...new Set(rows.map((row) => row.category).filter(Boolean))
  ].sort();
  $("categoryFilter").innerHTML = '<option value="">All categories</option>';
  $("categoryFilter").insertAdjacentHTML(
    "beforeend",
    categories
      .map((category) =>
        `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
      )
      .join("")
  );
}

async function loadMetadata() {
  const { data, error } = await client
    .from("books")
    .select("book_id,category,price_gbp,rating,scraped_at")
    .limit(1000);
  if (error) throw error;

  state.metadata = data || [];
  populateCategories(state.metadata);
  renderMetrics(state.metadata);
}

async function activateFallback(reason) {
  const response = await fetch("data/books-fallback.json");
  if (!response.ok) throw new Error("The local fallback dataset is unavailable");
  state.fallbackBooks = await response.json();
  state.metadata = state.fallbackBooks;
  populateCategories(state.metadata);
  renderMetrics(state.metadata);
  restoreFilters();
  setConnectionStatus("Local fallback", "fallback");
  $("errorNotice").textContent =
    `Live Supabase data is temporarily unavailable. Showing the complete local snapshot instead. (${reason})`;
  $("errorNotice").classList.remove("hidden");
  loadBooks();
}

function loadFallbackBooks() {
  renderSkeletons();
  const search = $("searchInput").value.trim().toLocaleLowerCase();
  const category = $("categoryFilter").value;
  const minimumRating = Number($("ratingFilter").value || 0);
  const maximumPrice = Number($("priceFilter").value || Infinity);
  const saved = getSaved();

  let books = state.fallbackBooks.filter((book) =>
    (!search || book.title.toLocaleLowerCase().includes(search)) &&
    (!category || book.category === category) &&
    (!minimumRating || Number(book.rating) >= minimumRating) &&
    Number(book.price_gbp) <= maximumPrice &&
    (!state.savedOnly || saved.includes(book.book_id))
  );

  const { column, ascending } = sortSettings();
  books.sort((left, right) => {
    const first = left[column] ?? "";
    const second = right[column] ?? "";
    const result = typeof first === "string"
      ? first.localeCompare(second)
      : Number(first) - Number(second);
    return ascending ? result : -result;
  });

  state.total = books.length;
  const from = (state.page - 1) * PAGE_SIZE;
  renderBooks(books.slice(from, from + PAGE_SIZE));
  setConnectionStatus("Local fallback", "fallback");
  updateUrl();
}

async function loadBooks() {
  if (state.fallbackBooks) {
    loadFallbackBooks();
    return;
  }
  if (!client) {
    await activateFallback("Supabase is not configured");
    return;
  }

  renderSkeletons();
  $("errorNotice").classList.add("hidden");
  const from = (state.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { column, ascending } = sortSettings();
  let query = client.from("books").select("*", { count: "exact" });
  const search = $("searchInput").value.trim().replace(/[%_]/g, "");
  const category = $("categoryFilter").value;
  const minimumRating = $("ratingFilter").value;
  const maximumPrice = $("priceFilter").value;

  if (search) query = query.ilike("title", `%${search}%`);
  if (category) query = query.eq("category", category);
  if (minimumRating) query = query.gte("rating", Number(minimumRating));
  if (maximumPrice) query = query.lte("price_gbp", Number(maximumPrice));

  const saved = getSaved();
  if (state.savedOnly) {
    if (!saved.length) {
      state.total = 0;
      renderBooks([]);
      updateUrl();
      return;
    }
    query = query.in("book_id", saved);
  }

  const { data, error, count } = await query
    .order(column, { ascending })
    .range(from, to);

  if (error) {
    await activateFallback(error.message);
    return;
  }

  state.total = count || 0;
  setConnectionStatus("Live data", "connected");
  renderBooks(data || []);
  updateUrl();
}

function renderBooks(books) {
  hideSkeletons();
  $("bookGrid").innerHTML = books.length
    ? books.map(bookCard).join("")
    : `<div class="empty-state">
        <strong>No books found</strong>
        <p>Try changing your search or filters.</p>
      </div>`;

  $("resultCount").textContent =
    `${state.total.toLocaleString()} ${state.total === 1 ? "book" : "books"}`;
  const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
  $("pageInfo").textContent = `Page ${state.page} of ${pages}`;
  $("previousPage").disabled = state.page <= 1;
  $("nextPage").disabled = state.page >= pages;
  $("pagination").classList.toggle("hidden", state.total <= PAGE_SIZE);
}

async function openBook(bookId) {
  let data;
  let error;
  if (state.fallbackBooks) {
    data = state.fallbackBooks.find((book) => book.book_id === bookId);
    if (!data) error = new Error("Book not found");
  } else if (client) {
    ({ data, error } = await client
      .from("books")
      .select("*")
      .eq("book_id", bookId)
      .single());
  } else {
    return;
  }
  if (error) {
    $("errorNotice").textContent = `Book details could not be loaded: ${error.message}`;
    $("errorNotice").classList.remove("hidden");
    return;
  }

  const imageUrl = safeHttpsUrl(data.image_url);
  const productUrl = safeHttpsUrl(data.product_url);
  $("dialogContent").innerHTML = `
    <div class="dialog-layout">
      <div class="dialog-cover">
        ${imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="Cover of ${escapeHtml(data.title)}">`
          : '<span class="cover-fallback">No cover available</span>'}
      </div>
      <div class="dialog-copy">
        <p class="eyebrow">${escapeHtml(data.category)}</p>
        <h2>${escapeHtml(data.title)}</h2>
        ${stars(data.rating)}
        <strong class="dialog-price">£${Number(data.price_gbp).toFixed(2)}</strong>
        <p>${escapeHtml(data.description || "No description is available for this title.")}</p>
        <div class="dialog-facts">
          <span>${escapeHtml(data.availability)}</span>
          <span>${data.review_count || 0} reviews</span>
          <span>UPC ${escapeHtml(data.book_id)}</span>
        </div>
        ${productUrl
          ? `<a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer">View original listing ↗</a>`
          : ""}
      </div>
    </div>`;
  $("bookDialog").showModal();
}

function resetAndLoad() {
  state.page = 1;
  loadBooks();
}

function surpriseMe() {
  if (!state.metadata.length) return;
  const random = state.metadata[
    Math.floor(Math.random() * state.metadata.length)
  ];
  openBook(random.book_id);
}

$("bookGrid").addEventListener("click", (event) => {
  const card = event.target.closest(".book-card");
  if (!card) return;
  if (event.target.closest(".save-book")) {
    const saved = getSaved();
    const next = saved.includes(card.dataset.id)
      ? saved.filter((id) => id !== card.dataset.id)
      : [...saved, card.dataset.id];
    setSaved(next);
    loadBooks();
  } else if (event.target.closest(".book-open")) {
    openBook(card.dataset.id);
  }
});

$("searchInput").addEventListener("input", () => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(resetAndLoad, 280);
});

[
  $("categoryFilter"),
  $("ratingFilter"),
  $("priceFilter"),
  $("sortFilter")
].forEach((element) => element.addEventListener("change", resetAndLoad));

$("resetFilters").addEventListener("click", () => {
  $("searchInput").value = "";
  $("categoryFilter").value = "";
  $("ratingFilter").value = "";
  $("priceFilter").value = "";
  $("sortFilter").value = "title-asc";
  state.savedOnly = false;
  $("savedButton").classList.remove("active");
  resetAndLoad();
});

$("savedButton").addEventListener("click", () => {
  state.savedOnly = !state.savedOnly;
  $("savedButton").classList.toggle("active", state.savedOnly);
  resetAndLoad();
});

$("previousPage").addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    loadBooks();
    $("catalogue").scrollIntoView();
  }
});

$("nextPage").addEventListener("click", () => {
  state.page += 1;
  loadBooks();
  $("catalogue").scrollIntoView();
});

$("heroSurprise").addEventListener("click", surpriseMe);
$("closeDialog").addEventListener("click", () => $("bookDialog").close());
$("bookDialog").addEventListener("click", (event) => {
  if (event.target === $("bookDialog")) $("bookDialog").close();
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    $("searchInput").focus();
  }
});

setSaved(getSaved());
if (client) {
  loadMetadata()
    .then(() => {
      restoreFilters();
      return loadBooks();
    })
    .catch((error) => activateFallback(error.message).catch((fallbackError) => {
      $("errorNotice").textContent = `Setup error: ${fallbackError.message}`;
      $("errorNotice").classList.remove("hidden");
      $("resultCount").textContent = "Unable to load catalogue";
      setConnectionStatus("Connection error", "error");
    }));
} else {
  loadBooks();
}

