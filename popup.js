// Popup script: handles request list, filtering, HAR copy, and screenshot

import { formatSize, formatTime, statusClass, extractPath } from './utils.js';

const PAGE_SIZE = 100;

const $ = (sel) => document.querySelector(sel);

const guideEl = $("#guide");
const mainEl = $("#main");
const filterInput = $("#filterInput");
const typeFilterEl = $("#typeFilter");
const requestListEl = $("#requestList");
const loadMoreBtn = $("#loadMoreBtn");
const selectAllCheckbox = $("#selectAll");
const selectionCountEl = $("#selectionCount");
const copyHarBtn = $("#copyHarBtn");
const downloadHarBtn = $("#downloadHarBtn");
const captureBtn = $("#captureBtn");
const copyScreenshotBtn = $("#copyScreenshotBtn");
const screenshotPreview = $("#screenshotPreview");
const screenshotImg = $("#screenshotImg");

let allEntries = [];
let filteredEntries = [];
let selectedSet = new Set();
let currentType = "all";
let displayedCount = 0;
let screenshotDataUrl = null;

function isValidScreenshotUrl(url) {
  return typeof url === "string" && url.startsWith("data:image/png;base64,");
}

// --- Initialization ---

chrome.storage.local.get(["harEntries", "devtoolsOpen", "screenshot"], (data) => {
  if (!data.devtoolsOpen || !Array.isArray(data.harEntries) || data.harEntries.length === 0) {
    guideEl.classList.remove("hidden");
    mainEl.classList.add("hidden");
    // Still allow screenshot even without DevTools
  } else {
    guideEl.classList.add("hidden");
    mainEl.classList.remove("hidden");
    allEntries = data.harEntries;
    applyFilters();
  }

  if (isValidScreenshotUrl(data.screenshot)) {
    screenshotDataUrl = data.screenshot;
    screenshotImg.src = screenshotDataUrl;
    screenshotPreview.classList.remove("hidden");
    copyScreenshotBtn.disabled = false;
  }
});

// --- Filtering ---

function getResourceTypeLabel(entry) {
  const rt = entry._resourceType || "";
  return rt.toLowerCase();
}

function matchesType(entry) {
  if (currentType === "all") return true;
  const rt = getResourceTypeLabel(entry);
  if (currentType === "fetch_xhr") return rt === "xhr" || rt === "fetch";
  if (currentType === "other") {
    const known = ["xhr", "fetch", "stylesheet", "script", "font", "image", "media", "manifest", "websocket", "wasm", "document"];
    return !known.includes(rt);
  }
  return rt === currentType;
}

function matchesText(entry) {
  const query = filterInput.value.trim().toLowerCase();
  if (!query) return true;
  const url = entry.request ? entry.request.url : "";
  const path = extractPath(url);
  return path.toLowerCase().includes(query);
}

function applyFilters() {
  filteredEntries = allEntries.filter((e) => matchesType(e) && matchesText(e));
  displayedCount = 0;
  requestListEl.replaceChildren();
  renderPage();
  updateSelectionCount();
}

// --- Rendering ---

function typeLabel(entry) {
  const rt = getResourceTypeLabel(entry);
  const map = {
    xhr: "XHR", fetch: "Fetch", script: "JS", stylesheet: "CSS",
    font: "Font", image: "Img", media: "Media", manifest: "Manifest",
    websocket: "WS", wasm: "WASM", document: "Doc",
  };
  return map[rt] || rt.toUpperCase().slice(0, 5);
}

function createSpan(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function createRequestRow(entry, index) {
  const row = document.createElement("div");
  row.className = "request-item";
  row.dataset.index = index;

  const method = entry.request ? entry.request.method : "?";
  const url = entry.request ? extractPath(entry.request.url) : "";
  const fullUrl = entry.request ? entry.request.url : "";
  const status = entry.response ? entry.response.status : 0;
  const size = entry.response && entry.response.content ? entry.response.content.size : -1;
  const time = entry.time;

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.dataset.index = index;
  cb.checked = selectedSet.has(index);

  const urlSpan = createSpan("request-url", url);
  urlSpan.title = fullUrl;

  const statusSpan = createSpan("request-status", status ? String(status) : "");
  statusSpan.classList.add(statusClass(status));

  row.appendChild(cb);
  row.appendChild(createSpan("request-method", method));
  row.appendChild(urlSpan);
  row.appendChild(statusSpan);
  row.appendChild(createSpan("request-type", typeLabel(entry)));
  row.appendChild(createSpan("request-size", formatSize(size)));
  row.appendChild(createSpan("request-time", formatTime(time)));

  row.addEventListener("click", (e) => {
    if (e.target.tagName === "INPUT") return;
    cb.checked = !cb.checked;
    toggleSelection(index, cb.checked);
  });

  cb.addEventListener("change", () => {
    toggleSelection(index, cb.checked);
  });

  return row;
}

function renderPage() {
  const end = Math.min(displayedCount + PAGE_SIZE, filteredEntries.length);
  for (let i = displayedCount; i < end; i++) {
    requestListEl.appendChild(createRequestRow(filteredEntries[i], i));
  }
  displayedCount = end;

  if (displayedCount < filteredEntries.length) {
    loadMoreBtn.classList.remove("hidden");
  } else {
    loadMoreBtn.classList.add("hidden");
  }
}

// --- Selection ---

function toggleSelection(index, checked) {
  if (checked) {
    selectedSet.add(index);
  } else {
    selectedSet.delete(index);
  }
  updateSelectionCount();
}

function updateSelectionCount() {
  selectionCountEl.textContent = `Selected: ${selectedSet.size}`;
  copyHarBtn.disabled = selectedSet.size === 0;
  downloadHarBtn.disabled = selectedSet.size === 0;
}

// --- Event listeners ---

filterInput.addEventListener("input", () => {
  selectedSet.clear();
  selectAllCheckbox.checked = false;
  applyFilters();
});

typeFilterEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".type-btn");
  if (!btn) return;
  typeFilterEl.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentType = btn.dataset.type;
  selectedSet.clear();
  selectAllCheckbox.checked = false;
  applyFilters();
});

loadMoreBtn.addEventListener("click", () => {
  renderPage();
});

selectAllCheckbox.addEventListener("change", () => {
  const checked = selectAllCheckbox.checked;
  selectedSet.clear();
  if (checked) {
    filteredEntries.forEach((_, i) => selectedSet.add(i));
  }
  requestListEl.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.checked = checked;
  });
  updateSelectionCount();
});

// --- HAR helpers ---

function buildHar() {
  const entries = [];
  for (const idx of selectedSet) {
    if (filteredEntries[idx]) {
      entries.push(filteredEntries[idx]);
    }
  }
  return {
    log: {
      version: "1.2",
      creator: { name: "NetSnap", version: "1.0.0" },
      entries,
    },
  };
}

// --- Copy HAR ---

copyHarBtn.addEventListener("click", async () => {
  const har = buildHar();
  try {
    await navigator.clipboard.writeText(JSON.stringify(har, null, 2));
    showToast(`Copied ${har.log.entries.length} entries to clipboard`);
  } catch (err) {
    showToast("Failed to copy: " + err.message);
  }
});

// --- Download HAR ---

downloadHarBtn.addEventListener("click", () => {
  const har = buildHar();
  const json = JSON.stringify(har, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "netsnap.har";
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${har.log.entries.length} entries as HAR`);
});

// --- Screenshot ---

captureBtn.addEventListener("click", () => {
  captureBtn.disabled = true;
  captureBtn.textContent = "Capturing...";

  chrome.runtime.sendMessage({ action: "captureTab" }, (response) => {
    captureBtn.disabled = false;
    captureBtn.textContent = "Capture screenshot";

    if (chrome.runtime.lastError) {
      showToast("Capture failed: " + chrome.runtime.lastError.message);
      return;
    }

    if (response && response.error) {
      showToast("Capture failed: " + response.error);
      return;
    }

    if (response && isValidScreenshotUrl(response.dataUrl)) {
      screenshotDataUrl = response.dataUrl;
      screenshotImg.src = screenshotDataUrl;
      screenshotPreview.classList.remove("hidden");
      copyScreenshotBtn.disabled = false;
      showToast("Screenshot captured");
    }
  });
});

copyScreenshotBtn.addEventListener("click", async () => {
  if (!screenshotDataUrl) return;

  try {
    const res = await fetch(screenshotDataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    showToast("Screenshot copied to clipboard");
  } catch (err) {
    showToast("Failed to copy screenshot: " + err.message);
  }
});

// --- Toast ---

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
