document.addEventListener('DOMContentLoaded', () => {
  const syncBtn = document.getElementById('syncBtn');
  const openBtn = document.getElementById('openBtn');
  const addBtn = document.getElementById('addBtn');
  const previewCard = document.getElementById('previewCard');
  const coverImg = document.getElementById('coverImg');
  const titleVal = document.getElementById('titleVal');
  const issuePageVal = document.getElementById('issuePageVal');
  const libraryStatus = document.getElementById('libraryStatus');
  const statusMsg = document.getElementById('statusMsg');
  const autoSyncToggle = document.getElementById('autoSyncToggle');

  // Load autoSync state
  chrome.storage.local.get(['autoSync'], (result) => {
    autoSyncToggle.checked = !!result.autoSync;
  });

  autoSyncToggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoSync: autoSyncToggle.checked });
  });

  let extractedData = null;

  // Query active tab content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) {
      statusMsg.className = 'error';
      statusMsg.textContent = 'Немає активної вкладки';
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { action: 'extractMetadata' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusMsg.className = 'error';
        statusMsg.textContent = 'Не вдалося прочитати сторінку. Можливо, сайт не підтримується.';
        return;
      }
      renderData(response);
    });
  });

  const APP_ORIGIN = 'https://comic-tracker.allonsy.agency';

  async function getActiveOrigin() {
    return APP_ORIGIN;
  }

  async function renderData(data) {
    extractedData = data;
    if (!data.title && !data.cover_url) {
      statusMsg.className = 'error';
      statusMsg.textContent = 'На цій сторінці не знайдено комікс';
      return;
    }

    previewCard.style.display = 'block';
    titleVal.textContent = data.title || 'Без назви';
    issuePageVal.textContent = `Випуск #${data.current_issue || '1'} (стор. ${data.current_page || 1})`;
    
    if (data.cover_url && /^https?:\/\//i.test(data.cover_url) && !data.cover_url.startsWith('data:')) {
      coverImg.src = data.cover_url;
      coverImg.style.display = 'block';
    } else {
      coverImg.style.display = 'none';
    }

    // The popup runs on the extension origin and must not call the app API directly.
    // Let the app page handle the import and its own same-origin API requests.
    addBtn.style.display = 'block';
  }

  // Define button handlers
  syncBtn.addEventListener('click', () => syncProgress('manual'));
  openBtn.addEventListener('click', async () => {
    const origin = await getActiveOrigin();
    window.open(`${origin}/`, '_blank');
  });
  addBtn.addEventListener('click', async () => {
    const origin = await getActiveOrigin();
    const query = new URLSearchParams();
    query.set('series_url', extractedData.series_url || '');
    query.set('reading_url', extractedData.reading_url || '');
    query.set('title', extractedData.title || '');
    query.set('cover_url', extractedData.cover_url || '');
    query.set('current_issue', extractedData.current_issue || '');
    query.set('current_page', extractedData.current_page || '1');
    
    const targetUrl = `${origin}/#add?${query.toString()}`;
    window.open(targetUrl, '_blank');
  });

  async function syncProgress(type) {
    if (!extractedData) return;
    const clientTimestamp = new Date().toISOString();
    const origin = await getActiveOrigin();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        const targetAppUrl = `${origin}/#sync?reading_url=${encodeURIComponent(extractedData.reading_url)}&title=${encodeURIComponent(extractedData.title)}&cover_url=${encodeURIComponent(extractedData.cover_url)}&series_url=${encodeURIComponent(extractedData.series_url)}&current_issue=${encodeURIComponent(extractedData.current_issue || '')}&current_page=${encodeURIComponent(extractedData.current_page)}&client_timestamp=${encodeURIComponent(clientTimestamp)}&tab_id=${encodeURIComponent(tabId)}&sync_type=${type}`;
        chrome.tabs.create({ url: targetAppUrl }, () => {
          statusMsg.className = 'status';
          statusMsg.textContent = 'Прогрес синхронізовано!';
        });
    });
  }
});
