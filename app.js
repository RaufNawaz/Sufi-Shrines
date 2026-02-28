/* global L, Papa */

const CSV_FILE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv";

const DEFAULT_CENTER = [31.5204, 74.3587];
const DEFAULT_ZOOM = 6;
const SIDEBAR_RESIZE_DELAY_MS = 220;
const NO_SELECTION_MESSAGE =
  '<p class="muted">No shrine selected yet. Click a marker to view details.</p>';
const IMAGE_KEYS = new Set([
  "Image Link",
  "Image",
  "image",
  "image_url",
  "photo",
  "photo_url",
]);
const NON_DETAIL_KEYS = new Set(["Latitude", "Longitude", ...IMAGE_KEYS]);

const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const sidebarEl = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggle");

const map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
const markers = [];
const rowsStore = [];

let tablePanelEl = null;
let selectedIdx = null;

setTimeout(() => map.invalidateSize(), 0);

const streetsLayer = L.tileLayer(
  "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=WDmTVcrwlj7v2t6K2h5d",
  {
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 20,
    attribution: "&copy; MapTiler &copy; OpenStreetMap contributors",
  },
);

const topoLayer = L.tileLayer(
  "https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=WDmTVcrwlj7v2t6K2h5d",
  {
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 20,
    attribution: "&copy; MapTiler &copy; OpenStreetMap contributors",
  },
);

const voyagerLayer = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    subdomains: "abcd",
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
);

const esriStreetsLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri",
  },
);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri",
  },
);

streetsLayer.addTo(map);

L.control
  .layers(
    {
      "Streets (MapTiler)": streetsLayer,
      "Topo (MapTiler)": topoLayer,
      "Voyager (CARTO)": voyagerLayer,
      "Streets (Esri)": esriStreetsLayer,
      "Satellite (Esri)": satelliteLayer,
    },
    null,
    { position: "bottomleft" },
  )
  .addTo(map);

function setStatus(message) {
  statusEl.textContent = message || "";
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return null;

  let url = String(rawUrl).trim();
  if (!url) return null;

  if (url.startsWith("//")) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, "")}`;

  return url;
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("www.");
}

function normalizeSheetRow(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = String(key).trim();
    normalized[normalizedKey] = typeof value === "string" ? value.trim() : value;
  }

  return normalized;
}

function parseLatLng(row) {
  const lat = Number.parseFloat(row.Latitude);
  const lng = Number.parseFloat(row.Longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function clearDetails() {
  detailsEl.innerHTML = NO_SELECTION_MESSAGE;
}

function refreshMapAfterLayoutChange() {
  setTimeout(() => map.invalidateSize(), SIDEBAR_RESIZE_DELAY_MS);
}

function setSidebarCollapsed(collapsed) {
  sidebarEl.classList.toggle("collapsed", collapsed);
  refreshMapAfterLayoutChange();
}

function openSidebar() {
  setSidebarCollapsed(false);
}

function collapseSidebar() {
  setSidebarCollapsed(true);
}

function toggleSidebar() {
  setSidebarCollapsed(!sidebarEl.classList.contains("collapsed"));
}

sidebarToggleBtn.addEventListener("click", toggleSidebar);

function buildDetailRow(label, value) {
  if (isLikelyUrl(value)) {
    const href = value.startsWith("www.") ? `https://${value}` : value;
    return `<div class="row"><b>${escapeHtml(label)}:</b> <a href="${escapeHtml(
      href,
    )}" target="_blank" rel="noopener">${escapeHtml(value)}</a></div>`;
  }

  return `<div class="row"><b>${escapeHtml(label)}:</b> ${escapeHtml(
    value,
  )}</div>`;
}

function getShrinePageUrl(idx) {
  return `./shrine.html?id=${encodeURIComponent(idx)}`;
}

function renderDetails(rawRow, rowIdx = null) {
  const row = normalizeSheetRow(rawRow);
  const title = row.Name || "Shrine";
  const resolvedIdx = Number.isInteger(rowIdx) ? rowIdx : rowsStore.indexOf(rawRow);
  const detailsLink =
    resolvedIdx >= 0
      ? `<a class="details-title-link" href="${escapeHtml(
          getShrinePageUrl(resolvedIdx),
        )}">${escapeHtml(title)}</a>`
      : escapeHtml(title);
  const imageUrl = normalizeUrl(
    row["Image Link"] || row.Image || row.image || row.image_url,
  );
  const parts = [];

  if (imageUrl) {
    parts.push(
      `<img class="preview" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" onerror="this.style.display='none';" />`,
    );
  }

  parts.push(`<h2 class="details-title">${detailsLink}</h2>`);

  for (const [key, value] of Object.entries(row)) {
    if (NON_DETAIL_KEYS.has(key) || value === null || value === undefined) {
      continue;
    }

    const textValue = String(value).trim();
    if (!textValue) continue;

    parts.push(buildDetailRow(key, textValue));
  }

  detailsEl.innerHTML = parts.join("");
}

function makeDotIcon({ selected = false, hover = false } = {}) {
  const classes = ["shrine-dot"];
  if (selected) classes.push("selected");
  if (hover) classes.push("hover");

  return L.divIcon({
    className: "",
    html: `<div class="${classes.join(" ")}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function setSelected(idx) {
  if (selectedIdx !== null && markers[selectedIdx]) {
    markers[selectedIdx].setIcon(makeDotIcon());
  }

  selectedIdx = idx;

  if (selectedIdx !== null && markers[selectedIdx]) {
    markers[selectedIdx].setIcon(makeDotIcon({ selected: true }));
  }
}

map.on("click", () => {
  clearDetails();
  collapseSidebar();
  hideTablePanel();
  setSelected(null);
});

function toggleTablePanel() {
  if (tablePanelEl) tablePanelEl.classList.toggle("hidden");
}

function hideTablePanel() {
  if (tablePanelEl) tablePanelEl.classList.add("hidden");
}

function groupRowsByCategory(rows) {
  const groups = new Map();

  rows.forEach((row, idx) => {
    const category = (row.Category || "Uncategorized").trim() || "Uncategorized";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ row, idx });
  });

  const categories = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const hasUncategorized = categories.includes("Uncategorized");
  const orderedCats = hasUncategorized
    ? categories.filter((cat) => cat !== "Uncategorized").concat("Uncategorized")
    : categories;

  return { groups, orderedCats };
}

function renderTableList(searchTerm = "") {
  const list = document.getElementById("shrinePanelList");
  if (!list) return;

  const query = String(searchTerm || "")
    .trim()
    .toLowerCase();
  list.innerHTML = "";

  const { groups, orderedCats } = groupRowsByCategory(rowsStore);
  let totalShown = 0;

  orderedCats.forEach((cat) => {
    const items = groups.get(cat) || [];
    const filtered = query
      ? items.filter(({ row }) => (row.Name || "").toLowerCase().includes(query))
      : items;

    if (!filtered.length) return;

    const groupEl = document.createElement("div");
    groupEl.className = "group collapsed";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "group-header";
    header.innerHTML = `
      <span>${escapeHtml(cat)}</span>
      <span class="group-meta">
        <span class="count">${filtered.length}</span>
        <span class="group-chevron"></span>
      </span>
    `;

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "group-items";

    header.addEventListener("click", (event) => {
      event.stopPropagation();
      groupEl.classList.toggle("collapsed");
    });

    filtered.forEach(({ row, idx }) => {
      const title = (row.Name || `Shrine ${idx + 1}`).trim();

      const item = document.createElement("button");
      item.className = "panel-item";
      item.type = "button";
      item.textContent = title;

      item.addEventListener("click", (event) => {
        event.stopPropagation();

        const latLng = parseLatLng(row);
        if (!latLng || !markers[idx]) return;

        setSelected(idx);
        map.flyTo([latLng.lat, latLng.lng], Math.max(map.getZoom(), 13), {
          duration: 0.8,
        });
        renderDetails(row, idx);
        openSidebar();
        hideTablePanel();

        const searchInput = document.getElementById("shrineSearch");
        if (searchInput) searchInput.value = "";
        renderTableList("");
      });

      itemsWrap.appendChild(item);
      totalShown += 1;
    });

    groupEl.appendChild(header);
    groupEl.appendChild(itemsWrap);
    list.appendChild(groupEl);
  });

  if (totalShown === 0) {
    const empty = document.createElement("div");
    empty.className = "panel-empty";
    empty.textContent = "No matches.";
    list.appendChild(empty);
  }
}

function buildTableControls() {
  const TableControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: () => {
      const container = L.DomUtil.create(
        "div",
        "leaflet-control shrine-table-btn",
      );

      const button = L.DomUtil.create("button", "", container);
      button.type = "button";
      button.innerHTML = `
        <svg class="shrine-table-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#111827" d="M12 2 1 7l11 5 11-5-11-5Zm0 8L1 5v3l11 5 11-5V5l-11 5Zm0 6L1 11v3l11 5 11-5v-3l-11 5Z"/>
        </svg>
        <span>Table of Shrines</span>
      `;

      tablePanelEl = L.DomUtil.create("div", "shrine-drop hidden", container);
      tablePanelEl.innerHTML = `
        <div class="panel-search">
          <input id="shrineSearch" type="text" placeholder="Search shrines..." autocomplete="off" />
        </div>
        <div class="panel-list" id="shrinePanelList"></div>
      `;

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.stop(event);
        toggleTablePanel();

        if (tablePanelEl && !tablePanelEl.classList.contains("hidden")) {
          setTimeout(() => {
            const searchInput = document.getElementById("shrineSearch");
            if (searchInput) searchInput.focus();
          }, 0);
        }
      });

      setTimeout(() => {
        const searchInput = document.getElementById("shrineSearch");
        if (!searchInput) return;
        searchInput.addEventListener("input", () => {
          renderTableList(searchInput.value);
        });
      }, 0);

      return container;
    },
  });

  map.addControl(new TableControl());
}

function addMarker(rawRow, idx) {
  const row = normalizeSheetRow(rawRow);
  const latLng = parseLatLng(row);
  if (!latLng) return;

  const title = row.Name || `Shrine ${idx + 1}`;
  const marker = L.marker([latLng.lat, latLng.lng], {
    icon: makeDotIcon(),
  }).addTo(map);

  marker.bindPopup(
    `<a class="popup-shrine-link" href="${escapeHtml(
      getShrinePageUrl(idx),
    )}">${escapeHtml(title)}</a>`,
  );

  marker.bindTooltip(title, {
    direction: "top",
    offset: [0, -10],
    opacity: 1,
    sticky: true,
  });

  marker.on("mouseover", () => {
    marker.setIcon(makeDotIcon({ selected: selectedIdx === idx, hover: true }));
    marker.openTooltip();
  });

  marker.on("mouseout", () => {
    marker.setIcon(makeDotIcon({ selected: selectedIdx === idx }));
    marker.closeTooltip();
  });

  marker.on("click", (event) => {
    if (event?.originalEvent) event.originalEvent.stopPropagation();

    setSelected(idx);
    map.setView([latLng.lat, latLng.lng], Math.max(map.getZoom(), 13));
    renderDetails(row, idx);
    openSidebar();
    hideTablePanel();
    marker.openPopup();
  });

  markers[idx] = marker;
}

function loadCsv() {
  setStatus("Loading data...");

  Papa.parse(CSV_FILE, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = (results.data || []).map(normalizeSheetRow);
      rowsStore.length = 0;
      rowsStore.push(...rows);

      if (!rowsStore.length) {
        setStatus("Loaded CSV but found no rows.");
        clearDetails();
        collapseSidebar();
        return;
      }

      rowsStore.forEach((row, idx) => addMarker(row, idx));
      const validMarkers = markers.filter(Boolean);

      if (!validMarkers.length) {
        setStatus("No valid points found. Check Latitude and Longitude columns.");
        clearDetails();
        collapseSidebar();
        return;
      }

      const featureGroup = L.featureGroup(validMarkers);
      map.fitBounds(featureGroup.getBounds().pad(0.3), {
        maxZoom: DEFAULT_ZOOM,
      });

      setStatus("");
      clearDetails();
      collapseSidebar();
      buildTableControls();
      setTimeout(() => renderTableList(""), 0);
    },
    error: (error) => {
      console.error("CSV load error:", error);
      setStatus(`Failed to load CSV.\n${error?.message || String(error)}`);
      clearDetails();
      collapseSidebar();
    },
  });
}

loadCsv();
