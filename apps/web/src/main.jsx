import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AppRouter from './routes/AppRouter';

// PWA Install Handler
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('✅ PWA is installable!');

  const existingBanner = document.getElementById('pwa-install-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  // Show install banner
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div style="position: fixed; bottom: 16px; right: 16px; background: #F74B25; color: white; padding: 10px 14px; border-radius: 10px; z-index: 9999; font-size: 15px; font-weight: 600; line-height: 1.2; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.18);">
      Install TrackFlow
    </div>
  `;
  banner.onclick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ PWA installed!');
        }
        deferredPrompt = null;
        banner.remove();
      });
    }
  };
  document.body.appendChild(banner);
});

window.installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    deferredPrompt = null;
  }
};

// Vite PWA Plugin handles service worker registration automatically
// No need to manually register
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('✅ Ready for service worker registration');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
