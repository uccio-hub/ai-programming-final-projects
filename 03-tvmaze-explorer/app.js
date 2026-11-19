const API_BASE = 'https://api.tvmaze.com';

const state = {
  query: '',
  results: [],
  filtered: [],
  controller: null,
  suggestionController: null,
  suggestionTimer: null,
  detailCache: new Map(),
  watchlistOnly: false,
};

const els = {
  form: document.querySelector('#search-form'),
  input: document.querySelector('#search-input'),
  resultsTitle: document.querySelector('#results-title'),
  resultCount: document.querySelector('#result-count'),
  resultsGrid: document.querySelector('#results-grid'),
  welcome: document.querySelector('#welcome-state'),
  filters: document.querySelector('#filter-bar'),
  genre: document.querySelector('#genre-filter'),
  status: document.querySelector('#status-filter'),
  language: document.querySelector('#language-filter'),
  sort: document.querySelector('#sort-filter'),
  template: document.querySelector('#card-template'),
  modal: document.querySelector('#detail-modal'),
  detail: document.querySelector('#detail-content'),
  toast: document.querySelector('#toast'),
  suggestions: document.querySelector('#search-suggestions'),
  recent: document.querySelector('#recent-searches'),
  watchlistButton: document.querySelector('#watchlist-button'),
  watchlistCount: document.querySelector('#watchlist-count'),
  apiStatus: document.querySelector('#api-status'),
};

const CACHE_TTL = 30 * 60 * 1000;
const WATCHLIST_KEY = 'scene-watchlist-v1';
const RECENT_KEY = 'scene-recent-searches-v1';

const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
    <rect width="300" height="420" fill="#222b39"/>
    <path d="M102 128h96v72h-96z" fill="none" stroke="#ff5c35" stroke-width="7"/>
    <path d="m124 118 26-29 26 29M117 226h66" fill="none" stroke="#ff5c35" stroke-width="7" stroke-linecap="round"/>
    <text x="150" y="280" text-anchor="middle" fill="#d8dce3" font-family="Arial" font-size="22">NO IMAGE</text>
  </svg>`)}`;

const stripHtml = (html = '') => {
  const node = document.createElement('div');
  node.innerHTML = html;
  return node.textContent.trim();
};

const safe = (value, fallback = 'Not available') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const formatDate = (date) => {
  if (!date) return 'TBA';
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(parsed);
};

const showYear = (show) => show.premiered?.slice(0, 4) || 'TBA';
const broadcaster = (show) => show.network?.name || show.webChannel?.name || 'Independent';
const rating = (show) => show.rating?.average ? Number(show.rating.average).toFixed(1) : 'N/A';
const imageFor = (item, size = 'original') => safeMediaUrl(item?.image?.[size] || item?.image?.original || item?.image?.medium) || PLACEHOLDER;

function readJsonStorage(key, fallback = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const getWatchlist = () => readJsonStorage(WATCHLIST_KEY);
const isSaved = (id) => getWatchlist().some((show) => show.id === id);

function setWatchlist(shows) {
  const unique = [...new Map(shows.map((show) => [show.id, show])).values()];
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(unique));
  els.watchlistCount.textContent = unique.length;
}

function toggleWatchlist(show) {
  const saved = getWatchlist();
  const removing = saved.some((item) => item.id === show.id);
  setWatchlist(removing ? saved.filter((item) => item.id !== show.id) : [...saved, show]);
  showToast(removing ? `${show.name} removed from watchlist` : `${show.name} added to watchlist`);
  if (state.watchlistOnly) showWatchlist();
  else applyFilters();
}

function saveRecent(query) {
  const recent = readJsonStorage(RECENT_KEY).filter((item) => item.toLowerCase() !== query.toLowerCase());
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...recent].slice(0, 5)));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recent = readJsonStorage(RECENT_KEY);
  els.recent.hidden = recent.length === 0;
  els.recent.innerHTML = recent.length
    ? `<span>Recent</span>${recent.map((query) => `<button type="button" data-recent="${escapeAttr(query)}">${escapeHtml(query)}</button>`).join('')}<button type="button" class="clear-recent" aria-label="Clear recent searches">Clear</button>`
    : '';
}

function showWatchlist() {
  const saved = getWatchlist();
  state.watchlistOnly = true;
  els.watchlistButton.setAttribute('aria-pressed', 'true');
  els.watchlistButton.classList.add('active');
  els.resultsTitle.textContent = 'Your watchlist';
  els.resultCount.textContent = saved.length ? `${saved.length} saved ${saved.length === 1 ? 'show' : 'shows'}.` : 'Save shows to find them here.';
  els.filters.hidden = true;
  els.welcome.hidden = true;
  renderResults(saved.map((show) => ({ score: 1, show })), { title: 'Your watchlist', total: saved.length });
  document.querySelector('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitWatchlist() {
  state.watchlistOnly = false;
  els.watchlistButton.setAttribute('aria-pressed', 'false');
  els.watchlistButton.classList.remove('active');
  if (state.query) {
    populateFilters(state.results);
    applyFilters();
  } else {
    els.resultsGrid.innerHTML = '';
    els.welcome.hidden = false;
    els.resultsTitle.textContent = 'Start with a title';
    els.resultCount.textContent = "Search across TVmaze's global show database.";
  }
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function safeMediaUrl(value) {
  if (typeof value === 'string' && value.startsWith('data:image/')) return value;
  return safeUrl(value);
}

async function api(path, signal) {
  const cacheKey = `scene-api:${path}`;
  let cached;
  try { cached = JSON.parse(sessionStorage.getItem(cacheKey)); } catch { cached = null; }
  if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.data;

  try {
    const response = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(response.status === 404 ? 'The requested information was not found.' : `TVmaze returned ${response.status}. Please try again.`);
    const data = await response.json();
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* cache quota is non-critical */ }
    setApiStatus(true);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (cached?.data) {
      setApiStatus(false, 'Cached data');
      return cached.data;
    }
    setApiStatus(false);
    throw error;
  }
}

function renderSuggestions(results) {
  const items = results.slice(0, 6);
  els.suggestions.hidden = items.length === 0;
  els.suggestions.innerHTML = items.map(({ show }) => `
    <button type="button" class="suggestion" role="option" data-suggestion="${escapeAttr(show.name)}">
      <img src="${escapeAttr(imageFor(show, 'medium'))}" alt="" loading="lazy">
      <span><strong>${escapeHtml(show.name)}</strong><small>${escapeHtml(`${showYear(show)} · ${safe(show.type, 'Show')} · ${safe(show.language)}`)}</small></span>
    </button>`).join('');
}

async function requestSuggestions(query) {
  state.suggestionController?.abort();
  if (query.trim().length < 2) {
    els.suggestions.hidden = true;
    return;
  }
  state.suggestionController = new AbortController();
  try {
    const results = await api(`/search/shows?q=${encodeURIComponent(query.trim())}`, state.suggestionController.signal);
    if (els.input.value.trim() === query.trim()) renderSuggestions(results);
  } catch (error) {
    if (error.name !== 'AbortError') els.suggestions.hidden = true;
  }
}

function setApiStatus(online, label = online ? 'API online' : 'Offline') {
  els.apiStatus.classList.toggle('offline', !online);
  els.apiStatus.innerHTML = `<i></i> ${escapeHtml(label)}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2800);
}

function renderSkeletons() {
  els.welcome.hidden = true;
  els.filters.hidden = true;
  els.resultsGrid.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton" aria-hidden="true"></div>').join('');
}

async function searchShows(query, { updateUrl = true } = {}) {
  const cleaned = query.trim();
  if (!cleaned) return;
  state.controller?.abort();
  state.controller = new AbortController();
  state.query = cleaned;
  state.watchlistOnly = false;
  els.watchlistButton.setAttribute('aria-pressed', 'false');
  els.watchlistButton.classList.remove('active');
  els.input.value = cleaned;
  els.suggestions.hidden = true;
  els.resultsTitle.textContent = `Searching for “${cleaned}”`;
  els.resultCount.textContent = 'Contacting the TVmaze API…';
  renderSkeletons();

  try {
    const data = await api(`/search/shows?q=${encodeURIComponent(cleaned)}`, state.controller.signal);
    state.results = data;
    saveRecent(cleaned);
    populateFilters(data);
    applyFilters();
    if (updateUrl) history.replaceState(null, '', `#search=${encodeURIComponent(cleaned)}`);
    document.querySelector('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    if (error.name === 'AbortError') return;
    renderError(error.message);
  }
}

function populateFilters(results) {
  const shows = results.map(({ show }) => show);
  const values = (getter) => [...new Set(shows.flatMap(getter).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  updateSelect(els.genre, 'All genres', values((show) => show.genres || []));
  updateSelect(els.status, 'All statuses', values((show) => [show.status]));
  updateSelect(els.language, 'All languages', values((show) => [show.language]));
  els.filters.hidden = results.length === 0;
}

function updateSelect(select, label, values) {
  select.innerHTML = `<option value="all">${label}</option>${values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join('')}`;
}

function applyFilters() {
  const genre = els.genre.value;
  const status = els.status.value;
  const language = els.language.value;
  const sort = els.sort.value;

  state.filtered = state.results.filter(({ show }) =>
    (genre === 'all' || show.genres?.includes(genre)) &&
    (status === 'all' || show.status === status) &&
    (language === 'all' || show.language === language)
  );

  const sorted = [...state.filtered].sort((a, b) => {
    if (sort === 'rating') return (b.show.rating?.average || 0) - (a.show.rating?.average || 0);
    if (sort === 'newest') return (b.show.premiered || '').localeCompare(a.show.premiered || '');
    if (sort === 'name') return a.show.name.localeCompare(b.show.name);
    return b.score - a.score;
  });

  renderResults(sorted);
}

function renderResults(results, options = {}) {
  els.resultsGrid.innerHTML = '';
  els.welcome.hidden = true;
  const total = options.total ?? state.results.length;
  els.resultsTitle.textContent = options.title ?? (state.results.length ? `Results for “${state.query}”` : 'No matching shows');
  els.resultCount.textContent = options.total !== undefined
    ? (total ? `${total} saved ${total === 1 ? 'show' : 'shows'}.` : 'Save shows to find them here.')
    : (state.results.length ? `${results.length} of ${state.results.length} ${state.results.length === 1 ? 'result' : 'results'} shown.` : 'Try a different title or a broader word.');

  if (!results.length) {
    els.resultsGrid.innerHTML = '<div class="state-card" style="grid-column:1/-1"><div class="state-icon">×</div><h3>No shows found</h3><p>Change the filters or try another search word.</p></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach(({ score, show }) => {
    const card = els.template.content.firstElementChild.cloneNode(true);
    const poster = card.querySelector('.poster');
    poster.src = imageFor(show, 'original');
    poster.alt = `${show.name} poster`;
    if (!show.image) poster.classList.add('is-placeholder');
    card.querySelector('.score-badge').textContent = show.rating?.average ? `★ ${rating(show)}` : `${Math.round(score * 100)}% match`;
    card.querySelector('.status-badge').textContent = safe(show.status, 'Unknown');
    card.querySelector('.card-kicker').textContent = `${safe(show.type, 'Show')} · ${showYear(show)} · ${safe(show.language)}`;
    card.querySelector('.card-title').textContent = show.name;
    card.querySelector('.card-summary').textContent = stripHtml(show.summary) || 'No summary is currently available for this show.';
    card.querySelector('.genre-list').innerHTML = (show.genres?.length ? show.genres.slice(0, 3) : ['Uncategorised']).map((genre) => `<span>${escapeHtml(genre)}</span>`).join('');
    card.querySelector('.card-meta').innerHTML = `<span>${escapeHtml(broadcaster(show))}</span><span>${show.averageRuntime || show.runtime ? `${show.averageRuntime || show.runtime} min` : 'Runtime TBA'}</span>`;
    const action = card.querySelector('.card-action');
    action.setAttribute('aria-label', `Open details for ${show.name}`);
    action.addEventListener('click', () => openDetails(show.id));
    const saveButton = card.querySelector('.save-show');
    const saved = isSaved(show.id);
    saveButton.textContent = saved ? '♥' : '♡';
    saveButton.classList.toggle('saved', saved);
    saveButton.setAttribute('aria-label', saved ? `Remove ${show.name} from watchlist` : `Add ${show.name} to watchlist`);
    saveButton.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleWatchlist(show);
    });
    fragment.append(card);
  });
  els.resultsGrid.append(fragment);
}

function renderError(message) {
  els.filters.hidden = true;
  els.resultsTitle.textContent = 'Something went wrong';
  els.resultCount.textContent = 'The search could not be completed.';
  els.resultsGrid.innerHTML = `<div class="state-card" style="grid-column:1/-1"><div class="state-icon">!</div><h3>Unable to load shows</h3><p>${escapeHtml(message)}</p></div>`;
}

async function openDetails(id) {
  els.detail.innerHTML = '<div class="modal-loading"><div><div class="spinner"></div><h3>Building the complete show profile…</h3><p>Loading cast, crew, seasons, episodes and images.</p></div></div>';
  if (!els.modal.open) els.modal.showModal();
  document.body.style.overflow = 'hidden';
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  params.set('show', id);
  history.replaceState(null, '', `#${params.toString()}`);

  try {
    let detail = state.detailCache.get(id);
    if (!detail) {
      const paths = [
        `/shows/${id}`,
        `/shows/${id}/episodes?specials=1`,
        `/shows/${id}/seasons`,
        `/shows/${id}/cast`,
        `/shows/${id}/crew`,
        `/shows/${id}/akas`,
        `/shows/${id}/images`,
        `/shows/${id}/alternatelists`,
      ];
      const settled = await Promise.allSettled(paths.map((path) => api(path)));
      if (settled[0].status === 'rejected') throw settled[0].reason;
      const value = (index) => settled[index].status === 'fulfilled' ? settled[index].value : [];
      detail = { show: value(0), episodes: value(1), seasons: value(2), cast: value(3), crew: value(4), akas: value(5), images: value(6), alternateLists: value(7) };
      state.detailCache.set(id, detail);
    }
    renderDetails(detail);
  } catch (error) {
    els.detail.innerHTML = `<button class="modal-close" type="button" aria-label="Close">×</button><div class="modal-loading"><div><h3>Unable to open this show</h3><p>${escapeHtml(error.message)}</p></div></div>`;
    bindModalClose();
  }
}

function renderDetails(data) {
  const { show, episodes, seasons, cast, crew, akas, images, alternateLists } = data;
  const background = safeUrl(images.find((item) => item.type === 'background')?.resolutions?.original?.url || show.image?.original || '');
  const groupedEpisodes = episodes.reduce((groups, episode) => {
    const key = episode.season ?? 'Specials';
    (groups[key] ||= []).push(episode);
    return groups;
  }, {});
  const links = Object.entries(show.externals || {}).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()}: ${value}`).join(' · ');
  const rawData = { ...data, note: 'This object combines the TVmaze endpoints used by the interface.' };
  const officialUrl = safeUrl(show.officialSite);
  const tvmazeUrl = safeUrl(show.url);
  const saved = isSaved(show.id);

  els.detail.innerHTML = `
    <button class="modal-close" type="button" aria-label="Close">×</button>
    <section class="detail-hero" style="${background ? `background-image:url('${escapeAttr(background)}')` : ''}">
      <div class="detail-hero-content">
        <p class="eyebrow">${escapeHtml(broadcaster(show))}</p>
        <h2>${escapeHtml(show.name)}</h2>
        <div class="detail-facts">
          <span>★ ${rating(show)}</span>
          <span>${escapeHtml(safe(show.status))}</span>
          <span>${escapeHtml(safe(show.type))}</span>
          <span>${escapeHtml(safe(show.language))}</span>
          <span>${showYear(show)}${show.ended ? `–${show.ended.slice(0, 4)}` : ''}</span>
          ${(show.genres || []).map((genre) => `<span>${escapeHtml(genre)}</span>`).join('')}
        </div>
      </div>
    </section>
    <div class="detail-body">
      <div class="detail-intro">
        <div>
          <div class="detail-summary"><p>${escapeHtml(stripHtml(show.summary) || 'No summary is currently available.')}</p></div>
          <div class="detail-actions">
            <button type="button" class="detail-save primary">${saved ? '♥ Remove from watchlist' : '♡ Add to watchlist'}</button>
            <button type="button" class="detail-share">Share show</button>
          </div>
        </div>
        <ul class="info-list">
          <li><b>Network</b><span>${escapeHtml(broadcaster(show))}</span></li>
          <li><b>Schedule</b><span>${escapeHtml((show.schedule?.days || []).join(', ') || 'TBA')} ${escapeHtml(show.schedule?.time || '')}</span></li>
          <li><b>Runtime</b><span>${show.averageRuntime || show.runtime ? `${show.averageRuntime || show.runtime} minutes` : 'TBA'}</span></li>
          <li><b>Premiered</b><span>${formatDate(show.premiered)}</span></li>
          <li><b>Country</b><span>${escapeHtml(show.network?.country?.name || show.webChannel?.country?.name || 'Global / not specified')}</span></li>
          <li><b>Official</b><span>${officialUrl ? `<a href="${escapeAttr(officialUrl)}" target="_blank" rel="noopener noreferrer">Visit website ↗</a>` : 'Not available'}</span></li>
          <li><b>TVmaze</b><span>${tvmazeUrl ? `<a href="${escapeAttr(tvmazeUrl)}" target="_blank" rel="noopener noreferrer">Original listing ↗</a>` : 'Not available'}</span></li>
        </ul>
      </div>

      <div class="tabs" role="tablist" aria-label="Show details">
        <button class="tab active" role="tab" aria-selected="true" data-tab="episodes">Episodes <small>${episodes.length}</small></button>
        <button class="tab" role="tab" aria-selected="false" data-tab="cast">Cast <small>${cast.length}</small></button>
        <button class="tab" role="tab" aria-selected="false" data-tab="crew">Crew <small>${crew.length}</small></button>
        <button class="tab" role="tab" aria-selected="false" data-tab="gallery">Gallery <small>${images.length}</small></button>
        <button class="tab" role="tab" aria-selected="false" data-tab="metadata">All data</button>
      </div>

      <section class="tab-panel" data-panel="episodes">${renderEpisodes(groupedEpisodes, seasons)}</section>
      <section class="tab-panel" data-panel="cast" hidden>${renderCast(cast)}</section>
      <section class="tab-panel" data-panel="crew" hidden>${renderCrew(crew)}</section>
      <section class="tab-panel" data-panel="gallery" hidden>${renderGallery(images)}</section>
      <section class="tab-panel" data-panel="metadata" hidden>
        <div class="metadata-grid">
          ${metadataCard('TVmaze ID', show.id)}
          ${metadataCard('API updated', show.updated ? new Date(show.updated * 1000).toLocaleString() : null)}
          ${metadataCard('Weight', show.weight)}
          ${metadataCard('External IDs', links || null)}
          ${metadataCard('Alternative names', akas.map((item) => `${item.name}${item.country?.name ? ` (${item.country.name})` : ''}`).join(' · ') || null)}
          ${metadataCard('Alternate episode lists', alternateLists.map((item) => `${item.name || item.type || 'List'} #${item.id}`).join(' · ') || null)}
        </div>
        <h3>Raw API data</h3>
        <p>This JSON contains every field returned by the endpoints used for this profile.</p>
        <pre class="raw-json">${escapeHtml(JSON.stringify(rawData, null, 2))}</pre>
      </section>
    </div>`;

  bindModalClose();
  els.detail.querySelectorAll('.tab').forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));
  els.detail.querySelector('.detail-save')?.addEventListener('click', (event) => {
    toggleWatchlist(show);
    const nowSaved = isSaved(show.id);
    event.currentTarget.textContent = nowSaved ? '♥ Remove from watchlist' : '♡ Add to watchlist';
  });
  els.detail.querySelector('.detail-share')?.addEventListener('click', () => shareShow(show));
}

async function shareShow(show) {
  const shareData = { title: `${show.name} — Scene`, text: `Explore ${show.name} on Scene`, url: location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard.writeText(location.href);
      showToast('Show link copied to clipboard');
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Unable to share this show');
  }
}

function renderEpisodes(groups, seasons) {
  const entries = Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  if (!entries.length) return '<div class="empty-inline">No episodes are currently available.</div>';
  return entries.map(([seasonNumber, items]) => {
    const season = seasons.find((item) => String(item.number) === String(seasonNumber));
    return `<div class="season-block">
      <div class="season-head"><h3>Season ${escapeHtml(seasonNumber)}</h3><span>${items.length} episodes${season?.premiereDate ? ` · ${formatDate(season.premiereDate)}` : ''}</span></div>
      <div class="episode-list">${items.map((episode) => `
        <article class="episode">
          <span class="episode-code">S${String(episode.season ?? 0).padStart(2, '0')} E${String(episode.number ?? 0).padStart(2, '0')}</span>
          <img src="${escapeAttr(imageFor(episode, 'medium'))}" alt="" loading="lazy">
          <div><h4>${escapeHtml(episode.name)}</h4><p>${episode.runtime ? `${episode.runtime} min` : 'Runtime TBA'}${episode.rating?.average ? ` · ★ ${episode.rating.average}` : ''}</p></div>
          <time datetime="${escapeAttr(episode.airdate || '')}">${formatDate(episode.airdate)}</time>
        </article>`).join('')}</div>
    </div>`;
  }).join('');
}

function renderCast(cast) {
  if (!cast.length) return '<div class="empty-inline">No cast information is currently available.</div>';
  return `<div class="people-grid">${cast.map(({ person, character, self, voice }) => `
    <article class="person">
      <img src="${escapeAttr(imageFor(person, 'medium'))}" alt="${escapeAttr(person.name)}" loading="lazy">
      <h4>${escapeHtml(person.name)}</h4>
      <p>${escapeHtml(character?.name || 'Unknown role')}${self ? ' · Self' : ''}${voice ? ' · Voice' : ''}</p>
    </article>`).join('')}</div>`;
}

function renderCrew(crew) {
  if (!crew.length) return '<div class="empty-inline">No crew information is currently available.</div>';
  return `<div class="people-grid">${crew.map(({ person, type }) => `
    <article class="person">
      <img src="${escapeAttr(imageFor(person, 'medium'))}" alt="${escapeAttr(person.name)}" loading="lazy">
      <h4>${escapeHtml(person.name)}</h4>
      <p>${escapeHtml(type || 'Crew')}</p>
    </article>`).join('')}</div>`;
}

function renderGallery(images) {
  if (!images.length) return '<div class="empty-inline">No additional images are currently available.</div>';
  return `<div class="gallery">${images.map((item) => `
    <figure><img src="${escapeAttr(safeMediaUrl(item.resolutions?.medium?.url || item.resolutions?.original?.url) || PLACEHOLDER)}" alt="${escapeAttr(item.type || 'Show image')}" loading="lazy"><figcaption>${escapeHtml(item.type || 'Other')} · ${item.main ? 'Main image' : 'Gallery image'}</figcaption></figure>`).join('')}</div>`;
}

function metadataCard(label, value) {
  return `<div class="metadata-card"><b>${escapeHtml(label)}</b><span>${escapeHtml(safe(value))}</span></div>`;
}

function setTab(name) {
  els.detail.querySelectorAll('.tab').forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  els.detail.querySelectorAll('.tab-panel').forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
}

function bindModalClose() {
  els.detail.querySelector('.modal-close')?.addEventListener('click', closeModal);
}

function closeModal() {
  els.modal.close();
  document.body.style.overflow = '';
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  params.delete('show');
  history.replaceState(null, '', params.toString() ? `#${params.toString()}` : `${location.pathname}${location.search}`);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function escapeAttr(value = '') { return escapeHtml(value); }

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  searchShows(els.input.value);
});
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => searchShows(button.dataset.query)));
[els.genre, els.status, els.language, els.sort].forEach((select) => select.addEventListener('change', applyFilters));
els.input.addEventListener('input', () => {
  clearTimeout(state.suggestionTimer);
  state.suggestionTimer = setTimeout(() => requestSuggestions(els.input.value), 250);
});
els.input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') els.suggestions.hidden = true;
});
els.suggestions.addEventListener('click', (event) => {
  const option = event.target.closest('[data-suggestion]');
  if (option) searchShows(option.dataset.suggestion);
});
els.recent.addEventListener('click', (event) => {
  const recent = event.target.closest('[data-recent]');
  if (recent) searchShows(recent.dataset.recent);
  if (event.target.closest('.clear-recent')) {
    localStorage.removeItem(RECENT_KEY);
    renderRecentSearches();
  }
});
els.watchlistButton.addEventListener('click', () => state.watchlistOnly ? exitWatchlist() : showWatchlist());
els.modal.addEventListener('click', (event) => { if (event.target === els.modal) closeModal(); });
els.modal.addEventListener('cancel', (event) => { event.preventDefault(); closeModal(); });
document.addEventListener('click', (event) => {
  if (!event.target.closest('.hero-inner')) els.suggestions.hidden = true;
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    els.input.focus();
  }
});
window.addEventListener('online', () => setApiStatus(true));
window.addEventListener('offline', () => setApiStatus(false));

async function boot() {
  setWatchlist(getWatchlist());
  renderRecentSearches();
  setApiStatus(navigator.onLine);
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const initialQuery = params.get('search');
  const initialShow = Number(params.get('show'));
  if (initialQuery) await searchShows(initialQuery, { updateUrl: false });
  if (Number.isInteger(initialShow) && initialShow > 0) await openDetails(initialShow);
}

boot();

window.SceneApp = { searchShows, openDetails, applyFilters, showWatchlist };
