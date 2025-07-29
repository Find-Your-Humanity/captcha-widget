import React, { useState } from 'react';
import './ImageCaptcha.css';

interface ImageItem {
  id: number;
  hasBike: boolean;
  selected: boolean;
  gridPosition: {
    row: number;
    col: number;
  };
}

interface ImageCaptchaProps {
  onSuccess?: () => void;
}

const ImageCaptcha: React.FC<ImageCaptchaProps> = ({ onSuccess }) => {
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [isVerified, setIsVerified] = useState(false);

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
    const selectedBikeImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image?.hasBike;
    });

    const selectedNonBikeImages = selectedImages.filter(id => {
      const image = images.find(img => img.id === id);
      return image && !image.hasBike;
    });

    // 자전거가 있는 이미지만 선택하고, 자전거가 없는 이미지는 선택하지 않은 경우 성공
    const isCorrect = selectedBikeImages.length === 3 && selectedNonBikeImages.length === 0;
    
    if (isCorrect) {
      setIsVerified(true);
      // 성공 시 부모 컴포넌트에 알림
      setTimeout(() => {
        console.log('Image captcha verified successfully!');
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
    <div className="image-captcha">
      <div className="captcha-header">
        <span className="header-text">Select all images with a bike.</span>
      </div>
      
      <div className="image-grid">
        {images.map((image) => (
          <div
            key={image.id}
            className={`image-item ${selectedImages.includes(image.id) ? 'selected' : ''}`}
            onClick={() => handleImageClick(image.id)}
          >
            <div 
              className="image-placeholder"
              style={{
                backgroundImage: 'url(/1.jpg)',
                backgroundPosition: `${(image.gridPosition.col - 1) * 33.33}% ${(image.gridPosition.row - 1) * 33.33}%`,
                backgroundSize: '300% 300%'
              }}
            >
              {/* 선택 표시를 위한 오버레이 */}
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

export default ImageCaptcha; 