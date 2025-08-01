import React from 'react';
import { createRoot } from 'react-dom/client';
import Captcha from './components/Captcha';

// CDN 전용 엔트리 포인트
class RealCaptcha {
  constructor(options = {}) {
    this.options = {
      theme: 'light',
      size: 'normal',
      language: 'ko',
      apiEndpoint: 'https://api.realcaptcha.com',
      ...options
    };
  }

  // 캡차 위젯을 지정된 요소에 렌더링
  render(containerId, callback) {
    const container = typeof containerId === 'string' 
      ? document.getElementById(containerId)
      : containerId;

    if (!container) {
      throw new Error(`Container with ID '${containerId}' not found`);
    }

    const root = createRoot(container);
    
    const handleCaptchaComplete = (result) => {
      if (callback && typeof callback === 'function') {
        callback(result);
      }
    };

    root.render(
      React.createElement(Captcha, {
        onComplete: handleCaptchaComplete,
        theme: this.options.theme,
        size: this.options.size,
        language: this.options.language,
        apiEndpoint: this.options.apiEndpoint
      })
    );

    return {
      destroy: () => {
        root.unmount();
      },
      reset: () => {
        // 캡차 리셋 로직
        root.render(
          React.createElement(Captcha, {
            onComplete: handleCaptchaComplete,
            theme: this.options.theme,
            size: this.options.size,
            language: this.options.language,
            apiEndpoint: this.options.apiEndpoint,
            key: Date.now() // 강제 리렌더링
          })
        );
      }
    };
  }

  // 전역 설정 업데이트
  configure(newOptions) {
    this.options = {
      ...this.options,
      ...newOptions
    };
  }
}

// 전역 객체에 등록
if (typeof window !== 'undefined') {
  window.RealCaptcha = RealCaptcha;
  
  // 초기화 함수도 전역으로 노출
  window.createRealCaptcha = (options) => new RealCaptcha(options);
  
  // 간편 사용을 위한 헬퍼 함수
  window.renderRealCaptcha = (containerId, options, callback) => {
    const captcha = new RealCaptcha(options);
    return captcha.render(containerId, callback);
  };
}

// ES Module로도 내보내기
export default RealCaptcha;
export { RealCaptcha };