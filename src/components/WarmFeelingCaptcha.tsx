import React, { useState } from 'react';
import './WarmFeelingCaptcha.css';

interface ImageItem {
  id: number;
  src: string;
  hasWarmFeeling: boolean;
  selected: boolean;
}

interface WarmFeelingCaptchaProps {
  onSuccess?: () => void;
}

const WarmFeelingCaptcha: React.FC<WarmFeelingCaptchaProps> = ({ onSuccess }) => {
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [isVerified, setIsVerified] = useState(false);

  // 9장의 테스트 이미지 (플레이스홀더)
  const images: ImageItem[] = [
    { id: 1, src: 'https://picsum.photos/150/150?random=1', hasWarmFeeling: true, selected: false },
    { id: 2, src: 'https://picsum.photos/150/150?random=2', hasWarmFeeling: true, selected: false },
    { id: 3, src: 'https://picsum.photos/150/150?random=3', hasWarmFeeling: true, selected: false },
    { id: 4, src: 'https://picsum.photos/150/150?random=4', hasWarmFeeling: false, selected: false },
    { id: 5, src: 'https://picsum.photos/150/150?random=5', hasWarmFeeling: false, selected: false },
    { id: 6, src: 'https://picsum.photos/150/150?random=6', hasWarmFeeling: false, selected: false },
    { id: 7, src: 'https://picsum.photos/150/150?random=7', hasWarmFeeling: true, selected: false },
    { id: 8, src: 'https://picsum.photos/150/150?random=8', hasWarmFeeling: false, selected: false },
    { id: 9, src: 'https://picsum.photos/150/150?random=9', hasWarmFeeling: true, selected: false },
  ];

  const handleImageClick = (imageId: number) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const handleVerify = () => {
    const selectedWarmImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image?.hasWarmFeeling;
    });

    const selectedColdImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image && !image.hasWarmFeeling;
    });

    // 따뜻한 느낌의 이미지만 선택하고, 차가운 느낌의 이미지는 선택하지 않은 경우 성공
    const isCorrect = selectedWarmImages.length === 5 && selectedColdImages.length === 0;
    
    if (isCorrect) {
      setIsVerified(true);
      // 성공 시 부모 컴포넌트에 알림
      setTimeout(() => {
        console.log('Warm feeling captcha verified successfully!');
        onSuccess?.(); // 부모 컴포넌트에 성공 알림
      }, 1000);
    } else {
      // 실패 시 선택 초기화
      setSelectedImages([]);
    }
  };

  const handleRefresh = () => {
    setSelectedImages([]);
    setIsVerified(false);
  };

  return (
    <div className="warm-feeling-captcha">
      <div className="captcha-header">
        <span className="header-text">Select all images with a warm feeling.</span>
      </div>
      
      <div className="image-grid">
        {images.map((image) => (
          <div
            key={image.id}
            className={`image-item ${selectedImages.includes(image.id) ? 'selected' : ''}`}
            onClick={() => handleImageClick(image.id)}
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

export default WarmFeelingCaptcha; 