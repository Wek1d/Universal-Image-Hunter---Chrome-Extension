// İndirme olaylarını takip et
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    console.log('İndirme tamamlandı:', delta.id);
  }
});

// Sağ tık menüsü ekle
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveAllImages',
    title: "Tüm resimleri indir (Image Hunter)",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveAllImages') {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const images = [];
        const seenUrls = new Set();
        document.querySelectorAll('img').forEach(img => {
          if (img.src && !seenUrls.has(img.src)) {
            seenUrls.add(img.src);
            images.push(img.src);
          }
        });
        return images;
      }
    }, (results) => {
      const images = results[0]?.result || [];
      images.forEach((url, index) => {
        const filename = `image_${Date.now()}_${index}.${url.split('.').pop().split('?')[0]}`;
        chrome.downloads.download({
          url: url,
          filename: filename,
          conflictAction: 'uniquify'
        });
      });
    });
  }
});