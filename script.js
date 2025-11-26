const APP_VERSION = '2024-06-23';
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

const captureInput = document.getElementById('capture-input');
const captureStatus = document.getElementById('capture-status');
const capturePreview = document.getElementById('capture-preview');
const captureUploader = document.getElementById('capture-uploader');

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

function buildFieldMap(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const map = {};
  lines.forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key && value) {
        map[key] = value;
      }
      return;
    }

    const tokens = line.split(/\s{2,}/);
    if (tokens.length === 2) {
      const [key, value] = tokens;
      if (key && value) {
        map[key.trim()] = value.trim();
      }
    }
  });

  return { map, lines };
}

function parseVehicleData(text) {
  const { map, lines } = buildFieldMap(text);

  const get = (keys) => {
    for (const key of keys) {
      if (map[key]) return map[key];
      const line = lines.find((l) => l.toLowerCase().startsWith(`${key.toLowerCase()} `));
      if (line) {
        return line.replace(new RegExp(`^${key}`, 'i'), '').trim();
      }
    }
    return '';
  };

  const regexFind = (pattern) => {
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  };

  const plate =
    regexFind(/patente\s*[:\-]?\s*([A-Z0-9-]{5,8})/i) ||
    regexFind(/placa\s*[:\-]?\s*([A-Z0-9-]{5,8})/i) ||
    get(['Patente']);

  const marca = get(['Marca']);
  const modelo = get(['Modelo']);
  const vehicle = [marca, modelo].filter(Boolean).join(' ');

  const year =
    regexFind(/Año\s*[:\-]?\s*(\d{4})/i) ||
    regexFind(/AÑO DE PAGO\s*[:\-]?\s*(\d{4})/i) ||
    get(['Año']);

  const origin =
    get(['Procedencia', 'Comuna de revisión', 'Municipalidad']) ||
    regexFind(/Procedencia\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ\s]+)/i);

  const permit =
    get(['Permiso de circulación', 'Permiso de circulacion']) ||
    get(['Año de pago']) ||
    regexFind(/Permiso.*?(\d{4}[^\n]*)/i);

  const inspection =
    get(['Fecha de vencimiento', 'Fecha de vencimiento RT', 'Último control']) ||
    regexFind(/Último control\s*[:\-]?\s*([0-9\-\/]+)/i);

  const kms =
    get(['Kilometraje']) ||
    regexFind(/Kilometraje\s*[:\-]?\s*([0-9\.\s]+km[^\n]*)/i);

  const price = get(['Precio', 'Valor']);

  const fields = {
    Patente: plate,
    Marca: marca,
    Modelo: modelo,
    Año: year,
    Procedencia: origin,
    'Permiso de circulación': permit,
    'Revisión técnica': inspection,
    Kilometraje: kms,
  };

  const summary = formatFromFields(
    Object.fromEntries(Object.entries(fields).filter(([, v]) => Boolean(v)))
  );

  return {
    plate,
    summary,
    features: {
      vehicle,
      year,
      origin,
      permit,
      inspection,
      kms,
      price,
    },
  };
}

function setCaptureStatus(message, tone = 'muted') {
  if (!captureStatus) return;
  captureStatus.textContent = message;
  captureStatus.dataset.tone = tone;
}

function setCapturePreview(content) {
  if (!capturePreview) return;
  capturePreview.innerHTML = '';
  if (!content) return;
  capturePreview.appendChild(content);
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

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function ensurePdfWorker() {
  if (!window.pdfjsLib) {
    throw new Error('pdf.js no está disponible en esta copia.');
  }
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/build/pdf.worker.min.js';
  }
}

async function renderPdfToImages(file) {
  ensurePdfWorker();
  const data = await readFileAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  const images = [];

  const pageCount = Math.min(pdf.numPages, 3);
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    images.push(canvas.toDataURL('image/png'));
  }

  return { images, pages: pdf.numPages };
}

async function ocrImage(dataUrl) {
  if (!window.Tesseract) {
    throw new Error('Tesseract no está disponible en esta copia.');
  }
  const { data } = await window.Tesseract.recognize(dataUrl, 'spa', {
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-abcdefghijklmnopqrstuvwxyzÁÉÍÓÚÜÑáéíóúüñ./() ',
  });
  return data.text || '';
}

function applyParsedData(parsed, originLabel = 'OCR') {
  if (!parsed) return;

  if (parsed.plate) {
    plateInput.value = normalizePlate(parsed.plate);
  }

  if (parsed.summary) {
    notesInput.value = parsed.summary;
  }

  const { features } = parsed;
  if (features) {
    featureVehicle.value = features.vehicle || featureVehicle.value;
    featureYear.value = features.year || featureYear.value;
    featureOrigin.value = features.origin || featureOrigin.value;
    featurePermit.value = features.permit || featurePermit.value;
    featureInspection.value = features.inspection || featureInspection.value;
    featureKms.value = features.kms || featureKms.value;
    featurePrice.value = features.price || featurePrice.value;
  }

  openManualPanel();
  setCaptureStatus(`Datos extraídos de ${originLabel}. Revisa y completa si falta algo.`, 'success');
}

async function handleImageFile(file) {
  setCaptureStatus(`Leyendo ${file.name}…`, 'info');
  const dataUrl = await readFileAsDataURL(file);

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = `Vista previa de ${file.name}`;
  setCapturePreview(img);

  const text = await ocrImage(dataUrl);
  const parsed = parseVehicleData(text);
  applyParsedData(parsed, file.name);
}

async function handlePdfFile(file) {
  setCaptureStatus(`Procesando PDF ${file.name}…`, 'info');
  const { images, pages } = await renderPdfToImages(file);

  const preview = document.createElement('div');
  preview.className = 'uploader__preview-pages';
  preview.textContent = `PDF con ${pages} página(s). Analizando primeras ${images.length}.`;
  setCapturePreview(preview);

  const chunks = [];
  for (const [index, image] of images.entries()) {
    setCaptureStatus(`Reconociendo página ${index + 1}…`, 'info');
    const text = await ocrImage(image);
    chunks.push(text);
  }

  const parsed = parseVehicleData(chunks.join('\n'));
  applyParsedData(parsed, file.name);
}

async function handleCapture(file) {
  if (!file) return;
  setCapturePreview(null);
  try {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      await handlePdfFile(file);
    } else {
      await handleImageFile(file);
    }
  } catch (err) {
    console.error('Error al procesar archivo', err);
    setCaptureStatus(
      `No se pudo leer el archivo. Intenta nuevamente o pega los datos manualmente. (${err.message})`,
      'error',
    );
  }
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

  if (captureInput) {
    captureInput.addEventListener('change', (event) => {
      const [file] = event.target.files || [];
      handleCapture(file);
    });
  }

  if (captureUploader) {
    ['dragenter', 'dragover'].forEach((evt) => {
      captureUploader.addEventListener(evt, (event) => {
        event.preventDefault();
        captureUploader.classList.add('uploader--active');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      captureUploader.addEventListener(evt, () => {
        captureUploader.classList.remove('uploader--active');
      });
    });

    captureUploader.addEventListener('drop', (event) => {
      event.preventDefault();
      const [file] = event.dataTransfer?.files || [];
      handleCapture(file);
    });
  }

  setCaptureStatus('Esperando archivo…', 'muted');
}

document.addEventListener('DOMContentLoaded', init);
