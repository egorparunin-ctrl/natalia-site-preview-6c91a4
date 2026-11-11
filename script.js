/*
 * Публичная часть сайта. Данные редактируются через Pages CMS в data/*.json.
 * Сборщик и сервер не нужны: проект работает непосредственно на GitHub Pages.
 */

const state = {
  site: {},
  activations: [],
  filter: 'all',
  favorites: new Set(),
  lastFocus: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function safeAsset(value, fallback = 'assets/interior.webp') {
  if (!value || typeof value !== 'string') return fallback;
  const normalized = value.replace(/^\/(assets\/)/, '$1');
  if (/^(assets\/)[a-zA-Z0-9_./%+-]+$/.test(normalized) && !normalized.includes('..')) return normalized;
  if (/^https:\/\//i.test(normalized)) return normalized;
  return fallback;
}

function safeVideoEmbed(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'runtime.video.cloud.yandex.net' || host === 'video.cloud.yandex.net') return url.href;
  } catch (_) { /* Некорректные и неизвестные ссылки не встраиваются. */ }
  return null;
}

function favoriteIds() {
  try { return JSON.parse(localStorage.getItem('natalia-demo-favorites') || '[]'); }
  catch (_) { return []; }
}

function setText(id, content) {
  const node = document.getElementById(id);
  if (node && typeof content === 'string') node.textContent = content;
}

function fillSiteContent() {
  const site = state.site;
  ['heroEyebrow', 'heroSubtitle', 'heroDescription', 'aboutText', 'quoteText', 'consultationText'].forEach((name) => setText(name, site[name]));
  if (typeof site.heroTitle === 'string') {
    $('#heroTitle').innerHTML = escapeHTML(site.heroTitle).replace(/\n/g, '<br>');
  }
  if (typeof site.heroImage === 'string') {
    $('#heroImage').style.backgroundImage = `url("${safeAsset(site.heroImage, 'assets/natalia-hero.webp')}")`;
  }
}

function isFavorite(id) { return state.favorites.has(id); }

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  try { localStorage.setItem('natalia-demo-favorites', JSON.stringify([...state.favorites])); }
  catch (_) { /* Режим приватного просмотра может блокировать хранилище. */ }
  renderCards();
  renderFeatured();
}

function displayActivations() {
  return state.activations.filter((item) => state.filter === 'all' || item.status === state.filter);
}

function cardMarkup(item, large) {
  const title = escapeHTML(item.title || 'Новая активация');
  const id = escapeHTML(item.id);
  const soon = item.status === 'soon';
  const cover = safeAsset(item.cover);
  const subtitle = escapeHTML(item.subtitle || (soon ? 'Скоро' : 'Активация'));
  const fav = isFavorite(item.id);
  if (large) {
    return `<article class="activation-card featured">
      <div class="card-cover" style="background-image:url('${cover}')"></div>
      <div class="card-content">
        <span class="card-kicker">${subtitle}</span>
        <h3>${title}</h3>
        <p>${escapeHTML(item.description || '')}</p>
        ${!soon && item.videoUrl ? `<span class="card-meta">${icon('calendar')} Авторская видеоверсия живой активации</span>` : ''}
        <div class="card-actions">
          <button type="button" class="pill-button button-mauve" data-open="${id}">${soon ? 'Узнать о встрече' : 'Погрузиться в активацию'} ${icon('arrow')}</button>
          <button type="button" class="favorite-card ${fav ? 'is-favorite' : ''}" data-favorite="${id}" aria-label="${fav ? 'Убрать из избранного' : 'Добавить в избранное'}" aria-pressed="${fav}">${icon('heart')}</button>
        </div>
      </div>
    </article>`;
  }
  return `<article class="activation-card minor">
    <div class="card-cover" style="background-image:url('${cover}')"></div>
    <div class="card-content">
      <span class="card-status">${subtitle}</span>
      <h3>${title}</h3>
      <p class="card-description">${escapeHTML(item.shortDescription || '')}</p>
      <div class="card-actions">
        <button type="button" class="favorite-card ${fav ? 'is-favorite' : ''}" data-favorite="${id}" aria-label="${fav ? 'Убрать из избранного' : 'Добавить в избранное'}" aria-pressed="${fav}">${icon('heart')}</button>
        <button type="button" class="round-arrow" data-open="${id}" aria-label="Подробнее: ${title}">${icon('arrow')}</button>
      </div>
    </div>
  </article>`;
}

function renderCards() {
  const grid = $('#activationGrid');
  const list = displayActivations();
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">Здесь скоро появятся новые встречи. Заглядывай немного позже.</div>';
    return;
  }
  const featured = list.find((item) => item.featured) || list[0];
  const other = list.filter((item) => item !== featured);
  grid.innerHTML = cardMarkup(featured, true) + other.map((item) => cardMarkup(item, false)).join('');
}

function featuredActivation() {
  return state.activations.find((item) => item.featured) || state.activations[0];
}

function renderFeatured() {
  const item = featuredActivation();
  if (!item) { $('.featured-video').hidden = true; return; }
  setText('featuredTitle', item.title || 'Активация');
  setText('featuredDescription', item.shortDescription || item.description || '');
  setText('featuredDuration', item.duration ? `Длительность: ${item.duration}` : 'Продолжительность уточняется');
  setText('featuredDate', item.releaseDate ? `Дата выхода: ${item.releaseDate}` : 'Дата выхода уточняется');
  const image = $('.video-frame img');
  image.src = safeAsset(item.cover, 'assets/natalia-hero.webp');
  image.alt = `Превью активации «${item.title || ''}»`;
  const button = $('#featuredFavorite');
  button.classList.toggle('is-favorite', isFavorite(item.id));
  button.setAttribute('aria-pressed', String(isFavorite(item.id)));
  $('span', button).textContent = isFavorite(item.id) ? 'В избранном' : 'Добавить в избранное';
}

function closeDialog() {
  $('#modalBackdrop').hidden = true;
  document.body.style.overflow = '';
  if (state.lastFocus?.focus) state.lastFocus.focus();
}

function openDialog(content) {
  state.lastFocus = document.activeElement;
  $('#modalContent').innerHTML = content;
  $('#modalBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#modalClose').focus();
}

function contentDialog(name) {
  if (name === 'consultation') {
    openDialog(`<span class="modal-kicker">Личное пространство</span>
      <h2 id="modalTitle">Индивидуальная консультация</h2>
      <p>${escapeHTML(state.site.consultationText || 'Личный разговор и поддержка на пути к себе.')}</p>
      <p class="notice">Это демонстрационная версия сайта. Контакты Натальи и способ записи добавим после согласования. Заявка пока не отправляется.</p>
      <div class="modal-actions"><button type="button" class="pill-button button-green" data-close>Понятно</button></div>`);
  } else if (name === 'meditations') {
    openDialog(`<span class="modal-kicker">Медитации и практики</span><h2 id="modalTitle">Время для себя</h2>
      <p>Здесь появится аудиотека с бережными практиками. Наталья сможет добавлять записи через CMS, а посетители — слушать их прямо на сайте.</p>
      <p class="notice">Аудиозаписи пока не загружены. Для демонстрации мы не используем вымышленные записи.</p>
      <div class="modal-actions"><button type="button" class="pill-button button-green" data-close>Вернуться на сайт</button></div>`);
  } else if (name === 'account') {
    const list = state.activations.filter((item) => isFavorite(item.id));
    const favorites = list.length ? list.map((item) => `<button type="button" class="favorite-entry" data-open="${escapeHTML(item.id)}"><span>${escapeHTML(item.title)}</span>${icon('arrow')}</button>`).join('') : '<p>Ты пока не добавила ни одной активации в избранное.</p>';
    openDialog(`<span class="modal-kicker">Личное пространство</span><h2 id="modalTitle">Мой кабинет</h2>
      <p>Здесь будут твои активации, сохранённые практики и история встреч.</p>
      <h3 style="font-size:24px;margin:24px 0 12px">Избранное</h3><div class="modal-favorites">${favorites}</div>
      <p class="notice" style="margin-top:22px">Сейчас избранное хранится только в этом браузере. Настоящая регистрация и защищённый кабинет появятся на серверном этапе.</p>`);
  }
}

function activationDialog(id) {
  const item = state.activations.find((entry) => entry.id === id);
  if (!item) return;
  const embed = safeVideoEmbed(item.videoUrl);
  const isSoon = item.status === 'soon';
  const videoMarkup = embed && !isSoon
    ? `<div style="position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:12px;margin-bottom:19px"><iframe src="${escapeHTML(embed)}" title="${escapeHTML(item.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" loading="lazy" style="width:100%;height:100%;border:0"></iframe></div>`
    : `<img class="modal-image" src="${safeAsset(item.cover)}" alt="Обложка активации" />`;
  openDialog(`<span class="modal-kicker">${escapeHTML(item.subtitle || 'Активация')}</span>
    <h2 id="modalTitle">${escapeHTML(item.title)}</h2>
    ${videoMarkup}
    <p>${escapeHTML(item.description || '')}</p>
    ${item.duration ? `<p style="font-size:12px;color:#88767f">Длительность: ${escapeHTML(item.duration)}</p>` : ''}
    ${!embed ? `<p class="notice">${isSoon ? 'Эта встреча пока готовится.' : 'Видеозапись появится здесь, когда Наталья добавит ссылку в CMS.'}</p>` : ''}
    <div class="modal-actions">
      <button type="button" class="outline-button" data-favorite="${escapeHTML(item.id)}">${icon('heart')} ${isFavorite(item.id) ? 'Убрать из избранного' : 'Добавить в избранное'}</button>
      <button type="button" class="pill-button button-green" data-close>Закрыть</button>
    </div>`);
}

function bindEvents() {
  $('#menuButton').addEventListener('click', () => {
    const nav = $('#mobileNav');
    nav.hidden = !nav.hidden;
    $('#menuButton').setAttribute('aria-expanded', String(!nav.hidden));
  });
  $$('#mobileNav a').forEach((link) => link.addEventListener('click', () => {
    $('#mobileNav').hidden = true;
    $('#menuButton').setAttribute('aria-expanded', 'false');
  }));
  $$('.filter-chip').forEach((chip) => chip.addEventListener('click', () => {
    state.filter = chip.dataset.filter;
    $$('.filter-chip').forEach((item) => {
      const selected = item === chip;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    renderCards();
  }));
  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close]');
    if (close) { closeDialog(); return; }
    const open = event.target.closest('[data-open]');
    if (open) { activationDialog(open.dataset.open); return; }
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      const id = favorite.dataset.favorite;
      toggleFavorite(id);
      if (!$('#modalBackdrop').hidden) activationDialog(id);
      return;
    }
    const dialog = event.target.closest('[data-dialog]');
    if (dialog) {
      $('#mobileNav').hidden = true;
      $('#menuButton').setAttribute('aria-expanded', 'false');
      contentDialog(dialog.dataset.dialog);
    }
  });
  $('#featuredPlay').addEventListener('click', () => {
    const item = featuredActivation();
    if (item) activationDialog(item.id);
  });
  $('#featuredFavorite').addEventListener('click', () => {
    const item = featuredActivation();
    if (item) toggleFavorite(item.id);
  });
  $('#modalClose').addEventListener('click', closeDialog);
  $('#modalBackdrop').addEventListener('click', (event) => {
    if (event.target === $('#modalBackdrop')) closeDialog();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('#modalBackdrop').hidden) closeDialog();
    if (event.key === 'Tab' && !$('#modalBackdrop').hidden) {
      const focusables = $$('button, a[href], input, iframe', $('.modal')).filter((node) => !node.disabled);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

async function loadContent() {
  try {
    const [siteResponse, activationsResponse] = await Promise.all([
      fetch('data/site.json', { cache: 'no-store' }),
      fetch('data/activations.json', { cache: 'no-store' }),
    ]);
    if (!siteResponse.ok || !activationsResponse.ok) throw new Error('Сервер не вернул контент');
    state.site = await siteResponse.json();
    const activations = await activationsResponse.json();
    state.activations = Array.isArray(activations)
      ? activations.filter((entry) => entry && entry.id && entry.title)
      : [];
    fillSiteContent();
    renderCards();
    renderFeatured();
  } catch (error) {
    console.error('Ошибка загрузки контента:', error);
    $('#activationGrid').innerHTML = '<div class="empty-state">Не удалось загрузить записи. Пожалуйста, обновите страницу позже.</div>';
    $('.featured-video').hidden = true;
  }
}

function initialize() {
  state.favorites = new Set(favoriteIds());
  $('#year').textContent = String(new Date().getFullYear());
  bindEvents();
  loadContent();
}

initialize();
