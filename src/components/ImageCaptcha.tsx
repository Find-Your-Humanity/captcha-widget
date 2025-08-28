import React, { useState, useRef, useEffect } from 'react';
import './ImageCaptcha.css';
import ImageBehaviorCollector from './ImageBehaviorCollector';

interface ImageCaptchaProps {
  onSuccess?: () => void;
}

interface ImageItem {
  id: number;
  hasBike: boolean;
  selected: boolean;
  gridPosition: {
    row: number;
    col: number;
  };
}

const ImageCaptcha: React.FC<ImageCaptchaProps> = ({ onSuccess }) => {
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [ttl, setTtl] = useState<number>(parseInt(process.env.REACT_APP_CAPTCHA_TTL || '60'));
  const behaviorCollector = useRef<ImageBehaviorCollector>(new ImageBehaviorCollector());
  const isTestMode = (process.env.REACT_APP_TEST_MODE === 'true');
  const ttlExpiredRef = useRef(false);

  useEffect(() => {
    behaviorCollector.current.startTracking();
    return () => {
      behaviorCollector.current.stopTracking();
    };
  }, []);

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
      setTtl(parseInt(process.env.REACT_APP_CAPTCHA_TTL || '60'));
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

  const handleVerify = () => {
    if (isTestMode) {
      // 테스트 모드: 정답 여부와 무관하게 다음 단계로 진행
      behaviorCollector.current.trackVerifyAttempt(true);
      setIsVerified(true);
      setTimeout(() => onSuccess?.(), 300);
      return;
    }
    const selectedBikeImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image?.hasBike;
    });

    const selectedNonBikeImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image && !image.hasBike;
    });

    const isCorrect = selectedBikeImages.length === 3 && selectedNonBikeImages.length === 0;
    
    // 행동 데이터 기록
    behaviorCollector.current.trackVerifyAttempt(isCorrect);

    if (isCorrect) {
      setIsVerified(true);
      setTimeout(() => {
        console.log('Image captcha verified successfully!');
        onSuccess?.();
      }, 1000);
    } else {
      setSelectedImages([]);
    }
  };

  const handleRefresh = () => {
    setSelectedImages([]);
    setIsVerified(false);
    behaviorCollector.current.trackRefresh();
  };

  // 1장의 이미지를 9개 영역으로 나누어 사용
  const images: ImageItem[] = [
    // 첫 번째 행
    { id: 1, hasBike: false, selected: false, gridPosition: { row: 1, col: 1 } },
    { id: 2, hasBike: false, selected: false, gridPosition: { row: 1, col: 2 } },
    { id: 3, hasBike: true, selected: false, gridPosition: { row: 1, col: 3 } },
    // 두 번째 행
    { id: 4, hasBike: false, selected: false, gridPosition: { row: 2, col: 1 } },
    { id: 5, hasBike: false, selected: false, gridPosition: { row: 2, col: 2 } },
    { id: 6, hasBike: true, selected: false, gridPosition: { row: 2, col: 3 } },
    // 세 번째 행
    { id: 7, hasBike: false, selected: false, gridPosition: { row: 3, col: 1 } },
    { id: 8, hasBike: false, selected: false, gridPosition: { row: 3, col: 2 } },
    { id: 9, hasBike: true, selected: false, gridPosition: { row: 3, col: 3 } },
  ];

  return (
    <div 
      className="image-captcha"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        behaviorCollector.current.trackMouseMove(x, y);
      }}
    >
      <div className="captcha-header">
        <span className="header-text">Select all images with a bike{ttl > 0 ? ` · ${ttl}s` : ''}.</span>
      </div>
      
      <div className="image-grid">
        {images.map((image) => (
          <div
            key={image.id}
            className={`image-item ${selectedImages.includes(image.id) ? 'selected' : ''}`}
            onClick={(e) => handleImageClick(image.id, e.nativeEvent)}
            onMouseEnter={() => behaviorCollector.current.trackImageHover(image.id, true)}
            onMouseLeave={() => behaviorCollector.current.trackImageHover(image.id, false)}
          >
            <div 
              className="image-placeholder"
              style={{
                backgroundImage: 'url(https://picsum.photos/450/450?random=bike)',
                backgroundPosition: `${(image.gridPosition.col - 1) * 33.33}% ${(image.gridPosition.row - 1) * 33.33}%`,
                backgroundSize: '300% 300%'
              }}
            >
              {selectedImages.includes(image.id) && (
                <div className="selection-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                      fill="#ffffff"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
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
          className={`verify-button ${(isTestMode || selectedImages.length > 0) ? 'active' : ''}`}
          onClick={handleVerify}
          disabled={!isTestMode && selectedImages.length === 0}
        >
          VERIFY
        </button>
      </div>
    </div>
  );
};

export default ImageCaptcha; 