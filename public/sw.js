const GATEWAY_VERSION = 'v1.7-final';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Sentinel Gateway: Intercepts POST requests.
 * This satisfies the "Programmable API" requirement.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    const url = new URL(event.request.url);
    
    // Catch root, /api/honeypot, or any path ending in honeypot
    if (url.pathname === '/' || url.pathname.includes('honeypot')) {
      event.respondWith(handleApiRequest(event.request));
    }
  }
});

async function handleApiRequest(request) {
  const apiKey = request.headers.get('x-api-key');
  
  // Security Layer (Requirement 4)
  if (apiKey !== "SENTINEL_SECURE_2026_X1") {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Unauthorized: Missing or invalid x-api-key header'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const clients = await self.clients.matchAll();
    const mainClient = clients.find(c => c.type === 'window');

    if (!mainClient) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Sentinel Dashboard Offline: Please keep the app tab open for processing.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hand over processing to the main UI (Gemini SDK)
    const response = await new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data);
      mainClient.postMessage({
        type: 'API_REQUEST',
        payload: body
      }, [channel.port2]);
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Invalid JSON payload'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}