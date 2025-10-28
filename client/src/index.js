import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // make sure this points to App.jsx
import './index.css'; // if you have global styles

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Ensure any previously registered service workers are removed so clients always
// load the latest JavaScript bundle (prevents the blank-screen "Unexpected token '<'" issue).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch((error) => {
        console.warn('Service worker lookup failed:', error);
      });

    if (window.caches?.keys) {
      caches.keys()
        .then((cacheNames) => {
          cacheNames
            .filter((name) => name.startsWith('food-service-cache'))
            .forEach((cacheName) => caches.delete(cacheName));
        })
        .catch((error) => {
          console.warn('Cache cleanup failed:', error);
        });
    }
  });
}
