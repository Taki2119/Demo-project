import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initRouter } from './nav/route';
import { useLangStore } from './ui/i18n';
import './index.css';

initRouter();
document.documentElement.lang = useLangStore.getState().lang;

const root = document.getElementById('root');
if (!root) throw new Error('#root không tồn tại');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
