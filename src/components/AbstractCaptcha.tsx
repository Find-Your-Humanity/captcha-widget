import React, { useState, useRef, useEffect } from 'react';
import './AbstractCaptcha.css';
import ImageBehaviorCollector from './ImageBehaviorCollector';
import { downloadBehaviorData } from '../utils/behaviorData';

interface ImageItem {
  id: number;
  src: string;
  hasAbstractFeeling: boolean;
  selected: boolean;
}

interface AbstractCaptchaProps {
  onSuccess?: () => void;
}

const AbstractCaptcha: React.FC<AbstractCaptchaProps> = ({ onSuccess }) => {
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const behaviorCollector = useRef<ImageBehaviorCollector>(new ImageBehaviorCollector());

  useEffect(() => {
    behaviorCollector.current.startTracking();
    return () => {
      behaviorCollector.current.stopTracking();
    };
  }, []);

  // 9장의 테스트 이미지 (플레이스홀더)
  const images: ImageItem[] = [
    { id: 1, src: '/2.jpg', hasAbstractFeeling: true, selected: false },
    { id: 2, src: '/3.jpg', hasAbstractFeeling: true, selected: false },
    { id: 3, src: '/4.jpg', hasAbstractFeeling: true, selected: false },
    { id: 4, src: '/5.jpg', hasAbstractFeeling: false, selected: false },
    { id: 5, src: '/6.jpg', hasAbstractFeeling: false, selected: false },
    { id: 6, src: '/7.jpg', hasAbstractFeeling: false, selected: false },
    { id: 7, src: '/8.jpg', hasAbstractFeeling: true, selected: false },
    { id: 8, src: '/9.jpg', hasAbstractFeeling: false, selected: false },
    { id: 9, src: '/10.jpg', hasAbstractFeeling: true, selected: false },
  ];

  const handleImageClick = (imageId: number) => {
    const wasSelected = selectedImages.includes(imageId);
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
    behaviorCollector.current.trackImageSelection(imageId, !wasSelected);
  };

  const handleVerify = () => {
    const selectedWarmImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image?.hasAbstractFeeling;
    });

    const selectedColdImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image && !image.hasAbstractFeeling;
    });

    const isCorrect = selectedWarmImages.length === 5 && selectedColdImages.length === 0;
    
    // 행동 데이터 기록 및 다운로드
    behaviorCollector.current.trackVerifyAttempt(isCorrect);
    behaviorCollector.current.downloadMetrics(`abstractcaptcha_behavior_${Date.now()}.json`);

    if (isCorrect) {
      setIsVerified(true);
      setTimeout(() => {
        console.log('Warm feeling captcha verified successfully!');
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
        <span className="header-text">Select all images with a warm feeling.</span>
      </div>
      
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
              <img src={image.src} alt={`Image ${image.id}`} />
            </div>
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
          className={`verify-button ${selectedImages.length > 0 ? 'active' : ''}`}
          onClick={handleVerify}
          disabled={selectedImages.length === 0}
        >
          VERIFY
        </button>
      </div>
    </div>
  );
};

export default AbstractCaptcha; 