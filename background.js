const CLOSE_DELAY_MS = 3000;

function isLaunchedZoomTab(url) {
  try {
    const { hostname, hash } = new URL(url);
    return (hostname === 'zoom.us' || hostname.endsWith('.zoom.us')) && hash === '#success';
  } catch {
    return false;
  }
}

function closeLater(tabIds) {
  setTimeout(() => {
    for (const id of tabIds) {
      chrome.tabs.remove(id).catch(() => {});
    }
  }, CLOSE_DELAY_MS);
}

async function closeLaunchedZoomTabs() {
  const tabs = await chrome.tabs.query({ url: '*://*.zoom.us/*' });
  const ids = tabs.filter((tab) => isLaunchedZoomTab(tab.url)).map((tab) => tab.id);
  if (ids.length) closeLater(ids);
}

// The page reaches #success before the "Open zoom.us?" prompt is answered, and closing the
// tab dismisses that prompt. Chrome losing focus means the Zoom app has taken over.
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) closeLaunchedZoomTabs();
});

// With "Always allow" set, Zoom can take focus before the page reaches #success.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url || !isLaunchedZoomTab(changeInfo.url)) return;
  const window = await chrome.windows.getLastFocused();
  if (!window.focused) closeLater([tabId]);
});
