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

const SERVER_URL = "https://browser-stats-server.onrender.com";
const DEFAULT_URL = "https://ok.ru/profile/586754200320/statuses/164700715288576";
const DEFAULT_WORK_MINS = 10;
const DEFAULT_RELOAD_DELAY = 10;

const uidKey = "bot_uid";
if (!localStorage.getItem(uidKey)) {
  localStorage.setItem(uidKey, crypto.randomUUID());
}
const device_id = "bot-" + localStorage.getItem(uidKey);

function fetchTargetLink(cb) {
  fetch(SERVER_URL + "/settings")
    .then(res => res.json())
    .then(data => {
      if (!data.target_link) return cb && cb();
      chrome.storage.local.get("okruBotLiteConfig", ({ okruBotLiteConfig }) => {
        const cfg = okruBotLiteConfig || {};
        cfg.url = data.target_link;
        chrome.storage.local.set({ okruBotLiteConfig: cfg }, () => cb && cb());
      });
    })
    .catch(err => {
      console.error("❌ Не удалось получить ссылку настроек:", err);
      cb && cb();
    });
}

function ensureConfig(cb) {
  chrome.storage.local.get(["okruBotLiteConfig", "okruBotActive", "okruBotStart"], data => {
    const cfg = data.okruBotLiteConfig || {};
    if (!cfg.url) cfg.url = DEFAULT_URL;
    if (cfg.workMins === undefined) cfg.workMins = DEFAULT_WORK_MINS;
    if (cfg.reloadDelay === undefined) cfg.reloadDelay = DEFAULT_RELOAD_DELAY;
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
  fetchTargetLink(() => ensureConfig());
});

chrome.runtime.onStartup.addListener(() => {
  fetchTargetLink(() => ensureConfig());
});

function sendStatsToServer() {
  chrome.storage.local.get(["okruBotStats", "device_name"], ({ okruBotStats, device_name }) => {
    if (!okruBotStats) return;
    fetch(SERVER_URL + '/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id,
        device_name: device_name || '',
        adsWatched: okruBotStats.adsWatched || 0,
        reloads: okruBotStats.reloads || 0,
        cycles: okruBotStats.cycles || 0
      })
    }).catch(err => console.error('❌ Ошибка при отправке статистики:', err));
  });
}

setInterval(sendStatsToServer, 10000);
