import React, { useState, useRef, useEffect } from 'react';
import './ImageCaptcha.css';
import ImageBehaviorCollector from './ImageBehaviorCollector';
import CaptchaOverlay from './CaptchaOverlay';
import { sendBehaviorDataToMongo } from '../utils/behaviorDataSender';

interface ImageCaptchaProps {
  onSuccess?: (captchaResponse?: any) => void;
  siteKey?: string;
  apiEndpoint?: string;
  captchaToken?: string;
}

interface ImageItem {
  id: number;
  selected: boolean;
  gridPosition: {
    row: number;
    col: number;
  };
}

const ImageCaptcha: React.FC<ImageCaptchaProps> = ({ onSuccess, siteKey, apiEndpoint, captchaToken }) => {
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [uiState, setUiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [ttl, setTtl] = useState<number>(parseInt(process.env.REACT_APP_CAPTCHA_TTL || '60'));
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [challengeId, setChallengeId] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const behaviorCollector = useRef<ImageBehaviorCollector>(new ImageBehaviorCollector());
  const isTestMode = (process.env.REACT_APP_TEST_MODE === 'true');
  const ttlExpiredRef = useRef(false);

  useEffect(() => {
    behaviorCollector.current.startTracking();
    fetchChallenge();
    return () => {
      behaviorCollector.current.stopTracking();
    };
  }, []);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = apiEndpoint || process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.realcatcha.com' : 'http://localhost:8000');
      const resp = await fetch(`${apiBaseUrl}/api/image-challenge`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(siteKey ? { 'X-API-Key': siteKey } : {})
        }
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: { challenge_id?: string; url?: string; ttl?: number; question?: string } = await resp.json();
      setChallengeId(data.challenge_id || '');
      setImageUrl(data.url || '');
      if (typeof data.ttl === 'number' && data.ttl > 0) {
        setTtl(data.ttl);
      }
      setQuestion(data.question || '');
      setSelectedImages([]);
      setIsVerified(false);
    } catch (e) {
      console.error(e);
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

  // TTL 만료 시 자동 리셋
  useEffect(() => {
    if (ttl === 0 && !isVerified) {
      if (ttlExpiredRef.current) return;
      ttlExpiredRef.current = true;
      handleRefresh();
      // TTL은 서버가 내려준 값으로 fetchChallenge 과정에서 재설정됨
    } else if (ttl > 0) {
      ttlExpiredRef.current = false;
    }
  }, [ttl, isVerified]);

  const handleImageClick = (imageId: number, event: MouseEvent) => {
    const wasSelected = selectedImages.includes(imageId);
    setSelectedImages(prev => {
      if (wasSelected) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
    behaviorCollector.current.trackImageClick(imageId, event);
  };

  const handleVerify = async () => {
    if (isTestMode) {
      // 테스트 모드: 정답 여부와 무관하게 다음 단계로 진행
      setUiState('loading');
      setLoadingMessage('테스트 모드 검증 중...');
      setTimeout(() => {
        setUiState('success');
        setLoadingMessage('성공!');
        behaviorCollector.current.trackVerifyAttempt(true);
        setIsVerified(true);
        setTimeout(() => onSuccess?.(), 300);
      }, 500);
      return;
    }
    if (!challengeId) return;
    
    setUiState('loading');
    
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.realcatcha.com' : 'http://localhost:8000');
      const resp = await fetch(`${apiBaseUrl}/api/imagecaptcha-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(siteKey ? { 'X-API-Key': siteKey } : {}) },
        body: JSON.stringify({ 
          captcha_token: captchaToken || '', // 캡차 토큰 추가 ✅
          challenge_id: challengeId, 
          selections: selectedImages,
          user_id: null,  // TODO: 실제 사용자 ID로 교체
          api_key: siteKey || ''  // API 키 추가
        })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: { success?: boolean; attempts?: number; downshift?: boolean } = await resp.json();
      const ok = !!data.success;
      behaviorCollector.current.trackVerifyAttempt(ok);
      
      // 행동 데이터 수집 및 전송
      try {
        const behaviorData = {
          behavior_data: behaviorCollector.current.getMetrics(),
          pageEvents: {
            enterTime: behaviorCollector.current.getStartTime(),
            exitTime: Date.now(),
            totalTime: Date.now() - behaviorCollector.current.getStartTime()
          },
          captcha_type: "image"
        };
        
        await sendBehaviorDataToMongo("behavior_data_image", behaviorData, siteKey);
      } catch (behaviorError) {
        console.error('행동 데이터 전송 실패:', behaviorError);
        // 행동 데이터 전송 실패는 캡차 진행에 영향을 주지 않음
      }
      
      if (ok) {
        // 성공: 새로고침하지 않고 성공 상태 유지
        setUiState('success');
        setIsVerified(true);
      } else {
        // 실패: X 표시 1초 노출 후 오버레이 닫고 새 챌린지 로드
        setUiState('error');
        setTimeout(() => {
          setUiState('idle');
          setSelectedImages([]);
          handleRefresh();
        }, 1000);
      }
    } catch (e) {
      console.error(e);
      setUiState('error');
      setTimeout(() => {
        setUiState('idle');
      }, 1000);
    }
  };

  const handleRefresh = () => {
    setSelectedImages([]);
    setIsVerified(false);
    behaviorCollector.current.trackRefresh();
    fetchChallenge();
  };

  // 오버레이 그리드 정의 (3×3 인덱싱)
  const images: ImageItem[] = [
    // 첫 번째 행
    { id: 1, selected: false, gridPosition: { row: 1, col: 1 } },
    { id: 2, selected: false, gridPosition: { row: 1, col: 2 } },
    { id: 3, selected: false, gridPosition: { row: 1, col: 3 } },
    // 두 번째 행
    { id: 4, selected: false, gridPosition: { row: 2, col: 1 } },
    { id: 5, selected: false, gridPosition: { row: 2, col: 2 } },
    { id: 6, selected: false, gridPosition: { row: 2, col: 3 } },
    // 세 번째 행
    { id: 7, selected: false, gridPosition: { row: 3, col: 1 } },
    { id: 8, selected: false, gridPosition: { row: 3, col: 2 } },
    { id: 9, selected: false, gridPosition: { row: 3, col: 3 } },
  ];

  return (
    <div 
      className={`image-captcha ${uiState}`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        behaviorCollector.current.trackMouseMove(x, y);
      }}
    >
      {(uiState === 'loading' || uiState === 'success' || uiState === 'error') && (
        <CaptchaOverlay state={uiState} message={loadingMessage} />
      )}
      <div className="captcha-header">
        <span className="header-text">{question || 'Select all matching images.'}</span>
      </div>
      
      <div className="image-stage">
        {imageUrl && (
          <img className="base-image" src={imageUrl} alt="captcha" draggable={false} />
        )}
        <div className="overlay-grid">
          {images.map((image) => (
            <div
              key={image.id}
              className={`overlay-cell ${selectedImages.includes(image.id) ? 'selected' : ''}`}
              onClick={(e) => handleImageClick(image.id, e.nativeEvent)}
              onMouseEnter={() => behaviorCollector.current.trackImageHover(image.id, true)}
              onMouseLeave={() => behaviorCollector.current.trackImageHover(image.id, false)}
            >
              {selectedImages.includes(image.id) && (
                <div className="selection-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#ffffff" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="captcha-controls">
        <div className="control-left">
          <button className="control-button" onClick={handleRefresh}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                fill="#666"
              />
            </svg>
          </button>
        </div>
        
        <button 
          className={`verify-button ${(isTestMode || (selectedImages.length > 0 && !!challengeId)) ? 'active' : ''}`}
          onClick={handleVerify}
          disabled={!isTestMode && (selectedImages.length === 0 || !challengeId)}
        >
          VERIFY
        </button>
      </div>
    </div>
  );
};

export default ImageCaptcha; 