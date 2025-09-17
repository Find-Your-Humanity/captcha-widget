import React from 'react';
import './App.css';
import Captcha from './components/Captcha';

function App() {
  // 데모 전용 siteKey (홈페이지 체험용). 실제 사용자 집계/과금에는 사용하지 않도록 백엔드에서 필터링 권장
  const DEMO_SITE_KEY = process.env.REACT_APP_DEMO_SITE_KEY || 'rc_live_f49a055d62283fd02e8203ccaba70fc2';
  
  return (
    <div className="App">
      <div className="container">
        <h1>Captcha UI Demo</h1>
        <div className="captcha-demo">
          <Captcha siteKey={DEMO_SITE_KEY} />
        </div>
      </div>
    </div>
  );
}

export default App; 