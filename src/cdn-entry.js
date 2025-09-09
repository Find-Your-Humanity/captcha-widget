import React from 'react';
import { createRoot } from 'react-dom/client';
import Captcha from './components/Captcha.tsx';

// CDN 전용 엔트리 포인트
class RealCaptcha {
  constructor(options = {}) {
    this.options = {
      siteKey: '', // API 키 (필수)
      theme: 'light',
      size: 'normal',
      language: 'ko',
                                                 apiEndpoint: 'https://api.realcatcha.com', // 메인 API 게이트웨이
      cdnEndpoint: 'https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com', // CDN 엔드포인트
      ...options
    };
    
    // API 키 검증
    if (!this.options.siteKey) {
      throw new Error('siteKey가 필요합니다. 발급받은 key_id를 전달하세요.');
    }
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
        siteKey: this.options.siteKey, // API 키 전달
        theme: this.options.theme,
        size: this.options.size,
        language: this.options.language,
        apiEndpoint: this.options.apiEndpoint,
        cdnEndpoint: this.options.cdnEndpoint
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
            siteKey: this.options.siteKey, // API 키 전달
            theme: this.options.theme,
            size: this.options.size,
            language: this.options.language,
            apiEndpoint: this.options.apiEndpoint,
        cdnEndpoint: this.options.cdnEndpoint,
            key: Date.now() // 강제 리렌더링
          })
        );
      },
      // 토큰 검증을 위한 헬퍼 메서드 추가
      verifyToken: async (secretKey, captchaToken, captchaResponse) => {
        try {
          const response = await fetch(`${this.options.apiEndpoint}/api/verify-captcha`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              site_key: this.options.siteKey,
              secret_key: secretKey,
              captcha_token: captchaToken,
              response: captchaResponse
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error('Token verification failed:', error);
          throw error;
        }
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

// React 의존성 확인 및 대기 함수
function waitForReact() {
  return new Promise((resolve) => {
    const checkReact = () => {
      if (window.React && window.ReactDOM && window.ReactDOM.createRoot) {
        resolve();
      } else {
        setTimeout(checkReact, 50);
      }
    };
    checkReact();
  });
}

// 전역 객체에 등록 (React 로딩 후)
async function initializeRealCaptcha() {
  try {
    // React가 로드될 때까지 대기
    await waitForReact();
    
    window.RealCaptcha = RealCaptcha;
    
    // 초기화 함수도 전역으로 노출
    window.createRealCaptcha = (options) => new RealCaptcha(options);
    
    // 간편 사용을 위한 헬퍼 함수 (reCAPTCHA 스타일)
    window.renderRealCaptcha = (containerId, options, callback) => {
      // siteKey 필수 가드
      if (!options || !options.siteKey) {
        throw new Error('siteKey가 필요합니다. 발급받은 key_id를 전달하세요.');
      }
      const captcha = new RealCaptcha(options);
      return captcha.render(containerId, callback);
    };
    
    // reCAPTCHA 호환성을 위한 별칭
    window.REAL = {
      init: (options) => {
        const { container, siteKey, callback, 'expired-callback': expiredCallback, ...rest } = options;
        
        if (!siteKey) {
          throw new Error('siteKey가 필요합니다. 발급받은 key_id를 전달하세요.');
        }
        
        if (!container) {
          throw new Error('container is required');
        }
        
        const captcha = new RealCaptcha({
          siteKey,
          ...rest
        });
        
        const instance = captcha.render(container, callback);
        
        // expired-callback 지원
        if (expiredCallback) {
          instance.onExpired = expiredCallback;
        }
        
        return instance;
      },
      reset: () => {
        // 전역 리셋 함수 (현재 인스턴스가 있다면)
        if (window.__REAL_CURRENT_INSTANCE__) {
          window.__REAL_CURRENT_INSTANCE__.reset();
        }
      }
    };
    
    console.log('✅ RealCaptcha 위젯 초기화 완료');
    
    // 대기 중인 초기화 호출이 있다면 실행
    if (window.__REAL_PENDING_INIT__) {
      const pending = window.__REAL_PENDING_INIT__;
      delete window.__REAL_PENDING_INIT__;
      window.REAL.init(pending);
    }
    
  } catch (error) {
    console.error('❌ RealCaptcha 위젯 초기화 실패:', error);
  }
}

// 즉시 초기화 시도
if (typeof window !== 'undefined') {
  initializeRealCaptcha();
}

// ES Module로도 내보내기
export default RealCaptcha;
export { RealCaptcha };