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

  const ALLOWED_ORIGINS = [
    'https://ais-pre-3sur7uschwz56gjmq3nr7z-641967153718.europe-west2.run.app',
    'https://ais-dev-3sur7uschwz56gjmq3nr7z-641967153718.europe-west2.run.app'
  ];

  async function getActiveOrigin() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        for (const origin of ALLOWED_ORIGINS) {
          if (tabs.some(t => t.url && t.url.startsWith(origin))) {
            resolve(origin);
            return;
          }
        }
        resolve(ALLOWED_ORIGINS[1]); // Default to dev if none found
      });
    });
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

    // Check if in library
    try {
      const origin = await getActiveOrigin();
      const response = await fetch(`${origin}/api/comics/check?series_url=${encodeURIComponent(data.series_url)}`);
      const { exists } = await response.json();
      
      if (exists) {
        libraryStatus.style.display = 'block';
        syncBtn.style.display = 'block';
        openBtn.style.display = 'block';
      } else {
        addBtn.style.display = 'block';
      }
    } catch (e) {
      console.error('Failed to check library status', e);
      addBtn.style.display = 'block'; // Fallback
    }
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
    query.set('series_url', extractedData.seriesUrl || '');
    query.set('reading_url', extractedData.readingUrl || '');
    query.set('title', extractedData.title || '');
    query.set('cover_url', extractedData.coverUrl || '');
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
        const targetAppUrl = `${origin}/#sync?reading_url=${encodeURIComponent(extractedData.readingUrl)}&title=${encodeURIComponent(extractedData.title)}&cover_url=${encodeURIComponent(extractedData.coverUrl)}&series_url=${encodeURIComponent(extractedData.seriesUrl)}&current_issue=${encodeURIComponent(extractedData.current_issue || '')}&current_page=${encodeURIComponent(extractedData.current_page)}&client_timestamp=${encodeURIComponent(clientTimestamp)}&tab_id=${encodeURIComponent(tabId)}&sync_type=${type}`;
        chrome.tabs.create({ url: targetAppUrl }, () => {
          statusMsg.className = 'status';
          statusMsg.textContent = 'Прогрес синхронізовано!';
        });
    });
  }
});
