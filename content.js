// Popup'ı tetiklemek için gerekli bilgileri toplar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getImages") {
        const images = findImages();
        sendResponse(images);
    }
    return true;
});

function findImages() {
    // popup.js'deki aynı fonksiyon
    // ...
}