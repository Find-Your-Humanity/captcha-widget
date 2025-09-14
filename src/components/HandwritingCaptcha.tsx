import React, { useState, useRef, useEffect, useCallback } from 'react';
import './HandwritingCaptcha.css';
import HandwritingBehaviorCollector from './HandwritingBehaviorCollector';
import CaptchaOverlay from './CaptchaOverlay';
import { sendBehaviorDataToMongo } from '../utils/behaviorDataSender';

interface HandwritingCaptchaProps {
  onSuccess?: (captchaResponse?: any) => void;
  samples?: string[];
  siteKey?: string;
  apiEndpoint?: string;
  captchaToken?: string;
}

const HandwritingCaptcha: React.FC<HandwritingCaptchaProps> = ({ onSuccess, samples, siteKey, apiEndpoint, captchaToken }) => {
  const isDrawingRef = useRef(false);
  const [drawingData, setDrawingData] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const [images, setImages] = useState<{ id: number; src: string; alt: string }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const behaviorCollector = useRef<HandwritingBehaviorCollector>(new HandwritingBehaviorCollector());
  const isTestMode = (process.env.REACT_APP_TEST_MODE === 'true');
  const [uiState, setUiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [ttl, setTtl] = useState<number>(parseInt(process.env.REACT_APP_CAPTCHA_TTL || '60'));
  const ttlExpiredRef = useRef(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);


  // 샘플이 변경되면 이미지 상태 초기화
  useEffect(() => {
    const initial = (samples || []).slice(0, 5).map((url, idx) => ({ id: idx + 1, src: url, alt: `Sample ${idx + 1}` }));
    setImages(initial);
  }, [samples]);

  // 캔버스 초기화 useEffect (한 번만 실행)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // contextRef가 이미 설정되어 있으면 스킵
    if (contextRef.current) {
      console.log("🔧 [HandwritingCaptcha] 캔버스 이미 초기화됨, 스킵");
      return;
    }

    console.log("🔧 [HandwritingCaptcha] 캔버스 초기화 시작");
    
    // 캔버스 크기 설정 (한 번만 실행)
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;

    // willReadFrequently 속성 추가로 Canvas2D 경고 해결
    const context = canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: true,
      desynchronized: false
    });
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    contextRef.current = context;
    
    console.log("✅ [HandwritingCaptcha] 캔버스 초기화 완료");
  }, []);

  // behavior tracking 시작/종료 useEffect
  useEffect(() => {
    // 컴포넌트 마운트시 tracking 시작
    behaviorCollector.current.startTracking();

    // 컴포넌트 언마운트시 정리
    return () => {
      behaviorCollector.current.stopTracking();
    };
  }, []);

  // drawingHistory 상태와 캔버스를 동기화하는 useEffect (undo 기능만을 위해)
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    // drawingHistory가 변경된 경우에만 캔버스 업데이트 (undo 기능)
    if (drawingHistory.length === 0) {
      // 히스토리가 비어있으면 캔버스 지우기
      context.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      // 히스토리의 가장 마지막 상태(현재 그림)를 가져옴
      const lastImage = drawingHistory[drawingHistory.length - 1];
      // 캔버스를 먼저 깨끗하게 지움
      context.clearRect(0, 0, canvas.width, canvas.height);
      // 마지막으로 저장된 이미지를 캔버스에 다시 그려줌
      context.putImageData(lastImage, 0, 0);
    }
  }, [drawingHistory]);

  // 샘플 이미지 새로고침 함수
  const refreshSamples = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://api.realcatcha.com'
          : 'http://localhost:8000');
      const resp = await fetch(`${apiBaseUrl}/api/handwriting-challenge`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          ...(siteKey ? { 'X-API-Key': siteKey } : {})
        } 
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: { samples?: string[]; ttl?: number; challenge_id?: string } = await resp.json();
      // 새 샘플로 교체
      const imgs = (data.samples || []).slice(0, 5).map((url, idx) => ({ id: idx + 1, src: url, alt: `Sample ${idx + 1}` }));
      setImages(imgs);
      // TTL 갱신 (옵션)
      if (typeof data.ttl === 'number' && data.ttl > 0) {
        setTtl(data.ttl);
      }
      setChallengeId(data.challenge_id || null);
    } catch (e) {
      console.error('failed to refresh handwriting samples', e);
    } finally {
      setLoading(false);
    }
  };

  // TTL 카운트다운
  useEffect(() => {
    if (ttl <= 0) return;
    const timer = setInterval(() => setTtl((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [ttl]);

  // TTL 만료 시 자동 리셋(페이지 리로드 대신 샘플/캔버스만 갱신)
  useEffect(() => {
    if (ttl === 0) {
      if (ttlExpiredRef.current) return;
      ttlExpiredRef.current = true;
      clearCanvas();
      refreshSamples();
    } else if (ttl > 0) {
      ttlExpiredRef.current = false;
    }
  }, [ttl]);

  // 컴포넌트 마운트 시 샘플 자동 로드
  useEffect(() => {
    refreshSamples();
  }, []);

  // 그리기 시작 (마우스) - 상태 업데이트 로직 제거
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const context = contextRef.current;
    if (!context) return;
    isDrawingRef.current = true;
    const { offsetX, offsetY } = e.nativeEvent;
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    behaviorCollector.current.startStroke(offsetX, offsetY);
  };

  // 그리기 시작 (터치) - 상태 업데이트 로직 제거
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;
    isDrawingRef.current = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    context.beginPath();
    context.moveTo(x, y);
    behaviorCollector.current.startStroke(x, y);
  };
  
  // 그리기 (마우스/터치 공통 로직)
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const context = contextRef.current;
    if (!context) return;
    context.lineTo(offsetX, offsetY);
    context.stroke();
    behaviorCollector.current.addPoint(offsetX, offsetY);
  };

  // 그리기 종료 (마우스/터치 공통) - 히스토리 저장
  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    contextRef.current?.closePath();
    behaviorCollector.current.endStroke();
    
    // 히스토리 저장 (캔버스는 그대로 유지)
    const canvas = canvasRef.current;
    if (canvas && contextRef.current) {
      const imageData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
      setDrawingHistory(prev => [...prev, imageData]);
    }
  };

  // 이벤트 핸들러 연결
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draw(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const context = contextRef.current;
    if (!context) return;
    context.lineTo(x, y);
    context.stroke();
    behaviorCollector.current.addPoint(x, y);
  };


  const clearCanvas = () => {
    setDrawingHistory([]);
    // useEffect가 자동으로 캔버스를 업데이트함
    
    // 행동 데이터 초기화
    behaviorCollector.current.reset();
  };

  const undoLastStroke = () => {
    if (drawingHistory.length === 0) return;
    
    // 마지막 히스토리 제거
    const newHistory = drawingHistory.slice(0, -1);
    setDrawingHistory(newHistory);
    // useEffect가 자동으로 캔버스를 업데이트함
  };

  const handleVerify = async () => {
    if (isTestMode) {
      setUiState('loading');
      setLoadingMessage('테스트 모드 검증 중...');
      setTimeout(() => {
        setUiState('success');
        setLoadingMessage('성공!');
        behaviorCollector.current.setVerificationResult(true);
        setTimeout(() => onSuccess?.(), 300);
      }, 500);
      return;
    }

    // 손글씨가 없는 경우 안내
    if (drawingHistory.length === 0) {
      alert('손글씨를 먼저 작성해주세요.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      alert('캔버스를 찾을 수 없습니다. 다시 시도해주세요.');
      return;
    }

    setUiState('loading');

    try {
             const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 
         (process.env.NODE_ENV === 'production' 
           ? 'https://api.realcatcha.com'
           : 'http://localhost:8000');

      // 캔버스 이미지를 Base64 데이터 URL로 추출
      const imageDataUrl = canvas.toDataURL('image/png');

      const requestBody = {
        captcha_token: captchaToken || '', // 캡차 토큰 추가 ✅
        image_base64: imageDataUrl,
        user_id: null,  // TODO: 실제 사용자 ID로 교체
        api_key: siteKey || '',  // API 키를 body에도 포함
        challenge_id: challengeId || '', // 챌린지 ID 포함
        // 선택: 추가 컨텍스트 전송 가능
        // keywords,  // 필요시 활성화
      };
      
      console.log('🔍 [HandwritingCaptcha] 요청 데이터:', requestBody);
      
      const actualApiBaseUrl = apiEndpoint || apiBaseUrl;
      const response = await fetch(`${actualApiBaseUrl}/api/handwriting-verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(siteKey ? { 'X-API-Key': siteKey } : {})  // API 키를 헤더로 전송
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: { success: boolean; redirect_url?: string } = await response.json();

      if (data.success) {
        setUiState('success');
        behaviorCollector.current.setVerificationResult(true);
        
        // 행동 데이터 수집 및 전송
        try {
          const behaviorData = {
            behavior_data: behaviorCollector.current.getMetrics(),
            pageEvents: {
              enterTime: behaviorCollector.current.getStartTime(),
              exitTime: Date.now(),
              totalTime: Date.now() - behaviorCollector.current.getStartTime()
            }
          };
          
          await sendBehaviorDataToMongo("behavior_data_writing", behaviorData, siteKey);
        } catch (behaviorError) {
          console.error('행동 데이터 전송 실패:', behaviorError);
          // 행동 데이터 전송 실패는 캡차 진행에 영향을 주지 않음
        }
        
        const envTarget = process.env.REACT_APP_SUCCESS_REDIRECT_URL;
        const targetUrl = envTarget || data.redirect_url || document.referrer || window.location.origin;
        if (typeof window !== 'undefined') {
          window.location.assign(targetUrl);
        }
      } else {
        setUiState('error');
        behaviorCollector.current.setVerificationResult(false);
        
        // 행동 데이터 수집 및 전송 (실패한 경우에도)
        try {
          const behaviorData = {
            behavior_data: behaviorCollector.current.getMetrics(),
            pageEvents: {
              enterTime: behaviorCollector.current.getStartTime(),
              exitTime: Date.now(),
              totalTime: Date.now() - behaviorCollector.current.getStartTime()
            }
          };
          
          await sendBehaviorDataToMongo("behavior_data_writing", behaviorData, siteKey);
        } catch (behaviorError) {
          console.error('행동 데이터 전송 실패:', behaviorError);
          // 행동 데이터 전송 실패는 캡차 진행에 영향을 주지 않음
        }
        
        setTimeout(() => {
          clearCanvas();
          refreshSamples();
          setUiState('idle');
        }, 1000);
      }
    } catch (error) {
      console.error('Handwriting verify error:', error);
      setUiState('error');
      setTimeout(() => {
        setUiState('idle');
      }, 1000);
    }
  };

  const handleRefresh = () => {
    clearCanvas();
    setKeywords('');
    refreshSamples();
  };

  return (
    <div className={`handwriting-captcha ${uiState}`}>
      {(uiState === 'loading' || uiState === 'success' || uiState === 'error') && (
        <CaptchaOverlay state={uiState} message={loadingMessage} />
      )}
      <div className="captcha-header">
        <span className="header-text">{/* Look at the images and write the keywords that come to mind by hand. */}이미지를 보고 떠오르는 키워드를 손글씨로 작성하세요.</span>
      </div>
      
      <div className="images-container">
        {images.map((image) => (
          <div key={image.id} className="image-slot">
            <img src={image.src} alt={image.alt} />
          </div>
        ))}
      </div>
      
      <div className="handwriting-area">
        <div className="grid-pattern">
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onMouseDown={startDrawing}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
            style={{ 
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          />
        </div>
      </div>
      
      <div className="captcha-controls">
        <div className="control-left">
          <button className="control-button" onClick={handleRefresh} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                fill="#666"
              />
            </svg>
          </button>
          <button 
            className={`control-button ${drawingHistory.length === 0 ? 'disabled' : ''}`}
            onClick={undoLastStroke}
            disabled={drawingHistory.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
                fill={drawingHistory.length === 0 ? "#ccc" : "#666"}
              />
            </svg>
          </button>
        </div>
        
        <button 
          className={`verify-button ${isTestMode || drawingHistory.length > 0 ? 'active' : ''}`}
          onClick={handleVerify}
          disabled={!isTestMode && drawingHistory.length === 0}
        >
          VERIFY
        </button>
      </div>
    </div>
  );
};

export default HandwritingCaptcha; 