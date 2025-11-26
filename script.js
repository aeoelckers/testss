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

function buildSummary(payload) {
  if (!payload) return '';

  if (payload.summary) {
    return payload.summary;
  }

  if (payload.fields && Object.keys(payload.fields).length) {
    return formatFromFields(payload.fields);
  }

  if (payload.html) {
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
      'En GitHub Pages u otro hosting estático, el autollenado requiere que corras server.py en tu computador.',
      'warning',
    );
    return;
  }

  setLookupStatus('Usa el botón para intentar leer los datos automáticamente desde patentechile.com.', 'muted');
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

  try {
    const res = await fetch(`/api/proxy?plate=${encodeURIComponent(plate)}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('El proxy no está disponible en esta copia estática. Corre python server.py en local.');
      }
      throw new Error(`No se pudo obtener datos (HTTP ${res.status}).`);
    }

    const payload = await res.json();
    if (payload?.error) {
      throw new Error(payload.error);
    }

    if (!payload?.html) {
      throw new Error('Respuesta vacía');
    }

    const summary = buildSummary(payload);
    if (!summary) {
      throw new Error('No se encontraron datos legibles.');
    }

    notesInput.value = summary;
    openManualPanel();
    setLookupStatus('Datos obtenidos. Revisa y guarda en el CRM.', 'success');
  } catch (err) {
    console.error(err);
    const manualHint = isLikelyStaticHost
      ? 'En GitHub Pages el botón de autollenado no funciona; abre la web oficial y pega los datos aquí.'
      : 'Abre la pestaña de patentechile.com y copia la info en la ficha manual.';

    setLookupStatus(
      `No pudimos leer los datos automáticamente (${err.message}). ${manualHint}`,
      'error',
    );
  } finally {
    lookupBtn.disabled = false;
  }
}

function init() {
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
