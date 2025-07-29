import React, { useState, useEffect, useRef } from 'react';
import './Captcha.css';
import ImageCaptcha from './ImageCaptcha';
import WarmFeelingCaptcha from './WarmFeelingCaptcha';
import HandwritingCaptcha from './HandwritingCaptcha';

interface BehaviorData {
  mouseMovements: Array<{ x: number; y: number; timestamp: number }>;
  mouseClicks: Array<{ x: number; y: number; timestamp: number; type: string }>;
  scrollEvents: Array<{ position: number; timestamp: number }>;
  pageEvents: {
    enterTime: number;
    exitTime?: number;
    totalTime?: number;
  };
  sessionId: string;
  userAgent: string;
  screenResolution: { width: number; height: number };
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

const generateSessionId = () => {
  return `session${getNextSequence()}`;
};

const clearAllBehaviorData = () => {
  // 기존 세션 데이터 모두 삭제
  Object.keys(localStorage)
    .filter(key => key.startsWith('captcha_behavior_') || 
                  key.startsWith('image_behavior_') || 
                  key.startsWith('warm_feeling_behavior_') || 
                  key.startsWith('handwriting_behavior_'))
    .forEach(key => localStorage.removeItem(key));
  
  // 세션 시퀀스 초기화
  sessionStorage.removeItem(SESSION_SEQUENCE_KEY);
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
    },
    sessionId: generateSessionId(),
    userAgent: window.navigator.userAgent,
    screenResolution: {
      width: window.screen.width,
      height: window.screen.height
    }
  });

  const MOUSE_THRESHOLD_DISTANCE = 10; // 최소 이동 거리 (픽셀)
  const MOUSE_THRESHOLD_TIME = 50;     // 최소 시간 간격 (밀리초)

  // 컴포넌트 마운트시 기존 데이터 정리
  useEffect(() => {
    clearAllBehaviorData();
    
    // 이벤트 리스너 등록
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseEvent);
    window.addEventListener('mouseup', handleMouseEvent);
    window.addEventListener('click', handleMouseEvent);
    window.addEventListener('scroll', handleScroll);

    // 10초마다 로컬 스토리지에 자동 저장
    autoSaveIntervalRef.current = setInterval(() => {
      saveBehaviorData(false);
    }, 10000);

    return () => {
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

  // 상태 변경시 자동 저장 중지
  useEffect(() => {
    if (state === 'image-captcha' || state === 'warm-feeling-captcha' || state === 'handwriting-captcha') {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      saveBehaviorData(true);
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

  const saveBehaviorData = (shouldDownload: boolean = false) => {
    try {
      const data = {
        ...behaviorDataRef.current,
        pageEvents: {
          ...behaviorDataRef.current.pageEvents,
          exitTime: Date.now(),
          totalTime: Date.now() - behaviorDataRef.current.pageEvents.enterTime,
        },
      };

      // 로컬 스토리지에 저장
      const storageKey = `captcha_behavior_${data.sessionId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));

      if (shouldDownload) {
        // 모든 세션 데이터 수집
        const allSessions = Object.keys(localStorage)
          .filter(key => key.startsWith('captcha_behavior_'))
          .map(key => {
            const sessionData = localStorage.getItem(key);
            return sessionData ? JSON.parse(sessionData) : null;
          })
          .filter(Boolean);

        // JS 파일 생성
        const jsContent = `
// Captcha Behavior Data
const behaviorData = ${JSON.stringify(allSessions, null, 2)};

// 데이터 분석을 위한 유틸리티 함수들
const utils = {
  // 총 마우스 이동 거리
  getTotalMouseDistance() {
    return behaviorData.reduce((total, session) => {
      let sessionTotal = 0;
      const movements = session.mouseMovements;
      for (let i = 1; i < movements.length; i++) {
        const dx = movements[i].x - movements[i-1].x;
        const dy = movements[i].y - movements[i-1].y;
        sessionTotal += Math.sqrt(dx * dx + dy * dy);
      }
      return total + sessionTotal;
    }, 0);
  },

  // 클릭 분석
  getClickAnalysis() {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalClicks: session.mouseClicks.length,
      clickTypes: session.mouseClicks.reduce((acc, click) => {
        acc[click.type] = (acc[click.type] || 0) + 1;
        return acc;
      }, {}),
      clickPattern: session.mouseClicks.map(click => ({
        type: click.type,
        position: { x: click.x, y: click.y },
        timestamp: click.timestamp
      }))
    }));
  },

  // 스크롤 분석
  getScrollAnalysis() {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalScrolls: session.scrollEvents.length,
      maxScroll: Math.max(...session.scrollEvents.map(e => e.position)),
      scrollPattern: session.scrollEvents.map(e => ({
        position: e.position,
        timestamp: e.timestamp
      }))
    }));
  },

  // 세션 시간 분석
  getTimeAnalysis() {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalTime: session.pageEvents.totalTime,
      startTime: session.pageEvents.enterTime,
      endTime: session.pageEvents.exitTime
    }));
  }
};

// 데이터 내보내기
module.exports = {
  behaviorData,
  utils
};`;

        const blob = new Blob([jsContent], { type: 'application/javascript' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.sessionId}.js`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // 다운로드 후 로컬 스토리지 클리어
        Object.keys(localStorage)
          .filter(key => key.startsWith('captcha_behavior_'))
          .forEach(key => localStorage.removeItem(key));
      }

      // 데이터 초기화 및 새 세션 ID 생성
      behaviorDataRef.current = {
        mouseMovements: [],
        mouseClicks: [],
        scrollEvents: [],
        pageEvents: {
          enterTime: Date.now(),
        },
        sessionId: generateSessionId(),
        userAgent: window.navigator.userAgent,
        screenResolution: {
          width: window.screen.width,
          height: window.screen.height
        }
      };
    } catch (error) {
      console.error('행동 데이터 저장 중 오류 발생:', error);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (state === 'initial') {
      setState('loading');
      setTimeout(() => {
        const isSuccess = Math.random() > 0.5;
        if (isSuccess) {
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