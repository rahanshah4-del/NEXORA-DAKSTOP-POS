import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
