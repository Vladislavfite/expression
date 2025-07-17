function updateStatusText(isRunning) {
  document.getElementById('status-text').textContent = isRunning ? 'запущен' : 'остановлен';
}

const SERVER_URL = "https://browser-stats-server.onrender.com";
const uidKey = "bot_uid";
let storedUid = localStorage.getItem(uidKey);
if (!storedUid) {
  storedUid = crypto.randomUUID();
  localStorage.setItem(uidKey, storedUid);
}
chrome.storage.local.set({ [uidKey]: storedUid });
const device_id = "bot-" + storedUid;

function notifyDeviceName(name) {
  fetch(SERVER_URL + '/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id,
      device_name: name,
      adsWatched: 0,
      reloads: 0,
      cycles: 0
    })
  }).catch(err => console.error('❌ Ошибка при отправке имени устройства:', err));
}

document.getElementById('startBtn').onclick = () => {
  const deviceName = document.getElementById('deviceName').value.trim();
  chrome.storage.local.set({ device_name: deviceName });
  const workMins = parseInt(document.getElementById('workMins').value, 10);
  const reloadDelay = parseInt(document.getElementById('reloadDelay').value, 10);
  chrome.storage.local.get('okruBotLiteConfig', ({ okruBotLiteConfig }) => {
    const url = okruBotLiteConfig?.url;
    chrome.storage.local.set({
      okruBotLiteConfig: { ...(okruBotLiteConfig || {}), workMins, reloadDelay },
      okruBotStart: Date.now().toString(),
      okruBotActive: true,
      device_name: deviceName,
      okruBotStats: { cycles: 0, reloads: 0, adsWatched: 0 }
    }, () => {
      if (url) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          chrome.tabs.update(tabs[0].id, { url });
        });
      }
      notifyDeviceName(deviceName);
    });
  });
};

document.getElementById('stopBtn').onclick = () => {
  chrome.storage.local.set({ okruBotActive: false });
};

chrome.storage.local.get(['okruBotLiteConfig', 'okruBotStats', 'okruBotActive', 'device_name'], data => {
  const cfg = data.okruBotLiteConfig || {};
  document.getElementById('deviceName').value = data.device_name || '';
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
