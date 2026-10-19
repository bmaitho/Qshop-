import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {BrowserRouter} from 'react-router-dom'
import { originalImageUrl } from './utils/ImageUtils'

// If Vercel's image CDN ever fails for a photo, load the original instead so
// nobody sees a broken image.
window.addEventListener('error', (e) => {
  const el = e.target;
  if (el && el.tagName === 'IMG' && !el.dataset.cdnFallback) {
    const original = originalImageUrl(el.getAttribute('src'));
    if (original) { el.dataset.cdnFallback = '1'; el.src = original; }
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </React.StrictMode>
)