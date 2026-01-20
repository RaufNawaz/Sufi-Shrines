/* global L, Papa */

// Your Google Sheets published CSV link (already included)
const CSV_FILE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv";

const DEFAULT_CENTER = [31.5204, 74.3587]; // Lahore
const DEFAULT_ZOOM = 6;

const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const sidebarEl = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggle");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function normalizeUrl(u) {
  if (!u) return null;
  u = String(u).trim();
  if (!u) return null;
  if (u.startsWith("//")) u = "https:" + u;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, "");
  return u;
}

function trimRowKeysAndValues(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim();
    out[key] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

function parseLatLng(row) {
  const lat = parseFloat(row.Latitude);
  const lng = parseFloat(row.Longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function clearDetails() {
  detailsEl.innerHTML = `<p class="muted">No shrine selected yet. Click a marker to view details.</p>`;
}

function openSidebar() {
  sidebarEl.classList.remove("collapsed");
  setTimeout(() => map.invalidateSize(), 220);
}

function collapseSidebar() {
  sidebarEl.classList.add("collapsed");
  setTimeout(() => map.invalidateSize(), 220);
}

function toggleSidebar() {
  sidebarEl.classList.toggle("collapsed");
  setTimeout(() => map.invalidateSize(), 220);
}

sidebarToggleBtn.addEventListener("click", toggleSidebar);

function renderDetails(rowRaw) {
  const row = trimRowKeysAndValues(rowRaw);
  const title = row.Name || "Shrine";
  const imgUrl = normalizeUrl(row["Image Link"] || row.Image || row.image);

  const parts = [];

  if (imgUrl) {
    parts.push(
      `<img class="preview" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" onerror="this.style.display='none';" />`,
    );
  }

  parts.push(
    `<h2 style="margin:0 0 10px; font-size:16px;">${escapeHtml(title)}</h2>`,
  );

  const skipKeys = new Set([
    "Latitude",
    "Longitude",
    "Image Link",
    "Image",
    "image",
    "image_url",
    "photo",
    "photo_url",
  ]);

  for (const [k, v] of Object.entries(row)) {
    if (skipKeys.has(k)) continue;
    if (v === null || v === undefined) continue;

    const sv = String(v).trim();
    if (!sv) continue;

    if (/^https?:\/\//i.test(sv) || sv.startsWith("www.")) {
      const href = sv.startsWith("www.") ? "https://" + sv : sv;
      parts.push(
        `<div class="row"><b>${escapeHtml(k)}:</b> <a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(sv)}</a></div>`,
      );
    } else {
      parts.push(
        `<div class="row"><b>${escapeHtml(k)}:</b> ${escapeHtml(sv)}</div>`,
      );
    }
  }

  detailsEl.innerHTML = parts.join("");
}

// Map
const map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
setTimeout(() => map.invalidateSize(), 0);

// Basemap
L.tileLayer(
  "https://api.maptiler.com/maps/bright-v2/{z}/{x}/{y}.png?key=WDmTVcrwlj7v2t6K2h5d",
  {
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 20,
    attribution: "&copy; MapTiler &copy; OpenStreetMap contributors",
  },
).addTo(map);

// Store rows + markers
const markers = [];
const rowsStore = [];

// Table dropdown element (inside the button control)
let tablePanelEl = null;

// Clicking map clears everything
map.on("click", () => {
  clearDetails();
  collapseSidebar();
  hideTablePanel();
});

// ---------- Table of Shrines control (single control, no gap) ----------
function buildTableControls() {
  const BtnControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function () {
      const container = L.DomUtil.create(
        "div",
        "leaflet-control shrine-table-btn",
      );

      const btn = L.DomUtil.create("button", "", container);
      btn.type = "button";
      btn.innerHTML = `
        <svg class="shrine-table-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#111827" d="M12 2 1 7l11 5 11-5-11-5Zm0 8L1 5v3l11 5 11-5V5l-11 5Zm0 6L1 11v3l11 5 11-5v-3l-11 5Z"/>
        </svg>
        <span>Table of Shrines</span>
      `;

      // Dropdown panel lives INSIDE this same container => no Leaflet gap
      const panel = L.DomUtil.create("div", "shrine-drop hidden", container);
      panel.innerHTML = `<div class="panel-list" id="shrinePanelList"></div>`;
      tablePanelEl = panel;

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      L.DomEvent.on(btn, "click", (e) => {
        L.DomEvent.stop(e);
        toggleTablePanel();
      });

      return container;
    },
  });

  map.addControl(new BtnControl());
}

function toggleTablePanel() {
  if (!tablePanelEl) return;
  tablePanelEl.classList.toggle("hidden");
}

function hideTablePanel() {
  if (!tablePanelEl) return;
  tablePanelEl.classList.add("hidden");
}

function renderTableList() {
  const list = document.getElementById("shrinePanelList");
  if (!list) return;

  list.innerHTML = "";

  rowsStore.forEach((row, idx) => {
    const title = (row.Name || `Shrine ${idx + 1}`).trim();

    const item = document.createElement("button");
    item.className = "panel-item";
    item.type = "button";
    item.textContent = title;

    item.addEventListener("click", (e) => {
      e.stopPropagation();

      const ll = parseLatLng(row);
      if (!ll || !markers[idx]) return;

      map.flyTo([ll.lat, ll.lng], Math.max(map.getZoom(), 13), {
        duration: 0.8,
      });
      renderDetails(row);
      openSidebar();
      hideTablePanel();
    });

    list.appendChild(item);
  });
}

// ---------- Markers ----------
function addMarker(rowRaw, idx) {
  const row = trimRowKeysAndValues(rowRaw);
  const ll = parseLatLng(row);
  if (!ll) return;

  const title = row.Name || `Shrine ${idx + 1}`;

  const m = L.marker([ll.lat, ll.lng]).addTo(map);
  m.bindTooltip(title, { direction: "top", offset: [0, -8] });

  m.on("click", (e) => {
    if (e && e.originalEvent) e.originalEvent.stopPropagation();

    map.setView([ll.lat, ll.lng], Math.max(map.getZoom(), 13));
    renderDetails(row);
    openSidebar();
    hideTablePanel();
  });

  markers[idx] = m;
}

// ---------- Load CSV ----------
function loadCsv() {
  setStatus("Loading data…");

  Papa.parse(CSV_FILE, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = (results.data || []).map(trimRowKeysAndValues);
      rowsStore.length = 0;
      rowsStore.push(...rows);

      if (!rowsStore.length) {
        setStatus("Loaded CSV but found no rows.");
        clearDetails();
        collapseSidebar();
        return;
      }

      rowsStore.forEach((r, idx) => addMarker(r, idx));

      const validMarkers = markers.filter(Boolean);
      if (!validMarkers.length) {
        setStatus(
          "No valid points found. Check Latitude and Longitude columns.",
        );
        clearDetails();
        collapseSidebar();
        return;
      }

      // Fit all shrines but do not zoom in beyond DEFAULT_ZOOM
      const fg = L.featureGroup(validMarkers);
      map.fitBounds(fg.getBounds().pad(0.3), { maxZoom: DEFAULT_ZOOM });

      setStatus("");
      clearDetails();
      collapseSidebar();

      buildTableControls();
      // Wait a tick so the control DOM exists before rendering list
      setTimeout(renderTableList, 0);
    },
    error: (err) => {
      console.error("CSV load error:", err);
      setStatus(`Failed to load CSV.\n${err?.message || String(err)}`);
      clearDetails();
      collapseSidebar();
    },
  });
}

loadCsv();
