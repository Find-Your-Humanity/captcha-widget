import React, { useState, useRef, useEffect } from 'react';
import './AbstractCaptcha.css';
import ImageBehaviorCollector from './ImageBehaviorCollector';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [ttl, setTtl] = useState<number>(0);
  const [images, setImages] = useState<RemoteImageItem[]>([]);
  const behaviorCollector = useRef<ImageBehaviorCollector>(new ImageBehaviorCollector());
  const ttlExpiredRef = useRef(false);
  const isTestMode = (process.env.REACT_APP_TEST_MODE === 'true');
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
    if (isTestMode) {
      behaviorCollector.current.trackVerifyAttempt(true);
      setIsVerified(true);
      setTimeout(() => onSuccess?.(), 300);
      return;
    }
    try {
      setLoading(true);
      const requestBody = { challenge_id: challengeId, selections: selectedImages };
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
        console.log('Abstract captcha verified successfully!');
        const targetUrl = (data && data.redirect_url) || process.env.REACT_APP_SUCCESS_REDIRECT_URL;
        if (targetUrl && typeof window !== 'undefined') {
          console.log('Redirecting to:', targetUrl);
          window.location.href = targetUrl;
          return;
        }
        // 리다이렉트 설정이 없으면 다음 캡챠로 넘어가지 않고 성공 상태만 표시
        setIsVerified(true);
        return;
      } else {
        // 실패 시 경고 및 리셋
        alert('정답이 아닙니다. 다시 시도해주세요.');
        setSelectedImages([]);
        fetchChallenge();
      }
    } catch (e: any) {
      console.error(e);
      setError('검증에 실패했습니다. 다시 시도해주세요.');
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
      className="warm-feeling-captcha"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        behaviorCollector.current.trackMouseMove(x, y);
      }}
    >
      <div className="captcha-header">
        <span className="header-text">{question}{ttl > 0 ? ` · ${ttl}s` : ''}</span>
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
          className={`verify-button ${(isTestMode || selectedImages.length > 0) ? 'active' : ''}`}
          onClick={handleVerify}
          disabled={!isTestMode && (selectedImages.length === 0 || loading)}
        >
          VERIFY
        </button>
      </div>
    </div>
  );
};

export default AbstractCaptcha;