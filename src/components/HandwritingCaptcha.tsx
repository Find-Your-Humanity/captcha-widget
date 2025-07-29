import React, { useState, useRef, useEffect } from 'react';
import './HandwritingCaptcha.css';
import HandwritingBehaviorCollector from './HandwritingBehaviorCollector';

interface HandwritingCaptchaProps {
  onSuccess?: () => void;
}

const HandwritingCaptcha: React.FC<HandwritingCaptchaProps> = ({ onSuccess }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingData, setDrawingData] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const behaviorCollector = useRef<HandwritingBehaviorCollector>(new HandwritingBehaviorCollector());

  // 이미지 데이터 (4~8.jpg 사용)
  const images = [
    { id: 1, src: '/4.jpg', alt: 'Kingfisher bird' },
    { id: 2, src: '/5.jpg', alt: 'Mountain landscape' },
    { id: 3, src: '/6.jpg', alt: 'Person on bicycle' },
    { id: 4, src: '/7.jpg', alt: 'Kingfisher bird duplicate' },
    { id: 5, src: '/8.jpg', alt: 'Mountain landscape duplicate' },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    contextRef.current = context;

    // 컴포넌트 마운트시 tracking 시작
    behaviorCollector.current.startTracking();

    // 컴포넌트 언마운트시 tracking 종료
    return () => {
      behaviorCollector.current.stopTracking();
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { offsetX, offsetY } = e.nativeEvent;
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    
    // 행동 데이터 수집 시작
    behaviorCollector.current.startStroke(offsetX, offsetY);
    
    // 그리기 시작할 때 현재 상태를 히스토리에 저장
    const canvas = canvasRef.current;
    if (canvas && contextRef.current) {
      const imageData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
      setDrawingHistory(prev => [...prev, imageData]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();

    // 행동 데이터 수집 중
    behaviorCollector.current.addPoint(offsetX, offsetY);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    contextRef.current?.closePath();
    
    // 행동 데이터 수집 종료
    behaviorCollector.current.endStroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setDrawingHistory([]);
    
    // 행동 데이터 초기화
    behaviorCollector.current.reset();
  };

  const undoLastStroke = () => {
    if (drawingHistory.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;
    
    // 마지막 히스토리 제거
    const newHistory = drawingHistory.slice(0, -1);
    setDrawingHistory(newHistory);
    
    // 캔버스 초기화
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    
    // 이전 상태로 복원
    if (newHistory.length > 0) {
      const lastImageData = newHistory[newHistory.length - 1];
      contextRef.current.putImageData(lastImageData, 0, 0);
    }
  };

  const handleVerify = () => {
    const isSuccess = drawingHistory.length > 0;
    
    // 검증 결과 설정
    behaviorCollector.current.setVerificationResult(isSuccess);
    
    // 행동 데이터 다운로드
    behaviorCollector.current.downloadMetrics();
    
    // 기존 검증 로직
    if (isSuccess) {
      console.log('Handwriting captcha verified successfully!');
      onSuccess?.();
    } else {
      alert('키워드를 입력해주세요.');
    }
  };

  const handleRefresh = () => {
    clearCanvas();
    setKeywords('');
  };

  return (
    <div className="handwriting-captcha">
      <div className="captcha-header">
        <span className="header-text">Look at the images and write the keywords that come to mind by hand.</span>
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
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
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
          className="verify-button active"
          onClick={handleVerify}
        >
          VERIFY
        </button>
      </div>
    </div>
  );
};

export default HandwritingCaptcha; 