/* global L, Papa */

const CSV_FILE = "data.csv";

// Lahore start view
const DEFAULT_CENTER = [31.5204, 74.3587];
const DEFAULT_ZOOM = 10;

const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function normalizeUrl(u) {
  if (!u) return null;
  u = String(u).trim();
  if (!u) return null;

  if (u.startsWith("//")) u = "https:" + u;

  if (!/^https?:\/\//i.test(u)) {
    u = "https://" + u.replace(/^\/+/, "");
  }

  return u;
}

function trimRowKeysAndValues(row) {
  // Your CSV headers have trailing spaces like "Latitude " and "Image Link "
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim();
    if (typeof v === "string") out[key] = v.trim();
    else out[key] = v;
  }
  return out;
}

function parseLatLng(row) {
  // Expected columns after trimming:
  // Latitude, Longitude (from your sheet)
  const lat = parseFloat(row.Latitude);
  const lng = parseFloat(row.Longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function renderDetails(rowRaw) {
  const row = trimRowKeysAndValues(rowRaw);

  const title = row.Name || "Shrine";
  const imgUrl = normalizeUrl(row["Image Link"] || row.Image || row.image);

  const parts = [];

  if (imgUrl) {
    parts.push(
      `<img class="preview" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" onerror="this.style.display='none';" />`
    );
  }

  parts.push(`<h2 style="margin:0 0 10px; font-size:16px;">${escapeHtml(title)}</h2>`);

  // Skip lat/lng and image link so it does not show twice
  const skipKeys = new Set([
    "Latitude", "Longitude",
    "Image Link", "Image", "image", "image_url", "photo", "photo_url"
  ]);

  for (const [k, v] of Object.entries(row)) {
    if (skipKeys.has(k)) continue;
    if (v === null || v === undefined) continue;

    const sv = String(v).trim();
    if (!sv) continue;

    if (/^https?:\/\//i.test(sv) || sv.startsWith("www.")) {
      const href = sv.startsWith("www.") ? "https://" + sv : sv;
      parts.push(
        `<div class="row"><b>${escapeHtml(k)}:</b> <a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(sv)}</a></div>`
      );
    } else {
      parts.push(`<div class="row"><b>${escapeHtml(k)}:</b> ${escapeHtml(sv)}</div>`);
    }
  }

  detailsEl.innerHTML = parts.join("");
}

// Create map
const map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);

// Basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const markers = [];

function addMarker(rowRaw) {
  const row = trimRowKeysAndValues(rowRaw);
  const ll = parseLatLng(row);
  if (!ll) return;

  const title = row.Name || "Shrine";

  const m = L.marker([ll.lat, ll.lng]).addTo(map);
  m.bindTooltip(title, { direction: "top", offset: [0, -8] });

  m.on("click", () => {
    map.setView([ll.lat, ll.lng], Math.max(map.getZoom(), 14));
    renderDetails(row);
  });

  markers.push(m);
}

function fitToMarkers() {
  if (!markers.length) return;
  const fg = L.featureGroup(markers);
  map.fitBounds(fg.getBounds().pad(0.15));
}

function loadCsv() {
  setStatus(`Loading ${CSV_FILE}…`);

  Papa.parse(CSV_FILE, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = results.data || [];
      if (!rows.length) {
        setStatus(`Loaded ${CSV_FILE} but found no rows.`);
        return;
      }

      rows.forEach(addMarker);

      if (!markers.length) {
        setStatus("No valid points found. Check Latitude and Longitude columns.");
        return;
      }

      // Zoom to all markers, but keep it a bit zoomed out
      const fg = L.featureGroup(markers);
      map.fitBounds(fg.getBounds().pad(0.30)); // increase padding to zoom out more

      setStatus("");

      // Do NOT auto-select anything
      detailsEl.innerHTML = `<p class="muted">No shrine selected yet. Click a marker to view details.</p>`;
    },
    error: (err) => {
      console.error("CSV load error:", err);
      setStatus(
        `Failed to load ${CSV_FILE}.\n` +
        `If you opened index.html via file://, run a local server instead.\n` +
        `${err?.message || String(err)}`
      );
    }
  });
}

loadCsv();
