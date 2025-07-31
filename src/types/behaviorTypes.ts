// 데스크톱 행동 데이터 타입
export interface DesktopBehaviorData {
  mouseMovements: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  mouseClicks: Array<{
    x: number;
    y: number;
    timestamp: number;
    type: string;
  }>;
  scrollEvents: Array<{
    position: number;
    timestamp: number;
  }>;
  pageEvents: {
    enterTime: number;
    exitTime?: number;
    totalTime?: number;
  };
}

// 모바일 터치 데이터 타입
export interface TouchPoint {
  x: number;
  y: number;
  force: number;
  timestamp: number;
}

export interface Gesture {
  type: 'swipe' | 'pinch' | 'drag';
  startPoints: TouchPoint[];
  endPoints: TouchPoint[];
  duration: number;
  distance?: number;
  scale?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface MobileBehaviorData {
  touchPoints: TouchPoint[];
  gestures: Gesture[];
  touchIntervals: number[];  // 연속 터치 간격
  averageTouchInterval: number;
  touchPressures: number[];  // 터치 압력 값들
  touchDistribution: {       // 터치 위치 분포
    leftHalf: number;
    rightHalf: number;
    topHalf: number;
    bottomHalf: number;
  };
  pageEvents: {
    enterTime: number;
    exitTime?: number;
    totalTime?: number;
  };
}

// 공통 메타데이터
export interface BehaviorMetadata {
  sessionId: string;
  deviceType: 'mobile' | 'desktop';
  userAgent: string;
  screenSize: {
    width: number;
    height: number;
  };
  orientation?: 'portrait' | 'landscape';
}