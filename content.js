
// Вычитаем до 2 реклам после перезагрузки страницы (если счетчик >= 2)
chrome.storage.local.get("okruBotStats", ({ okruBotStats }) => {
  const current = okruBotStats?.adsWatched || 0;
  const correction = current >= 2 ? 2 : current > 0 ? 1 : 0;

  if (correction > 0) {
    chrome.storage.local.set({
      okruBotStats: {
        ...okruBotStats,
        adsWatched: current - correction
      }
    });
    console.log(`🟡 Минус ${correction} реклама(ы) из-за перезагрузки`);
  }
});



// Ждём полной загрузки страницы перед обновлением
const waitForPageLoad = () => new Promise(resolve => {
  if (document.readyState === "complete") return resolve();
  window.addEventListener("load", () => resolve(), { once: true });
});

// Вычитаем 1 из рекламы после обновления страницы (если больше 0)
chrome.storage.local.get("okruBotStats", ({ okruBotStats }) => {
  const current = okruBotStats?.adsWatched || 0;
  if (current > 0) {
    chrome.storage.local.set({
      okruBotStats: {
        ...okruBotStats,
        adsWatched: current - 1
      }
    });
    console.log("🟡 Минус 1 реклама из-за перезагрузки");
  }
});


(async () => {
  const wait = ms => new Promise(res => setTimeout(res, ms));

  const checkAdPresence = () => {
    return !!document.querySelector('iframe');
  };

  chrome.storage.local.get(["okruBotLiteConfig", "okruBotStart", "okruBotStats", "okruBotActive"], async data => {
    if (!data.okruBotActive) return;

    const cfg = data.okruBotLiteConfig;
    if (!cfg || !cfg.url) return;

    const START_URL = cfg.url;
    const WORK_TIME_MS = (cfg.workMins || 60) * 60 * 1000;
    const DELAY_BETWEEN_RELOADS = (cfg.reloadDelay || 10) * 1000;
    const IS_OKRU = location.hostname.includes("ok.ru");

    await wait(1000);

    let startTime = parseInt(data.okruBotStart || "0");
    const now = Date.now();

    if (!startTime || isNaN(startTime)) {
      startTime = now;
      chrome.storage.local.set({ okruBotStart: now.toString() });
    }

    const timeLeft = (startTime + WORK_TIME_MS) - now;
    if (timeLeft <= 0) {
      chrome.storage.local.set({
        okruBotStart: Date.now().toString(),
        okruBotStats: {
          ...data.okruBotStats,
          cycles: (data.okruBotStats?.cycles || 0) + 1
        }
      });
      location.href = START_URL;
      return;
    }

    if (IS_OKRU) {
      const container = document.querySelector('#cnts_164700715288576');
      if (!container) return setTimeout(() => location.reload(), 10000);

      const links = [...container.querySelectorAll('a')]
        .map(a => a.href)
        .filter(href => href.startsWith('http') && !href.includes('ok.ru'));

      if (links.length === 0) return setTimeout(() => location.reload(), 10000);

      const randomLink = links[Math.floor(Math.random() * links.length)];
      location.href = randomLink;
    } else {
      const delayPromise = wait(DELAY_BETWEEN_RELOADS);
      const adFound = checkAdPresence();

      if (adFound) {
        chrome.storage.local.get("okruBotStats", ({ okruBotStats }) => {
          chrome.storage.local.set({
            okruBotStats: {
              ...okruBotStats,
              adsWatched: (okruBotStats?.adsWatched || 0) + 1
            }
          });
        });
      }

      await delayPromise;

      chrome.storage.local.get("okruBotStats", ({ okruBotStats }) => {
        chrome.storage.local.set({
          okruBotStats: {
            ...okruBotStats,
            reloads: (okruBotStats?.reloads || 0) + 1
          }
        });
      });

      location.reload();
    }
  });
})();


// === Отслеживание рекламы по поведению <video> ===
let lastVideoTime = 0;
let adByVideoRecently = false;

setInterval(() => {
  try {
    const iframe1 = document.querySelector("iframe");
    if (!iframe1) return;

    const iframe2 = iframe1.contentDocument?.querySelector("iframe");
    const innerDoc = iframe2?.contentDocument || iframe2?.contentWindow?.document;
    if (!innerDoc) return;

    const video = innerDoc.querySelector("video");
    if (!video) return;

    const isPaused = video.paused;
    const isResetTime = video.currentTime < 1;
    const shortDuration = video.duration && video.duration < 20;
    const isMuted = video.muted;

    if ((isPaused || isResetTime || shortDuration || isMuted) && !adByVideoRecently) {
      console.log("🟡 Обнаружена возможная реклама через <video>");
      adByVideoRecently = true;

      chrome.storage.local.get("okruBotStats", ({ okruBotStats }) => {
        chrome.storage.local.set({
          okruBotStats: {
            ...okruBotStats,
            adsWatched: (okruBotStats?.adsWatched || 0) + 1
          }
        });
      });

      setTimeout(() => {
        adByVideoRecently = false;
      }, 10000);
    }
  } catch (e) {
    console.error("Ошибка при отслеживании видео-рекламы:", e);
  }
}, 2000);



const SERVER_URL = "https://browser-stats-server.onrender.com";
const botUidKey = "bot_uid";
let bot_id = null;

chrome.storage.local.get(botUidKey, res => {
  let id = res[botUidKey];
  if (!id) {
   id = crypto.randomUUID();
    chrome.storage.local.set({ [botUidKey]: id });
  }
  bot_id = "bot-" + id;
});

function sendStatsToServer() {
  if (!bot_id) return;
  chrome.storage.local.get(["okruBotStats", "device_name"], ({ okruBotStats, device_name }) => {
      if (!okruBotStats) return;
      fetch(SERVER_URL + "/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id,
          device_name: device_name || '',
          ads: okruBotStats.adsWatched || 0,
          reloads: okruBotStats.reloads || 0,
          cycles: okruBotStats.cycles || 0,
        })
      }).catch(err => console.error("❌ Ошибка при отправке статистики:", err));
    });
  }

function checkResetFlag() {
  if (!bot_id) return;
  fetch(`${SERVER_URL}/should_reset?bot_id=${bot_id}`)
    .then(res => res.json())
    .then(data => {
      if (data.reset) {
        chrome.storage.local.set({
          okruBotStats: {
            adsWatched: 0,
            reloads: 0,
            cycles: 0
          }
        });
        console.log("♻️ Сброс статистики по команде с сервера");
      }
    }).catch(() => {});
}

function checkRestartFlag() {
  if (!bot_id) return;
  fetch(`${SERVER_URL}/should_restart?bot_id=${bot_id}`)
    .then(res => res.json())
    .then(data => {
      if (data.restart) {
        chrome.storage.local.get(["okruBotLiteConfig"], ({ okruBotLiteConfig }) => {
          const url = okruBotLiteConfig?.url;
          chrome.storage.local.set({
            okruBotStats: { cycles: 0, reloads: 0, adsWatched: 0 },
            okruBotStart: Date.now().toString(),
            okruBotActive: true,
          }, () => {
            if (url) location.href = url;
          });
        });
        console.log("🔄 Перезапуск по команде сервера");
      }
    })
    .catch(() => {});
}

setInterval(sendStatsToServer, 10000);
setInterval(checkResetFlag, 5000);
setInterval(checkRestartFlag, 5000);
