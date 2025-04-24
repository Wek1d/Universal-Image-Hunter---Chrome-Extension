document.addEventListener('DOMContentLoaded', async () => {
  // Material ikonları yükle
  const iconLink = document.createElement('link');
  iconLink.href = 'https://cdn.jsdelivr.net/npm/@mdi/font/css/materialdesignicons.min.css';
  iconLink.rel = 'stylesheet';
  document.head.appendChild(iconLink);

  // Elementleri seç
  const refreshBtn = document.getElementById('refresh');
  const downloadAllBtn = document.getElementById('downloadAll');
  const imageGrid = document.getElementById('imageGrid');
  const searchInput = document.getElementById('search');
  const siteInfo = document.getElementById('siteInfo');

  // Site bilgilerini güncelle
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    const tab = tabs[0];
    siteInfo.innerHTML = `
      <div><strong>Site:</strong> ${new URL(tab.url).hostname}</div>
      <div><strong>Başlık:</strong> ${tab.title}</div>
    `;
  });

  // Resimleri yükle
  async function loadImages() {
    imageGrid.innerHTML = '<div class="loading">Resimler yükleniyor...</div>';
    
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const response = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const images = [];
        const seenUrls = new Set();

        // 1. Standart img etiketleri
        document.querySelectorAll('img').forEach(img => {
          if (img.src && !seenUrls.has(img.src)) {
            seenUrls.add(img.src);
            images.push({
              url: img.src,
              width: img.naturalWidth,
              height: img.naturalHeight,
              size: 0
            });
          }
        });

        // 2. Arka plan resimleri
        document.querySelectorAll('[style*="background-image"]').forEach(el => {
          const style = window.getComputedStyle(el);
          const bgImage = style.backgroundImage;
          const urlMatch = bgImage.match(/url\("?(.*?)"?\)/);
          if (urlMatch && urlMatch[1] && !seenUrls.has(urlMatch[1])) {
            seenUrls.add(urlMatch[1]);
            images.push({
              url: urlMatch[1],
              width: 0,
              height: 0,
              size: 0
            });
          }
        });

        return images;
      }
    });

    if (chrome.runtime.lastError) {
      imageGrid.innerHTML = `<div class="error">Hata: ${chrome.runtime.lastError.message}</div>`;
      return;
    }

    const images = response[0]?.result || [];
    displayImages(images);
  }

  // Resimleri göster
  function displayImages(images) {
    if (images.length === 0) {
      imageGrid.innerHTML = '<div class="no-images">Resim bulunamadı</div>';
      return;
    }

    imageGrid.innerHTML = '';
    images.forEach((img, index) => {
      const imageCard = document.createElement('div');
      imageCard.className = 'image-card';
      
      const imgPreview = document.createElement('img');
      imgPreview.className = 'image-preview';
      imgPreview.src = img.url;
      imgPreview.alt = `Resim ${index + 1}`;
      imgPreview.loading = 'lazy';
      
      imgPreview.addEventListener('click', () => {
        chrome.tabs.create({url: img.url});
      });

      const imageInfo = document.createElement('div');
      imageInfo.className = 'image-info';
      
      const dimensions = document.createElement('div');
      dimensions.textContent = `${img.width}x${img.height}`;
      
      const sizeInfo = document.createElement('div');
      sizeInfo.textContent = formatBytes(img.size);
      sizeInfo.style.color = '#a0a0a0';
      sizeInfo.style.fontSize = '0.8rem';
      
      const imageActions = document.createElement('div');
      imageActions.className = 'image-actions';
      
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'action-btn';
      downloadBtn.innerHTML = '<i class="mdi mdi-download"></i> İndir';
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.downloads.download({
          url: img.url,
          filename: `image_hunter_${Date.now()}_${index}.${img.url.split('.').pop().split('?')[0]}`
        });
      });
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-btn';
      copyBtn.innerHTML = '<i class="mdi mdi-content-copy"></i> Kopyala';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(img.url);
        copyBtn.innerHTML = '<i class="mdi mdi-check"></i> Kopyalandı!';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="mdi mdi-content-copy"></i> Kopyala';
        }, 2000);
      });
      
      imageActions.appendChild(downloadBtn);
      imageActions.appendChild(copyBtn);
      
      imageInfo.appendChild(dimensions);
      imageInfo.appendChild(sizeInfo);
      imageInfo.appendChild(imageActions);
      
      imageCard.appendChild(imgPreview);
      imageCard.appendChild(imageInfo);
      
      imageGrid.appendChild(imageCard);
    });
  }

  // Boyut formatlama
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Byte';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Tüm resimleri indir
  downloadAllBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const response = await chrome.scripting.executeScript({
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
    });

    const images = response[0]?.result || [];
    images.forEach((url, index) => {
      chrome.downloads.download({
        url: url,
        filename: `image_hunter_${Date.now()}_${index}.${url.split('.').pop().split('?')[0]}`,
        conflictAction: 'uniquify'
      });
    });
  });

  // Yenile butonu
  refreshBtn.addEventListener('click', loadImages);

  // Arama fonksiyonu
  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const cards = imageGrid.querySelectorAll('.image-card');
    
    cards.forEach(card => {
      const imgUrl = card.querySelector('img').src.toLowerCase();
      if (imgUrl.includes(searchTerm)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });

  // İlk yükleme
  loadImages();
});