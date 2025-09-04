import React, { useState, useRef, useEffect } from 'react';
import './ImageCaptcha.css';
import ImageBehaviorCollector from './ImageBehaviorCollector';
import CaptchaOverlay from './CaptchaOverlay';

interface ImageCaptchaProps {
  onSuccess?: () => void;
}

interface ImageItem {
  id: number;
  selected: boolean;
  gridPosition: {
    row: number;
    col: number;
  };
}

const ImageCaptcha: React.FC<ImageCaptchaProps> = ({ onSuccess }) => {
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
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.realcatcha.com' : 'http://localhost:8000');
      const resp = await fetch(`${apiBaseUrl}/api/image-challenge`, { method: 'POST' });
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
    setLoadingMessage('이미지 검증 중...');
    
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.realcatcha.com' : 'http://localhost:8000');
      const resp = await fetch(`${apiBaseUrl}/api/imagecaptcha-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          challenge_id: challengeId, 
          selections: selectedImages,
          user_id: null,  // TODO: 실제 사용자 ID로 교체
          api_key: 'rc_live_f49a055d62283fd02e8203ccaba70fc2'  // API 키 추가
        })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: { success?: boolean; attempts?: number; downshift?: boolean } = await resp.json();
      const ok = !!data.success;
      behaviorCollector.current.trackVerifyAttempt(ok);
      if (ok) {
        setUiState('success');
        setIsVerified(true);
        setTimeout(() => onSuccess?.(), 300);
      } else {
        setUiState('error');
        setTimeout(() => {
          setSelectedImages([]);
          setUiState('idle');
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
          <button className="control-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                fill="#666"
              />
            </svg>
          </button>
          <button className="control-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#666" strokeWidth="2" fill="none"/>
              <path d="M12 16v-4M12 8h.01" stroke="#666" strokeWidth="2" fill="none"/>
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