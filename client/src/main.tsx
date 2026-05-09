import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { initApp } from './lib/appInit';

initApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
