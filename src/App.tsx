import React from 'react';
import './App.css';
import Captcha from './components/Captcha';

function App() {
  // 데모키 설정
  const demoApiKey = process.env.REACT_APP_DEMO_API_KEY || 'rc_live_f49a055d62283fd02e8203ccaba70fc2';
  
  return (
    <div className="App">
      <div className="container">
        <h1>Captcha UI Demo</h1>
        <div className="captcha-demo">
          <Captcha siteKey={demoApiKey} />
        </div>
      </div>
    </div>
  );
}

export default App; 