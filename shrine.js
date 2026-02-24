/* global Papa */

const CSV_FILE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv";

const IMAGE_KEYS = new Set([
  "Image Link",
  "Image",
  "image",
  "image_url",
  "photo",
  "photo_url",
]);
const NON_DETAIL_KEYS = new Set(["Latitude", "Longitude", ...IMAGE_KEYS]);
const LEAD_PARAGRAPH_KEYS = ["Description", "About", "Paragraph", "Summary"];

const pageEl = document.getElementById("shrinePage");

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

function normalizeRow(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = String(key).trim();
    normalized[normalizedKey] = typeof value === "string" ? value.trim() : value;
  }

  return normalized;
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("www.");
}

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

function renderShrine(rawRow) {
  const row = normalizeRow(rawRow);
  const title = row.Name || "Shrine";
  const imageUrl = normalizeUrl(
    row["Image Link"] || row.Image || row.image || row.image_url,
  );

  let leadParagraph = "";
  for (const key of LEAD_PARAGRAPH_KEYS) {
    const value = row[key];
    if (value && String(value).trim()) {
      leadParagraph = String(value).trim();
      break;
    }
  }

  const parts = [];
  parts.push('<a class="back-link" href="./index.html">&larr; Back to map</a>');
  parts.push(`<h1>${escapeHtml(title)}</h1>`);

  if (imageUrl) {
    parts.push(
      `<img class="hero-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" onerror="this.style.display='none';" />`,
    );
  }

  if (leadParagraph) {
    parts.push(`<p class="hero-paragraph">${escapeHtml(leadParagraph)}</p>`);
  }

  for (const [key, value] of Object.entries(row)) {
    if (
      NON_DETAIL_KEYS.has(key) ||
      key === "Name" ||
      LEAD_PARAGRAPH_KEYS.includes(key) ||
      value === null ||
      value === undefined
    ) {
      continue;
    }

    const textValue = String(value).trim();
    if (!textValue) continue;

    parts.push(buildDetailRow(key, textValue));
  }

  pageEl.innerHTML = parts.join("");
}

function renderError(message) {
  pageEl.innerHTML = `
    <a class="back-link" href="./index.html">&larr; Back to map</a>
    <p class="muted">${escapeHtml(message)}</p>
  `;
}

function loadShrinePage() {
  const idParam = new URLSearchParams(window.location.search).get("id");
  const shrineIdx = Number.parseInt(idParam, 10);

  if (!Number.isInteger(shrineIdx) || shrineIdx < 0) {
    renderError("Invalid shrine id.");
    return;
  }

  Papa.parse(CSV_FILE, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = (results.data || []).map(normalizeRow);
      const row = rows[shrineIdx];

      if (!row) {
        renderError("Shrine not found.");
        return;
      }

      renderShrine(row);
    },
    error: (error) => {
      renderError(`Failed to load data: ${error?.message || String(error)}`);
    },
  });
}

loadShrinePage();
