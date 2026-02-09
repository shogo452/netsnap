// Collect HAR entries and send them to background for storage

const MAX_ENTRIES = 2000;
const allEntries = [];

function stripEntry(entry) {
  const clone = JSON.parse(JSON.stringify(entry));
  if (clone.response && clone.response.content) {
    delete clone.response.content.text;
  }
  if (entry._resourceType && !clone._resourceType) {
    clone._resourceType = entry._resourceType;
  }
  return clone;
}

function saveEntries() {
  const count = Math.min(allEntries.length, MAX_ENTRIES);
  const stripped = allEntries.slice(-count).map(stripEntry);
  chrome.runtime.sendMessage(
    { action: "saveHarEntries", entries: stripped },
    function () { void chrome.runtime.lastError; }
  );
}

// Signal that DevTools is open (clears old data)
chrome.runtime.sendMessage(
  { action: "setDevtoolsOpen", open: true },
  function () { void chrome.runtime.lastError; }
);

// Load existing HAR entries captured before this script ran
chrome.devtools.network.getHAR(function (harLog) {
  allEntries.push(...(harLog.entries || []));
  saveEntries();
});

// Append new requests in real time
chrome.devtools.network.onRequestFinished.addListener(function (entry) {
  allEntries.push(entry);
  saveEntries();
});

// Mark DevTools as closed when the page unloads
window.addEventListener("beforeunload", function () {
  chrome.runtime.sendMessage(
    { action: "setDevtoolsOpen", open: false },
    function () { void chrome.runtime.lastError; }
  );
});
