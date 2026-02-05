import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Register Sentinel Gateway (Service Worker)
 * Using a root path '/sw.js' ensures it resolves correctly to the file
 * served from the public/ directory.
 */
const registerSentinelGateway = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // The sw.js file from the public/ directory is served at the root in Vite
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Sentinel Gateway Active. Scope:', registration.scope);
    } catch (err) {
      console.error('Sentinel Gateway failed to initialize:', err);
    }
  }
};

registerSentinelGateway();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);