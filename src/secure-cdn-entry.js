import React from 'react';
import { createRoot } from 'react-dom/client';
import Captcha from './components/Captcha.tsx';

// 안전한 CDN 전용 엔트리 포인트 (ALTCHA 스타일)
class SecureRealCaptcha {
  constructor(options = {}) {
    this.options = {
      theme: 'light',
      size: 'normal',
      language: 'ko',
      apiEndpoint: 'https://api.realcatcha.com', // 메인 API 게이트웨이
      cdnEndpoint: 'https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com', // CDN 엔드포인트
      ...options
    };
    
    // API 키는 더 이상 필요하지 않음 (서버에서 도메인 기반으로 검증)
    this.challengeToken = null;
    this.challengeData = null;
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

    // 챌린지 요청
    this.requestChallenge().then(() => {
      root.render(
        React.createElement(Captcha, {
          onComplete: handleCaptchaComplete,
          challengeToken: this.challengeToken,
          challengeData: this.challengeData,
          theme: this.options.theme,
          size: this.options.size,
          language: this.options.language,
          apiEndpoint: this.options.apiEndpoint,
          cdnEndpoint: this.options.cdnEndpoint
        })
      );
    }).catch((error) => {
      console.error('Failed to request challenge:', error);
      container.innerHTML = `<div style="color: red; padding: 20px;">캡차 로드 실패: ${error.message}</div>`;
    });

    return {
      destroy: () => {
        root.unmount();
      },
      reset: () => {
        // 새로운 챌린지 요청 후 리렌더링
        this.requestChallenge().then(() => {
          root.render(
            React.createElement(Captcha, {
              onComplete: handleCaptchaComplete,
              challengeToken: this.challengeToken,
              challengeData: this.challengeData,
              theme: this.options.theme,
              size: this.options.size,
              language: this.options.language,
              apiEndpoint: this.options.apiEndpoint,
              cdnEndpoint: this.options.cdnEndpoint,
              key: Date.now() // 강제 리렌더링
            })
          );
        });
      }
    };
  }

  // 서버에서 챌린지 요청 (도메인 기반)
  async requestChallenge(captchaType = 'image') {
    try {
      const response = await fetch(`${this.options.apiEndpoint}/api/challenge?domain=${encodeURIComponent(window.location.hostname)}&captcha_type=${captchaType}`, {
        method: 'GET',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.challenge) {
        this.challengeToken = data.challenge.challenge_token;
        this.challengeData = data.challenge;
        return data.challenge;
      } else {
        throw new Error('Failed to get challenge from server');
      }
    } catch (error) {
      console.error('Challenge request failed:', error);
      throw error;
    }
  }

  // 솔루션 검증 (서버 사이드)
  async verifySolution(solution) {
    if (!this.challengeToken) {
      throw new Error('No challenge token available');
    }

    try {
      const response = await fetch(`${this.options.apiEndpoint}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          challenge_token: this.challengeToken,
          solution: solution
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Solution verification failed:', error);
      throw error;
    }
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
async function initializeSecureRealCaptcha() {
  try {
    // React가 로드될 때까지 대기
    await waitForReact();
    
    window.SecureRealCaptcha = SecureRealCaptcha;
    
    // 초기화 함수도 전역으로 노출
    window.createSecureRealCaptcha = (options) => new SecureRealCaptcha(options);
    
    // 간편 사용을 위한 헬퍼 함수
    window.renderSecureRealCaptcha = (containerId, options, callback) => {
      const captcha = new SecureRealCaptcha(options);
      return captcha.render(containerId, callback);
    };
    
    console.log('✅ Secure RealCaptcha 위젯 초기화 완료');
    
  } catch (error) {
    console.error('❌ Secure RealCaptcha 위젯 초기화 실패:', error);
  }
}

// 즉시 초기화 시도
if (typeof window !== 'undefined') {
  initializeSecureRealCaptcha();
}

// ES Module로도 내보내기
export default SecureRealCaptcha;
export { SecureRealCaptcha };
