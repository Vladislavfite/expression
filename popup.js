
document.getElementById("startBtn").onclick = () => {
  const url = document.getElementById("url").value;
  const workMins = parseInt(document.getElementById("workMins").value, 10);
  const reloadDelay = parseInt(document.getElementById("reloadDelay").value, 10);

  chrome.storage.local.get("okruBotStats", ({ okruBotStats }) => {
    chrome.storage.local.set({
      okruBotLiteConfig: { url, workMins, reloadDelay },
      okruBotStart: Date.now().toString(),
      okruBotActive: true,
      okruBotStats: {
        cycles: 0,
        reloads: 0,
        adsWatched: okruBotStats?.adsWatched || 0
      }
    }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.update(tabs[0].id, { url });
      });
    });
  });
};

document.getElementById("stopBtn").onclick = () => {
  chrome.storage.local.set({ okruBotActive: false });
};

chrome.storage.local.get(["okruBotLiteConfig", "okruBotStats"], data => {
  if (data.okruBotLiteConfig) {
    document.getElementById("url").value = data.okruBotLiteConfig.url || "";
    document.getElementById("workMins").value = data.okruBotLiteConfig.workMins || 60;
    document.getElementById("reloadDelay").value = data.okruBotLiteConfig.reloadDelay || 10;
  }
  if (data.okruBotStats) {
    document.getElementById("cycles").textContent = data.okruBotStats.cycles || 0;
    document.getElementById("reloads").textContent = data.okruBotStats.reloads || 0;
    document.getElementById("adsWatched").textContent = data.okruBotStats.adsWatched || 0;
  }
});


document.addEventListener('DOMContentLoaded', function () {
  const clientNameInput = document.getElementById('clientName');

  chrome.storage.local.get(['clientName'], function (data) {
    if (data.clientName !== undefined) {
      clientNameInput.value = data.clientName;
    }
  });

  clientNameInput.addEventListener('change', function () {
    chrome.storage.local.set({ clientName: clientNameInput.value });
  });


  const reportIntervalInput = document.getElementById('reportIntervalMins');

  // Загрузка reportIntervalMins
  chrome.storage.local.get(['reportIntervalMins'], function (data) {
    if (data.reportIntervalMins !== undefined) {
      reportIntervalInput.value = data.reportIntervalMins;
    }
  });

  // Сохраняем при изменении
  reportIntervalInput.addEventListener('change', function () {
    chrome.storage.local.set({ reportIntervalMins: parseInt(reportIntervalInput.value || "0") });
  });

  const resetButton = document.getElementById('resetBtn');
  const statusText = document.getElementById('status-text');
  const autoStartCheckbox = document.getElementById('autoStart');

  function updateStatusText(isRunning) {
    statusText.textContent = isRunning ? 'запущен' : 'остановлен';
  }

  // Загрузим статус и автостарт
  chrome.storage.local.get(['running', 'autoStart'], function (result) {
    updateStatusText(result.running);
    autoStartCheckbox.checked = !!result.autoStart;
  });

  document.getElementById('startBtn').addEventListener('click', function () {
    chrome.storage.local.set({ running: true }, function () {
      updateStatusText(true);
    });
  });

  document.getElementById('stopBtn').addEventListener('click', function () {
    chrome.storage.local.set({ running: false }, function () {
      updateStatusText(false);
    });
  });

  resetButton.addEventListener('click', function () {
    chrome.storage.local.set({
      okruBotStats: {
        cycles: 0,
        reloads: 0,
        adsWatched: 0
      }
    }, function () {
      document.getElementById('cycles').textContent = '0';
      document.getElementById('reloads').textContent = '0';
      document.getElementById('adsWatched').textContent = '0';
      alert('Статистика сброшена');
    });
  });

  // Сохраняем значение автостарта при изменении чекбокса
  autoStartCheckbox.addEventListener('change', function () {
    chrome.storage.local.set({ autoStart: autoStartCheckbox.checked });
  });
});


document.getElementById("sendNowBtn").addEventListener("click", function () {
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
    })
    .then(() => alert("Статистика отправлена в Telegram"))
    .catch(() => alert("Ошибка при отправке статистики"));
  });
});
