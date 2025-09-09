import React, { useState, useRef, useEffect } from 'react';
import './AbstractCaptcha.css';
import ImageBehaviorCollector from './ImageBehaviorCollector';
import CaptchaOverlay from './CaptchaOverlay';

interface RemoteImageItem {
  id: number;
  url: string;
}

interface AbstractCaptchaProps {
  onSuccess?: () => void;
}

const AbstractCaptcha: React.FC<AbstractCaptchaProps> = ({ onSuccess }) => {
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [uiState, setUiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [ttl, setTtl] = useState<number>(0);
  const [images, setImages] = useState<RemoteImageItem[]>([]);
  const behaviorCollector = useRef<ImageBehaviorCollector>(new ImageBehaviorCollector());
  const ttlExpiredRef = useRef(false);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.realcatcha.com' : 'http://localhost:8000');

  useEffect(() => {
    behaviorCollector.current.startTracking();
    fetchChallenge();
    return () => {
      behaviorCollector.current.stopTracking();
    };

  }, []);

  useEffect(() => {
    if (ttl <= 0) return;
    const timer = setInterval(() => setTtl((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [ttl]);

  // TTL 만료 시 자동 갱신
  useEffect(() => {
    if (ttl === 0 && !isVerified && !loading) {
      if (ttlExpiredRef.current) return;
      ttlExpiredRef.current = true;
      setError('시간이 만료되어 새로운 문제로 갱신합니다.');
      handleRefresh();
    } else if (ttl > 0) {
      ttlExpiredRef.current = false;
    }
  }, [ttl, isVerified, loading]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      setError('');
      setSelectedImages([]);
      setIsVerified(false);
      const resp = await fetch(`${apiBaseUrl}/api/abstract-captcha`, { method: 'POST' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      console.debug('[AbstractCaptcha] payload /api/abstract-captcha', data);
      setChallengeId(data.challenge_id);
      setQuestion(data.question || '이미지를 선택하세요');
      setTtl(data.ttl || 45);
      const imgs = (data.images || []) as Array<{ id: number; url: string }>;
      // 절대 URL로 보정
      const absoluteImgs = imgs.map((it) => ({ id: it.id, url: it.url.startsWith('http') ? it.url : `${apiBaseUrl}${it.url}` }));
      setImages(absoluteImgs);
      console.debug('[AbstractCaptcha] normalized images', absoluteImgs);
    } catch (e: any) {
      console.error(e);
      setError('문제를 불러오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (imageId: number) => {
    const wasSelected = selectedImages.includes(imageId);
    setSelectedImages((prev) => (wasSelected ? prev.filter((id) => id !== imageId) : [...prev, imageId]));
    behaviorCollector.current.trackImageSelection(imageId, !wasSelected);
  };

  const handleVerify = async () => {
    if (!challengeId) return;
    
    setUiState('loading');
    
    try {
      setLoading(true);
      const requestBody = { 
        challenge_id: challengeId, 
        selections: selectedImages,
        user_id: null,  // TODO: 실제 사용자 ID로 교체
        api_key: 'rc_live_f49a055d62283fd02e8203ccaba70fc2'  // API 키 추가
      };
      console.debug('[AbstractCaptcha] request /api/abstract-verify', requestBody);
      const resp = await fetch(`${apiBaseUrl}/api/abstract-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      console.debug('[AbstractCaptcha] payload /api/abstract-verify', data);
      const ok = !!data.success;
      behaviorCollector.current.trackVerifyAttempt(ok);
      if (ok) {
        setUiState('success');
        console.log('Abstract captcha verified successfully!');
        // 성공 상태만 표시하고 추가 호출하지 않음
        setIsVerified(true);
        return;
      } else {
        setUiState('error');
        setTimeout(() => {
          setSelectedImages([]);
          fetchChallenge();
          setUiState('idle');
        }, 1000);
      }
    } catch (e: any) {
      console.error(e);
      setUiState('error');
      setTimeout(() => {
        setUiState('idle');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setSelectedImages([]);
    setIsVerified(false);
    behaviorCollector.current.trackRefresh();
    fetchChallenge();
  };

  return (
    <div
      className={`warm-feeling-captcha ${uiState}`}
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
        <span className="header-text">{question}</span>
      </div>

      {error && (
        <div style={{ padding: 8, color: '#c00', fontSize: 12, textAlign: 'center' }}>{error}</div>
      )}

      <div className="image-grid">
        {images.map((image) => (
          <div
            key={image.id}
            className={`image-item ${selectedImages.includes(image.id) ? 'selected' : ''}`}
            onClick={() => handleImageClick(image.id)}
            onMouseEnter={() => behaviorCollector.current.trackImageHover(image.id, true)}
            onMouseLeave={() => behaviorCollector.current.trackImageHover(image.id, false)}
          >
            <div className="image-placeholder">
              <img src={image.url} alt={`Image ${image.id}`} />
            </div>
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

      <div className="captcha-controls">
        <div className="control-left">
          <button className="control-button" onClick={handleRefresh} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="#666" />
            </svg>
          </button>
        </div>

        <button
          className={`verify-button ${selectedImages.length > 0 ? 'active' : ''}`}
          onClick={handleVerify}
          disabled={selectedImages.length === 0 || loading}
        >
          VERIFY
        </button>
      </div>
    </div>
  );
};

export default AbstractCaptcha;