import React, { useState, useEffect, useRef } from 'react';
import './Captcha.css';
import ImageCaptcha from './ImageCaptcha';
import WarmFeelingCaptcha from './WarmFeelingCaptcha';
import HandwritingCaptcha from './HandwritingCaptcha';
import { addBehaviorData, downloadBehaviorData, clearBehaviorData } from '../utils/behaviorData';
import { detectDevice } from '../utils/deviceDetector';
import { handleTouchStart, handleGesture, saveMobileBehaviorData, downloadMobileBehaviorData } from '../utils/mobileBehaviorData';

interface BehaviorData {
  mouseMovements: Array<{ x: number; y: number; timestamp: number }>;
  mouseClicks: Array<{ x: number; y: number; timestamp: number; type: string }>;
  scrollEvents: Array<{ position: number; timestamp: number }>;
  pageEvents: {
    enterTime: number;
    exitTime?: number;
    totalTime?: number;
  };
}

type CaptchaState = 'initial' | 'loading' | 'success' | 'error' | 'image-captcha' | 'warm-feeling-captcha' | 'handwriting-captcha';

// 세션 시퀀스 관리를 위한 로컬 스토리지 키
const SESSION_SEQUENCE_KEY = 'captcha_session_sequence';

const getNextSequence = (): number => {
  // 브라우저 세션 스토리지 사용 (브라우저 닫으면 초기화)
  const currentSequence = parseInt(sessionStorage.getItem(SESSION_SEQUENCE_KEY) || '0');
  const nextSequence = currentSequence + 1;
  sessionStorage.setItem(SESSION_SEQUENCE_KEY, nextSequence.toString());
  return nextSequence;
};


const Captcha: React.FC = () => {
  const [state, setState] = useState<CaptchaState>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [captchaCount, setCaptchaCount] = useState<number>(0);
  const checkboxRef = useRef<HTMLDivElement>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMousePositionRef = useRef<{x: number; y: number; timestamp: number} | null>(null);

  const behaviorDataRef = useRef<BehaviorData>({
    mouseMovements: [],
    mouseClicks: [],
    scrollEvents: [],
    pageEvents: {
      enterTime: Date.now(),
    }
  });

  const MOUSE_THRESHOLD_DISTANCE = 10; // 최소 이동 거리 (픽셀)
  const MOUSE_THRESHOLD_TIME = 50;     // 최소 시간 간격 (밀리초)

  // 컴포넌트 마운트시 기존 데이터 정리
  useEffect(() => {
    // const deviceType = detectDevice();
    clearBehaviorData(); //기존 데이터 초기화
    
    // 이벤트 리스너 등록
    window.addEventListener('mousemove', handleMouseMove);//106번 줄
    window.addEventListener('mousedown', handleMouseEvent);//137번 줄
    window.addEventListener('mouseup', handleMouseEvent);
    window.addEventListener('click', handleMouseEvent);
    window.addEventListener('scroll', handleScroll);//146번 줄

   // 10초마다 로컬 스토리지에 자동 저장
   autoSaveIntervalRef.current = setInterval(() => {
    saveBehaviorData(false); //153번 줄
  }, 10000);

    return () => {
      // if (deviceType === 'desktop') {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseEvent);
        window.removeEventListener('mouseup', handleMouseEvent);
        window.removeEventListener('click', handleMouseEvent);
        window.removeEventListener('scroll', handleScroll);
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      saveBehaviorData(true);
    };
  }, []);

  // 상태 변경시 자동 저장 중지 및 데이터 다운로드
  useEffect(() => {
    if (state === 'image-captcha' || state === 'warm-feeling-captcha' || state === 'handwriting-captcha') {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      saveBehaviorData(true);
      downloadBehaviorData(); // 다음 단계로 넘어갈 때 데이터 다운로드
    }
  }, [state]);

  const handleMouseMove = (e: MouseEvent) => {
    // 현재 마우스 위치와 시간
    const currentPosition = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    };

    // 첫 번째 움직임이거나 임계값을 넘은 경우에만 데이터 저장
    if (!lastMousePositionRef.current) {
      behaviorDataRef.current.mouseMovements.push(currentPosition);
      lastMousePositionRef.current = currentPosition;
      return;
    }

    // 이동 거리 계산
    const distance = Math.sqrt(
      Math.pow(currentPosition.x - lastMousePositionRef.current.x, 2) +
      Math.pow(currentPosition.y - lastMousePositionRef.current.y, 2)
    );

    // 시간 간격 계산
    const timeGap = currentPosition.timestamp - lastMousePositionRef.current.timestamp;

    // 임계값을 넘은 경우에만 데이터 저장
    if (distance >= MOUSE_THRESHOLD_DISTANCE || timeGap >= MOUSE_THRESHOLD_TIME) {
      behaviorDataRef.current.mouseMovements.push(currentPosition);
      lastMousePositionRef.current = currentPosition;
    }
  };

  const handleMouseEvent = (e: MouseEvent) => {
    behaviorDataRef.current.mouseClicks.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
      type: e.type,
    });
  };

  const handleScroll = () => {
    behaviorDataRef.current.scrollEvents.push({
      position: window.scrollY,
      timestamp: Date.now(),
    });
  };

  const saveBehaviorData = (isFinal: boolean = false) => {
    const currentData = {
      ...behaviorDataRef.current,
      pageEvents: {
        ...behaviorDataRef.current.pageEvents,
        exitTime: isFinal ? Date.now() : undefined,
        totalTime: isFinal ? Date.now() - behaviorDataRef.current.pageEvents.enterTime : undefined
      }
    };
    
    // 데이터를 저장하고 behaviorDataRef 초기화
    addBehaviorData(currentData);
    
    // 저장 후 새로운 이벤트 수집을 위해 배열들 초기화
    if (!isFinal) {
      behaviorDataRef.current = {
        ...behaviorDataRef.current,
        mouseMovements: [],
        mouseClicks: [],
        scrollEvents: [],
        pageEvents: {
          enterTime: Date.now(),
        }
      };
    }
  };

  //captcha 체크박스 클릭 이벤트
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (state === 'initial') {
      setState('loading');
      setTimeout(() => {
        setState('success');
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
      }, 2000);
    } else if (state === 'error') {
      setState('initial');
      setErrorMessage('');
    }
  };

  const handleCaptchaSuccess = () => {
    setState('initial');
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (state === 'initial' && checkboxRef.current && !checkboxRef.current.contains(e.target as Node)) {
      const target = e.target as HTMLElement;
      if (!target.closest('.refresh-button')) {
        setState('error');
        setErrorMessage('잘못된 선택입니다. 다시 확인해주세요.');
      }
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
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