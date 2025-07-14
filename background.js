
let lastAdStartTime = 0;
let pendingAd = false;

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const url = details.url;
    const now = Date.now();

    // Исключаем лишние запросы
    if (
      url.includes("visibility") ||
      url.includes("clck") ||
      url.includes("jclck") ||
      url.includes("dtype=stred")
    ) return;

    const isStart = url.includes("rutube") &&
                    url.includes("event_name=advertising") &&
                    url.includes("event_action=start");

    const isEnd = url.includes("rutube") &&
                  url.includes("event_name=advertising") &&
                  url.includes("event_action=end");

    if (isStart) {
      lastAdStartTime = now;
      pendingAd = true;
      console.log("[v32] Начало рекламы зафиксировано:", url);
    }

    if (isEnd && pendingAd) {
      const duration = now - lastAdStartTime;
      if (duration > 1500) {
        console.log("🎯 Подтвержден показ рекламы (v32), длительность:", duration, "мс");

        chrome.storage.local.get("okruBotStats", ({ okruBotStats }) => {
          chrome.storage.local.set({
            okruBotStats: {
              ...okruBotStats,
              adsWatched: (okruBotStats?.adsWatched || 0) + 1
            }
          });
        });
      } else {
        console.log("[v32] Слишком короткая реклама, не засчитана:", duration, "мс");
      }
      pendingAd = false;
    }
  },
  {
    urls: ["<all_urls>"],
    types: ["xmlhttprequest", "other"]
  },
  ["blocking"]
);

const DEFAULT_URL = "https://ok.ru/profile/586754200320/statuses/164700715288576";
const DEFAULT_WORK_MINS = 10;
const DEFAULT_RELOAD_DELAY = 10;

function ensureConfig(cb) {
  chrome.storage.local.get(["okruBotLiteConfig", "okruBotActive", "okruBotStart"], data => {
    const cfg = data.okruBotLiteConfig || { url: DEFAULT_URL, workMins: DEFAULT_WORK_MINS, reloadDelay: DEFAULT_RELOAD_DELAY };
    const active = data.okruBotActive !== undefined ? data.okruBotActive : true;
    const start = data.okruBotStart || Date.now().toString();
    chrome.storage.local.set({ okruBotLiteConfig: cfg, okruBotActive: active, okruBotStart: start }, () => cb && cb());
  });
}

function openStartUrl() {
  chrome.storage.local.get("okruBotLiteConfig", ({ okruBotLiteConfig }) => {
    const url = okruBotLiteConfig?.url || DEFAULT_URL;
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs && tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url });
      } else {
        chrome.tabs.create({ url });
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureConfig(openStartUrl);
});

chrome.runtime.onStartup.addListener(() => {
  ensureConfig(openStartUrl);
});
