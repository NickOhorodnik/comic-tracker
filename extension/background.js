// Comic Tracker Browser Extension - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Comic Tracker Bridge extension installed.');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMetadata') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ['content.js'],
        },
        () => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true });
          }
        }
      );
    });
    return true; // asynchronous response
  }

  if (request.action === 'autoSyncUpdate') {
    // Find the published Comic Tracker app tab
    const allowedPatterns = [
      'https://comic-tracker.allonsy.agency/*'
    ];
    
    allowedPatterns.forEach(pattern => {
      chrome.tabs.query({ url: pattern }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'triggerAutoSync', 
            metadata: request.metadata 
          });
        });
      });
    });
  }
});
