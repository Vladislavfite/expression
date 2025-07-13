
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


let telegramTimer = null;
let lastReportInterval = null;

function setupTelegramAutoSend(intervalSec) {
  if (telegramTimer) {
    clearInterval(telegramTimer);
  }
  if (!intervalSec || isNaN(intervalSec) || intervalSec < 10) return;

  telegramTimer = setInterval(() => {
    chrome.storage.local.get(["okruBotStats", "clientName"], ({ okruBotStats, clientName }) => {
      const stats = okruBotStats || { cycles: 0, reloads: 0, adsWatched: 0 };
      const amount = Math.floor((stats.adsWatched / 1000) * 150);
      const message = `🤖 ${clientName || "Bot"}\n\n📊 Статистика:\n🔁 Циклов: ${stats.cycles}\n♻️ Перезагрузок: ${stats.reloads}\n📺 Реклам: ${stats.adsWatched}\n💰 Итого: ${amount}₽`;

      fetch("https://api.telegram.org/bot7452188952:AAFrOyzka-UhFhb_DCssV_Q_AS8fHTxhZ-s/sendMessage", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: "508948602",
          text: message
        })
      }).then(() => console.log("📤 Автостатистика отправлена в Telegram"));
    });
  }, intervalSec * 1000);

  console.log("🔁 Новый интервал автоотправки:", intervalSec, "сек");
}

// Следим за изменением reportInterval
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.reportInterval) {
    const newVal = changes.reportInterval.newValue;
    if (newVal !== lastReportInterval) {
      lastReportInterval = newVal;
      setupTelegramAutoSend(parseInt(newVal));
    }
  }
});

// При запуске получаем начальный reportInterval
chrome.storage.local.get(["reportInterval"], ({ reportInterval }) => {
  lastReportInterval = reportInterval;
  setupTelegramAutoSend(parseInt(reportInterval));
});


let autoTelegramTimer = null;

function startAutoTelegramSending() {
  chrome.storage.local.get(["reportIntervalMins"], (data) => {
    const intervalMins = parseInt(data.reportIntervalMins || "0");
    if (!intervalMins || isNaN(intervalMins) || intervalMins < 1) return;

    if (autoTelegramTimer) clearInterval(autoTelegramTimer);

    autoTelegramTimer = setInterval(() => {
      chrome.storage.local.get(["okruBotStats", "clientName", "okruBotActive"], function(data) {
        const stats = data.okruBotStats || {};
        const clientName = data.clientName || "Без имени";
        const running = data.okruBotActive;

        const adRevenue = ((stats.adsWatched || 0) / 1000 * 150).toFixed(2);
        const message =
          `🤖 Бот: ${clientName}\n` +
          `📡 Статус: ${running ? "работает" : "остановлен"}\n` +
          `🔁 Циклов: ${stats.cycles || 0}\n` +
          `🔄 Перезагрузок: ${stats.reloads || 0}\n` +
          `🎬 Реклам показано: ${stats.adsWatched || 0}\n\n` +
          `💰 Сумма: ${adRevenue}₽`;

        fetch("https://api.telegram.org/bot7452188952:AAFrOyzka-UhFhb_DCssV_Q_AS8fHTxhZ-s/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: "508948602",
            text: message
          })
        }).then(() => console.log("📤 Автостатистика отправлена в Telegram"));
      });
    }, intervalMins * 60 * 1000); // интервал в миллисекундах
  });
}

// Запускаем автоотправку при загрузке
startAutoTelegramSending();

// Также следим за изменением reportIntervalMins
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.reportIntervalMins) {
    startAutoTelegramSending();
  }
});
