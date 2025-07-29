import React, { useState, useEffect, useRef } from 'react';
import './Captcha.css';
import ImageCaptcha from './ImageCaptcha';
import WarmFeelingCaptcha from './WarmFeelingCaptcha';
import HandwritingCaptcha from './HandwritingCaptcha';

type CaptchaState = 'initial' | 'loading' | 'success' | 'error' | 'image-captcha' | 'warm-feeling-captcha' | 'handwriting-captcha';

const Captcha: React.FC = () => {
  const [state, setState] = useState<CaptchaState>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [captchaCount, setCaptchaCount] = useState<number>(0);
  const checkboxRef = useRef<HTMLDivElement>(null);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    e.preventDefault(); // 기본 동작 방지
    
    if (state === 'initial') {
      setState('loading');
      // 시뮬레이션을 위한 로딩 시간
      setTimeout(() => {
        // 랜덤하게 성공 또는 실패
        const isSuccess = Math.random() > 0.5;
        if (isSuccess) {
          setState('success');
          // 성공 후 1초 뒤에 캡차를 번갈아가면서 표시
          setTimeout(() => {
            setCaptchaCount(prev => {
              const newCount = prev + 1;
              if (newCount % 3 === 0) {
                setState('image-captcha');
              } else if (newCount % 3 === 1) {
                setState('warm-feeling-captcha');
              } else {
                setState('handwriting-captcha');
              }
              return newCount;
            });
          }, 1000);
        } else {
          setState('error');
          setErrorMessage('잘못된 선택입니다. 다시 확인해주세요.');
        }
      }, 2000);
    } else if (state === 'error') {
      setState('initial');
      setErrorMessage('');
    }
  };

  const handleCaptchaSuccess = () => {
    // 캡차 성공 시 다시 체크박스 상태로 돌아감
    setState('initial');
    // captchaCount는 이미 증가되어 있으므로 여기서는 증가시키지 않음
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    // 체크박스 영역이 아닌 곳을 클릭한 경우
    if (state === 'initial' && checkboxRef.current && !checkboxRef.current.contains(e.target as Node)) {
      // 새로고침 버튼 클릭은 제외
      const target = e.target as HTMLElement;
      if (!target.closest('.refresh-button')) {
        setState('error');
        setErrorMessage('잘못된 선택입니다. 다시 확인해주세요.');
      }
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    setState('initial');
    setErrorMessage('');
  };

  return (
    <div className="captcha-container">
      {state === 'image-captcha' ? (
        <ImageCaptcha onSuccess={handleCaptchaSuccess} />
      ) : state === 'warm-feeling-captcha' ? (
        <WarmFeelingCaptcha onSuccess={handleCaptchaSuccess} />
      ) : state === 'handwriting-captcha' ? (
        <HandwritingCaptcha onSuccess={handleCaptchaSuccess} />
      ) : (
        <>
          <div className={`captcha-button ${state}`} onClick={handleButtonClick}>
            <div className="captcha-left">
              {state === 'initial' && (
                <div className="checkbox" ref={checkboxRef} onClick={handleCheckboxClick}>
                  <div className="checkbox-inner"></div>
                </div>
              )}
              {state === 'loading' && (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span className="loading-text">LOADING...</span>
                </div>
              )}
              {state === 'success' && (
                <div className="success-check">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                      fill="#4CAF50"
                    />
                  </svg>
                </div>
              )}
              {state === 'error' && (
                <div className="checkbox error" ref={checkboxRef} onClick={handleCheckboxClick}>
                  <div className="checkbox-inner error"></div>
                </div>
              )}
            </div>
            
            <div className="captcha-center">
              <span className="captcha-text">I'm not a robot</span>
            </div>
            
            <div className="captcha-right">
              <button className="refresh-button" onClick={handleRefresh}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                    fill="#666"
                  />
                </svg>
              </button>
            </div>
          </div>
          
          {state === 'error' && errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}
        </>
      )}
    </div>
  );
};

export default Captcha; 