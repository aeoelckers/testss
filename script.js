const APP_VERSION = '2024-06-22';
const storageKey = 'plate-records';
const defaultSegments = [
  'Autos para comprar',
  'Autos de remates',
  'Camiones mineros',
  'Camiones transportistas',
  'Otro',
];

const isLikelyStaticHost =
  window.location.protocol === 'file:' ||
  (!['localhost', '127.0.0.1'].includes(window.location.hostname) && !window.location.hostname.endsWith('.local'));

const form = document.getElementById('plate-form');
const versionBadge = document.getElementById('build-version');
const plateInput = document.getElementById('plate-input');
const segmentSelect = document.getElementById('segment-select');
const notesInput = document.getElementById('notes-input');
const tagsInput = document.getElementById('tags-input');
const tableBody = document.getElementById('records-body');
const searchInput = document.getElementById('search-input');
const filterSegment = document.getElementById('filter-segment');
const template = document.getElementById('record-row');
const resetBtn = document.getElementById('reset-btn');
const patenteChileLink = document.getElementById('patentechile-link');
const lookupBtn = document.getElementById('lookup-btn');
const lookupStatus = document.getElementById('lookup-status');
const manualPanel = document.getElementById('manual-panel');
const manualToggle = document.getElementById('manual-toggle');
const modeBanner = document.getElementById('mode-banner');
const modeBannerTitle = modeBanner?.querySelector('.banner__title');
const modeBannerBody = modeBanner?.querySelector('.banner__body');

const featureVehicle = document.getElementById('feature-vehicle');
const featureYear = document.getElementById('feature-year');
const featureOrigin = document.getElementById('feature-origin');
const featurePermit = document.getElementById('feature-permit');
const featureInspection = document.getElementById('feature-inspection');
const featureKms = document.getElementById('feature-kms');
const featurePrice = document.getElementById('feature-price');

let records = [];

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) {
      records = saved.map((record) => ({ ...record, features: record.features || {} }));
    }
  } catch (err) {
    console.error('No se pudieron cargar los datos guardados', err);
  }
}

function persistRecords() {
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function normalizePlate(value) {
  return value
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function parseTags(raw) {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function truncate(text, length = 160) {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function collectFeatures() {
  return {
    vehicle: featureVehicle.value.trim(),
    year: featureYear.value.trim(),
    origin: featureOrigin.value.trim(),
    permit: featurePermit.value.trim(),
    inspection: featureInspection.value.trim(),
    kms: featureKms.value.trim(),
    price: featurePrice.value.trim(),
  };
}

function formatFeatures(features = {}) {
  const entries = [
    ['Vehículo', features.vehicle],
    ['Año', features.year],
    ['Origen', features.origin],
    ['Permiso', features.permit],
    ['Última R.T.', features.inspection],
    ['Kms', features.kms],
    ['Precio', features.price],
  ];

  return entries
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join(' • ');
}

function formatFromFields(fields) {
  return Object.entries(fields)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

function extractFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tr'));
  const fields = {};
  const orderedPairs = [];

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('th,td'));
    if (cells.length < 2) return;

    const key = cells[0].textContent.trim();
    const value = cells[1].textContent.trim();
    if (!key || !value) return;
    if (key.toLowerCase().includes('información vehicular')) return;

    fields[key] = value;
    orderedPairs.push([key, value]);
  });

  const summary = orderedPairs.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { fields, summary };
}

function buildSummary(payload) {
  if (!payload) return '';

  if (payload.summary) {
    return payload.summary;
  }

  if (payload.fields && Object.keys(payload.fields).length) {
    return formatFromFields(payload.fields);
  }

  if (payload.html) {
    const { summary } = extractFromHtml(payload.html);
    if (summary) return summary;

    const doc = new DOMParser().parseFromString(payload.html, 'text/html');
    const text = doc.body?.innerText?.trim();
    if (text) {
      return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
    }
  }

  return '';
}

function renderFilters() {
  const segments = new Set([...defaultSegments, ...records.map((r) => r.segment)]);
  filterSegment.innerHTML = '<option value="">Todos</option>';
  segments.forEach((segment) => {
    const option = document.createElement('option');
    option.value = segment;
    option.textContent = segment;
    filterSegment.appendChild(option);
  });
}

function renderRecords() {
  tableBody.innerHTML = '';

  const query = normalizePlate(searchInput.value);
  const segment = filterSegment.value;

  const filtered = records.filter((record) => {
    const plateMatch = query ? record.plate.includes(query) : true;
    const segmentMatch = segment ? record.segment === segment : true;
    return plateMatch && segmentMatch;
  });

  if (!filtered.length) {
    const row = document.createElement('tr');
    row.classList.add('empty');
    row.innerHTML = '<td colspan="7">Aún no hay patentes guardadas.</td>';
    tableBody.appendChild(row);
    return;
  }

  filtered
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((record) => {
      const row = template.content.cloneNode(true).querySelector('tr');
      row.dataset.id = record.id;

      row.querySelector('.plate').textContent = record.plate;
      row.querySelector('.segment').textContent = record.segment;
      const details = formatFeatures(record.features);
      row.querySelector('.details').textContent = details ? truncate(details, 120) : '—';
      row.querySelector('.notes').textContent = truncate(record.notes);

      const tagsCell = row.querySelector('.tags');
      if (record.tags.length) {
        record.tags.forEach((tag) => {
          const badge = document.createElement('span');
          badge.className = 'tag';
          badge.textContent = tag;
          tagsCell.appendChild(badge);
        });
      } else {
        tagsCell.textContent = '—';
      }

      row.querySelector('.timestamp').textContent = formatTimestamp(record.timestamp);

      const copyBtn = row.querySelector('.copy');
      copyBtn.addEventListener('click', () => copyPlate(record.plate));

      const deleteBtn = row.querySelector('.delete');
      deleteBtn.addEventListener('click', () => deleteRecord(record.id));

      tableBody.appendChild(row);
    });
}

function copyPlate(plate) {
  navigator.clipboard
    .writeText(plate)
    .then(() => {
      copyFeedback('Patente copiada');
    })
    .catch(() => copyFeedback('No se pudo copiar'));
}

function copyFeedback(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'toast';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}

function openManualPanel() {
  manualPanel.classList.add('manual--open');
  manualToggle.setAttribute('aria-expanded', 'true');
}

function closeManualPanel() {
  manualPanel.classList.remove('manual--open');
  manualToggle.setAttribute('aria-expanded', 'false');
}

function toggleManualPanel() {
  const isOpen = manualPanel.classList.toggle('manual--open');
  manualToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function deleteRecord(id) {
  records = records.filter((r) => r.id !== id);
  persistRecords();
  renderFilters();
  renderRecords();
}

function addRecord(event) {
  event.preventDefault();

  const plate = normalizePlate(plateInput.value);
  const segment = segmentSelect.value;
  const notes = notesInput.value.trim();
  const tags = parseTags(tagsInput.value);
  const features = collectFeatures();

  if (!plate) {
    plateInput.focus();
    return;
  }

  const record = {
    id: crypto.randomUUID(),
    plate,
    segment,
    notes,
    tags,
    features,
    timestamp: Date.now(),
  };

  records.unshift(record);
  persistRecords();
  renderFilters();
  renderRecords();
  form.reset();
  segmentSelect.value = segment;
  plateInput.focus();
}

function setLookupStatus(message, tone = 'muted') {
  lookupStatus.textContent = message;
  lookupStatus.dataset.tone = tone;
}

function setDefaultLookupMessage() {
  if (isLikelyStaticHost) {
    setLookupStatus(
      'El sitio intentará consultar patentechile.com usando proxies públicos; si falla, puedes abrir la página oficial y pegar los datos.',
      'warning',
    );
    return;
  }

  setLookupStatus('Usa el botón para intentar leer los datos automáticamente desde patentechile.com.', 'muted');
}

function setVersionBadge() {
  if (!versionBadge) return;

  const hostLabel = isLikelyStaticHost ? 'modo estático (sin proxy)' : 'modo local/proxy';
  versionBadge.textContent = `v${APP_VERSION} · ${hostLabel}`;
  versionBadge.title =
    'Si no ves este número después de publicar, fuerza un refresh (Ctrl+Shift+R) o sube con una versión de assets nueva.';
}

function renderModeBanner() {
  if (!modeBanner || !modeBannerTitle || !modeBannerBody) return;

  if (isLikelyStaticHost) {
    modeBanner.dataset.tone = 'warning';
    modeBannerTitle.textContent = `Modo estático · v${APP_VERSION}`;
    modeBannerBody.textContent =
      'Esta copia es estática (ej. GitHub Pages). El botón de búsqueda intentará usar proxies públicos; si fallan, abre la web oficial y pega los datos. Si sigues viendo otro diseño, fuerza Ctrl+Shift+R hasta que aparezca esta versión.';
    return;
  }

  modeBanner.dataset.tone = 'info';
  modeBannerTitle.textContent = `Modo local/proxy · v${APP_VERSION}`;
  modeBannerBody.textContent =
    'Aquí el botón de búsqueda usará el proxy local para leer patentechile.com. Puede tardar unos segundos si el sitio muestra anuncios; revisa la consola si falla.';
}

async function fetchFromLocalProxy(plate) {
  const res = await fetch(`/api/proxy?plate=${encodeURIComponent(plate)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('El proxy local no está disponible en esta copia.');
    }
    throw new Error(`No se pudo obtener datos (HTTP ${res.status}).`);
  }

  const payload = await res.json();
  if (payload?.error) {
    throw new Error(payload.error);
  }

  const summary = buildSummary(payload);
  if (!summary) {
    throw new Error('No se encontraron datos legibles en la respuesta del proxy.');
  }

  return { summary, source: 'proxy local' };
}

async function fetchFromAllOrigins(plate) {
  const target = `https://www.patentechile.com/?patente=${encodeURIComponent(plate)}`;
  const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;

  const res = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!res.ok) {
    throw new Error(`AllOrigins devolvió HTTP ${res.status}`);
  }

  const html = await res.text();
  const { summary } = extractFromHtml(html);
  if (!summary) {
    throw new Error('La página respondió sin datos reconocibles.');
  }

  return { summary, source: 'proxy público AllOrigins' };
}

async function fetchFromJina(plate) {
  const target = `https://www.patentechile.com/?patente=${encodeURIComponent(plate)}`;
  const url = `https://r.jina.ai/${target}`;
  const res = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!res.ok) {
    throw new Error(`Jina AI devolvió HTTP ${res.status}`);
  }

  const text = await res.text();
  const startIndex = text.indexOf('<html');
  const html = startIndex >= 0 ? text.slice(startIndex) : text;
  const { summary } = extractFromHtml(html);
  if (!summary) {
    throw new Error('Jina AI respondió sin datos reconocibles.');
  }

  return { summary, source: 'proxy público Jina AI' };
}

async function lookupPlate() {
  const plate = normalizePlate(plateInput.value);
  if (!plate) {
    plateInput.focus();
    setLookupStatus('Ingresa una patente para consultarla.', 'warning');
    return;
  }

  setLookupStatus('Buscando en patentechile.com…', 'info');
  lookupBtn.disabled = true;

  const attempts = [];
  if (!isLikelyStaticHost) {
    attempts.push(fetchFromLocalProxy);
  }
  attempts.push(fetchFromAllOrigins, fetchFromJina);

  for (const fetcher of attempts) {
    try {
      const { summary, source } = await fetcher(plate);
      notesInput.value = summary;
      openManualPanel();
      setLookupStatus(`Datos obtenidos vía ${source}. Revisa y guarda en el CRM.`, 'success');
      lookupBtn.disabled = false;
      return;
    } catch (err) {
      console.warn('Intento fallido:', err.message);
    }
  }

  setLookupStatus(
    'No pudimos leer los datos automáticamente. Abre patentechile.com en otra pestaña, copia la tabla y pégala aquí.',
    'error',
  );
  lookupBtn.disabled = false;
}

function init() {
  setVersionBadge();
  renderModeBanner();
  loadRecords();
  renderFilters();
  renderRecords();

  form.addEventListener('submit', addRecord);
  searchInput.addEventListener('input', renderRecords);
  filterSegment.addEventListener('change', renderRecords);
  resetBtn.addEventListener('click', () => {
    plateInput.focus();
    closeManualPanel();
  });

  patenteChileLink.addEventListener('click', () => {
    const plate = normalizePlate(plateInput.value);
    const url = 'https://www.patentechile.com/';
    const target = plate ? `${url}?patente=${encodeURIComponent(plate)}` : url;
    window.open(target, '_blank', 'noopener');
  });

  lookupBtn.addEventListener('click', lookupPlate);
  manualToggle.addEventListener('click', toggleManualPanel);
  closeManualPanel();
  setDefaultLookupMessage();
}

document.addEventListener('DOMContentLoaded', init);
