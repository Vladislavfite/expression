function updateStatusText(isRunning) {
  document.getElementById('status-text').textContent = isRunning ? 'запущен' : 'остановлен';
}

const SERVER_URL = "https://browser-stats-server.onrender.com";
const uidKey = "bot_uid";
if (!localStorage.getItem(uidKey)) {
  localStorage.setItem(uidKey, crypto.randomUUID());
}
const device_id = "bot-" + localStorage.getItem(uidKey);

function notifyExtensionName(name) {
  fetch(SERVER_URL + '/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id,
      extension_name: name,
      adsWatched: 0,
      reloads: 0,
      cycles: 0
    })
  }).catch(err => console.error('❌ Ошибка при отправке имени расширения:', err));
}

document.getElementById('startBtn').onclick = () => {
  const extensionName = document.getElementById('extensionName').value.trim();
  const workMins = parseInt(document.getElementById('workMins').value, 10);
  const reloadDelay = parseInt(document.getElementById('reloadDelay').value, 10);
  chrome.storage.local.get('okruBotLiteConfig', ({ okruBotLiteConfig }) => {
    const url = okruBotLiteConfig?.url;
    chrome.storage.local.set({
      okruBotLiteConfig: { ...(okruBotLiteConfig || {}), workMins, reloadDelay },
      okruBotStart: Date.now().toString(),
      okruBotActive: true,
      extension_name: extensionName,
      okruBotStats: { cycles: 0, reloads: 0, adsWatched: 0 }
    }, () => {
      if (url) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          chrome.tabs.update(tabs[0].id, { url });
        });
      }
      notifyExtensionName(extensionName);
    });
  });
};

document.getElementById('stopBtn').onclick = () => {
  chrome.storage.local.set({ okruBotActive: false });
};

chrome.storage.local.get(['okruBotLiteConfig', 'okruBotStats', 'okruBotActive', 'extension_name'], data => {
  const cfg = data.okruBotLiteConfig || {};
  document.getElementById('extensionName').value = data.extension_name || '';
  document.getElementById('workMins').value = cfg.workMins || 10;
  document.getElementById('reloadDelay').value = cfg.reloadDelay || 10;
  if (data.okruBotStats) {
    document.getElementById('cycles').textContent = data.okruBotStats.cycles || 0;
    document.getElementById('reloads').textContent = data.okruBotStats.reloads || 0;
    document.getElementById('adsWatched').textContent = data.okruBotStats.adsWatched || 0;
  }
  updateStatusText(data.okruBotActive);
});

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['okruBotActive'], result => {
    updateStatusText(result.okruBotActive);
  });
});
