import React, {useEffect, useRef, useState} from 'react';
import './Captcha.css';
import ImageCaptcha from './ImageCaptcha';
import AbstractCaptcha from './AbstractCaptcha';
import HandwritingCaptcha from './HandwritingCaptcha';
import { addBehaviorData, clearBehaviorData } from '../utils/behaviorData';
import { detectDevice } from '../utils/deviceDetector';
import { handleTouchStart, handleTouchMove, handleTouchEnd, saveMobileBehaviorData } from '../utils/mobileBehaviorData';

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

interface CaptchaProps {
  siteKey?: string; // API 키
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  language?: 'ko' | 'en';
  apiEndpoint?: string;
  onComplete?: (result: any) => void;
}

type CaptchaState = 'initial' | 'loading' | 'success' | 'error' | 'image-captcha' | 'abstract-captcha' | 'handwriting-captcha';

// 세션 시퀀스 관리를 위한 로컬 스토리지 키
const SESSION_SEQUENCE_KEY = 'captcha_session_sequence';

const getNextSequence = (): number => {
  // 브라우저 세션 스토리지 사용 (브라우저 닫으면 초기화)
  const currentSequence = parseInt(sessionStorage.getItem(SESSION_SEQUENCE_KEY) || '0');
  const nextSequence = currentSequence + 1;
  sessionStorage.setItem(SESSION_SEQUENCE_KEY, nextSequence.toString());
  return nextSequence;
};

const Captcha: React.FC<CaptchaProps> = ({ 
  siteKey = '', 
  theme = 'light', 
  size = 'normal', 
  language = 'ko',
          apiEndpoint = 'https://api.realcatcha.com',
  onComplete 
}) => {
  const [state, setState] = useState<CaptchaState>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [captchaCount, setCaptchaCount] = useState<number>(0);
  const [handwritingSamples, setHandwritingSamples] = useState<string[]>([]);
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
    const deviceType = detectDevice();
    clearBehaviorData(); //기존 데이터 초기화
    
    if (deviceType === 'desktop') {
      // 데스크톱: 마우스 이벤트 리스너 등록
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mousedown', handleMouseEvent);
      window.addEventListener('mouseup', handleMouseEvent);
      window.addEventListener('click', handleMouseEvent);
      window.addEventListener('scroll', handleScroll);

      // 자동 저장 비활성화 (성능 최적화)
      // autoSaveIntervalRef.current = setInterval(() => {
      //   saveBehaviorData(false);
      // }, 10000);
    } else {
      // 모바일: 터치 이벤트 리스너 등록
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);

      // 자동 저장 비활성화 (성능 최적화)
      // autoSaveIntervalRef.current = setInterval(() => {
      //   saveMobileBehaviorData();
      // }, 10000);
    }

    return () => {
      if (deviceType === 'desktop') {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseEvent);
        window.removeEventListener('mouseup', handleMouseEvent);
        window.removeEventListener('click', handleMouseEvent);
        window.removeEventListener('scroll', handleScroll);
        saveBehaviorData(true);
      } else {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        saveMobileBehaviorData();
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

  // 상태 변경시 자동 저장 중지 및 데이터 다운로드
  useEffect(() => {
    if (state === 'image-captcha' || state === 'abstract-captcha' || state === 'handwriting-captcha') {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }

      const deviceType = detectDevice();
      if (deviceType === 'desktop') {
        saveBehaviorData(true);
      } else {
        saveMobileBehaviorData();
      }
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
          handleBehaviorAnalysis(); // 여기서 AI 결정 함수 호출
        }, 1000);
      }, 2000);
    } else if (state === 'error') {
      setState('initial');
      setErrorMessage('');
    }
  };

  // FastAPI 연동 함수 수정: behaviorData 객체를 바로 서버로 전송
  const inFlightRef = useRef<boolean>(false);
  const handleBehaviorAnalysis = async () => {
    try {
      if (inFlightRef.current) {
        console.debug('[Captcha] next-captcha call suppressed: request already in-flight');
        return;
      }
      inFlightRef.current = true;

      // props에서 받은 API 엔드포인트 사용
      const apiBaseUrl = apiEndpoint || 'https://api.realcatcha.com';
      console.log('🌐 API 엔드포인트:', apiBaseUrl);
      console.log('🔑 API 키:', siteKey ? '제공됨' : '없음');
      console.log('🔗 API URL:', `${apiBaseUrl}/api/next-captcha`);
      
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const bd = behaviorDataRef.current;
      const payload = { 
        behavior_data: bd,
        site_key: siteKey // API 키 포함
      };
      
      try {
        const mm = (bd?.mouseMovements || []).length;
        const mc = (bd?.mouseClicks || []).length;
        const se = (bd?.scrollEvents || []).length;
        const approxBytes = JSON.stringify(payload).length;
        const sample = {
          mouseMovements: (bd?.mouseMovements || []).slice(0, 2),
          mouseClicks: (bd?.mouseClicks || []).slice(0, 2),
          scrollEvents: (bd?.scrollEvents || []).slice(0, 2),
        };
        console.debug('[Captcha] sending /api/next-captcha', { counts: { mm, mc, se }, approxBytes, sample });
      } catch {}

      const response = await fetch(`${apiBaseUrl}/api/next-captcha`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': siteKey // API 키 헤더 추가
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        inFlightRef.current = false;
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const durationMs = Math.round(t1 - t0);
      console.debug('[Captcha] payload /api/next-captcha', data);
      try {
        const preview = {
          status: response.status,
          durationMs,
          next_captcha: data?.next_captcha,
          captcha_type: data?.captcha_type,
          confidence_score: data?.confidence_score,
          ml_service_used: data?.ml_service_used,
          is_bot_detected: data?.is_bot_detected,
        };
        console.debug('[Captcha] summary /api/next-captcha', preview);
      } catch {}

      // 결과에 따라 다음 캡차로 이동
      if (data.next_captcha === 'imagecaptcha') {
        setState('image-captcha');
      } else if (data.next_captcha === 'handwritingcaptcha') {
        setHandwritingSamples(Array.isArray(data.handwriting_samples) ? data.handwriting_samples : []);
        setState('handwriting-captcha');
      } else if (data.next_captcha === 'abstractcaptcha') {
        setState('abstract-captcha');
      } else {
        setState('success'); // 추가 캡차 없이 통과
      }
      inFlightRef.current = false;
    } catch (error) {
      console.error('Error:', error);
      setState('error');
      setErrorMessage('서버 연결에 실패했습니다. 다시 시도해주세요.');
      inFlightRef.current = false;
    }
  };

  // 사용자가 기본 캡차를 통과했을 때 호출
  const handleCaptchaSuccess = () => {
    // 캡차 성공 시 성공 상태로만 변경
    setState('success');
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
      ) : state === 'abstract-captcha' ? (
        <AbstractCaptcha onSuccess={handleCaptchaSuccess} />
      ) : state === 'handwriting-captcha' ? (
        <HandwritingCaptcha onSuccess={handleCaptchaSuccess} samples={handwritingSamples} />
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