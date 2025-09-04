import React from 'react';
import './CaptchaOverlay.css';

interface CaptchaOverlayProps {
  state: 'loading' | 'success' | 'error';
  message?: string;
}

const CaptchaOverlay: React.FC<CaptchaOverlayProps> = ({ state, message }) => {
  const getIcon = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="overlay-loading-spinner">
            <div className="overlay-spinner"></div>
          </div>
        );
      case 'success':
        return (
          <div className="success-check">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#4CAF50" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="error-x">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="#F44336" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (state) {
      case 'loading':
        return '검증 중...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Failed';
      default:
        return '';
    }
  };

  return (
    <div className="captcha-overlay">
      {getIcon()}
      <div className="overlay-message">{getMessage()}</div>
    </div>
  );
};

export default CaptchaOverlay; 