import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  process.env.NODE_ENV === 'production' ? (
    <App />
  ) : (
    // 개발 모드에서 StrictMode로 인한 마운트 이중 호출 방지
    <App />
  )
);