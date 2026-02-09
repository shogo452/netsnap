// Service worker for capturing visible tab screenshots and storing HAR data

const STORAGE_LIMIT = 8 * 1024 * 1024; // 8MB

const ALLOWED_ACTIONS = ["captureTab", "saveHarEntries", "setDevtoolsOpen"];

function ignoreChromeError() {
  void chrome.runtime.lastError;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return;
  }
  if (typeof message !== "object" || message === null) {
    return;
  }
  if (typeof message.action !== "string" || !ALLOWED_ACTIONS.includes(message.action)) {
    return;
  }

  if (message.action === "captureTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      chrome.storage.local.set({ screenshot: dataUrl }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ dataUrl });
        } else {
          sendResponse({ dataUrl });
        }
      });
    });
    return true;
  }

  if (message.action === "saveHarEntries") {
    const entries = message.entries;
    if (!Array.isArray(entries)) {
      sendResponse({ ok: false });
      return;
    }

    // Check size and trim if needed
    let data = entries;
    let json = JSON.stringify(data);
    while (json.length > STORAGE_LIMIT && data.length > 0) {
      data = data.slice(-Math.floor(data.length * 0.7));
      json = JSON.stringify(data);
    }

    chrome.storage.local.set({ harEntries: data }, () => {
      if (chrome.runtime.lastError) {
        // Try with half the entries
        const half = data.slice(-Math.floor(data.length / 2));
        chrome.storage.local.set({ harEntries: half }, () => {
          ignoreChromeError();
          sendResponse({ ok: true, count: half.length });
        });
      } else {
        sendResponse({ ok: true, count: data.length });
      }
    });
    return true;
  }

  if (message.action === "setDevtoolsOpen") {
    const open = !!message.open;
    if (open) {
      // Clear old data when DevTools opens
      chrome.storage.local.clear(() => {
        ignoreChromeError();
        chrome.storage.local.set({ devtoolsOpen: true }, () => {
          ignoreChromeError();
          sendResponse({ ok: true });
        });
      });
    } else {
      chrome.storage.local.set({ devtoolsOpen: false }, () => {
        ignoreChromeError();
        sendResponse({ ok: true });
      });
    }
    return true;
  }
});
