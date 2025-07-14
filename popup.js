const DEFAULT_URL = "https://ok.ru/profile/586754200320/statuses/164700715288576";

function updateStatusText(isRunning) {
  document.getElementById('status-text').textContent = isRunning ? 'запущен' : 'остановлен';
}

document.getElementById('startBtn').onclick = () => {
  const url = document.getElementById('url').value;
  const workMins = parseInt(document.getElementById('workMins').value, 10);
  const reloadDelay = parseInt(document.getElementById('reloadDelay').value, 10);

  chrome.storage.local.set({
    okruBotLiteConfig: { url, workMins, reloadDelay },
    okruBotStart: Date.now().toString(),
    okruBotActive: true,
    okruBotStats: { cycles: 0, reloads: 0, adsWatched: 0 }
  }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.update(tabs[0].id, { url });
    });
  });
};
document.getElementById('stopBtn').onclick = () => {
  chrome.storage.local.set({ okruBotActive: false });
};
chrome.storage.local.get(['okruBotLiteConfig', 'okruBotStats', 'okruBotActive'], data => {
  const cfg = data.okruBotLiteConfig || {};
  document.getElementById('url').value = cfg.url || DEFAULT_URL;
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
