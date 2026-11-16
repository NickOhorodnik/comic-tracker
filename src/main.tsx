import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// GitHub Pages hosts the static UI; API calls remain on the Comic Tracker server.
const apiOrigin = (import.meta as any).env?.VITE_API_ORIGIN || '';
if (apiOrigin) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return nativeFetch(`${apiOrigin}${input}`, init);
    }
    if (input instanceof Request) {
      const requestUrl = new URL(input.url);
      if (requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith('/api/')) {
        return nativeFetch(new Request(`${apiOrigin}${requestUrl.pathname}${requestUrl.search}`, input), init);
      }
    }
    return nativeFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
