chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-sidepanel',
    title: 'Open Sidepanel',
    contexts: ['action']
  });
});

// Handle right-click context menu - open sidepanel
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-sidepanel') {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Handle messages from popup/sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidepanel') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.sidePanel.open({windowId: tabs[0].windowId});
      sendResponse({success: true});
    });
    return true;
  }
  
  if (request.action === 'openPopup') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.sidePanel.setOptions({
        enabled: false
      });
      chrome.action.openPopup();
      setTimeout(() => {
        chrome.sidePanel.setOptions({
          enabled: true
        });
      }, 100);
    });
    sendResponse({success: true});
    return true;
  }
});