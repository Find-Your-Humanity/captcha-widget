import React from 'react';
import './App.css';
import Captcha from './components/Captcha';

function App() {
  return (
    <div className="App">
      <div className="container">
        <h1>Captcha UI Demo</h1>
        <div className="captcha-demo">
          <Captcha />
        </div>
      </div>
    </div>
  );
}

export default App; 