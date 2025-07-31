interface TouchPoint {
  x: number;
  y: number;
  force: number;
  timestamp: number;
}

interface Gesture {
  type: 'swipe' | 'pinch' | 'drag';
  startPoints: TouchPoint[];
  endPoints: TouchPoint[];
  duration: number;
  distance?: number;
  scale?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

interface TouchInteraction {
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
}

interface MobileBehaviorData {
  sessionId: string;
  startTime: number;
  endTime: number;
  deviceInfo: {
    userAgent: string;
    screenSize: {
      width: number;
      height: number;
    };
    orientation: 'portrait' | 'landscape';
  };
  touchInteractions: TouchInteraction;
}

let mobileBehaviorStore: MobileBehaviorData[] = [];
let currentTouchInteraction: TouchInteraction = {
  touchPoints: [],
  gestures: [],
  touchIntervals: [],
  averageTouchInterval: 0,
  touchPressures: [],
  touchDistribution: {
    leftHalf: 0,
    rightHalf: 0,
    topHalf: 0,
    bottomHalf: 0
  }
};

let lastTouchTimestamp = 0;

// 터치 이벤트 처리
function handleTouchStart(event: TouchEvent): void {
  const touches = Array.from(event.touches);
  const timestamp = Date.now();
  
  // 터치 간격 계산
  if (lastTouchTimestamp > 0) {
    const interval = timestamp - lastTouchTimestamp;
    currentTouchInteraction.touchIntervals.push(interval);
    currentTouchInteraction.averageTouchInterval = 
      currentTouchInteraction.touchIntervals.reduce((a, b) => a + b, 0) / 
      currentTouchInteraction.touchIntervals.length;
  }
  lastTouchTimestamp = timestamp;

  // 터치 포인트 저장
  touches.forEach(touch => {
    const point: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      force: touch.force || 0,
      timestamp
    };
    currentTouchInteraction.touchPoints.push(point);
    currentTouchInteraction.touchPressures.push(point.force);

    // 터치 위치 분포 업데이트
    const rect = document.body.getBoundingClientRect();
    const midX = rect.width / 2;
    const midY = rect.height / 2;

    if (point.x < midX) currentTouchInteraction.touchDistribution.leftHalf++;
    else currentTouchInteraction.touchDistribution.rightHalf++;
    if (point.y < midY) currentTouchInteraction.touchDistribution.topHalf++;
    else currentTouchInteraction.touchDistribution.bottomHalf++;
  });
}

// 제스처 감지 및 처리
function handleGesture(event: TouchEvent, type: 'swipe' | 'pinch' | 'drag'): void {
  const touches = Array.from(event.touches);
  const timestamp = Date.now();

  if (touches.length >= 2 && type === 'pinch') {
    // 핀치 제스처 처리
    const touch1 = touches[0];
    const touch2 = touches[1];
    const distance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    currentTouchInteraction.gestures.push({
      type: 'pinch',
      startPoints: currentTouchInteraction.touchPoints.slice(-2),
      endPoints: touches.map(t => ({
        x: t.clientX,
        y: t.clientY,
        force: t.force || 0,
        timestamp
      })),
      duration: timestamp - lastTouchTimestamp,
      distance,
      scale: event instanceof TouchEvent ? (event as any).scale : undefined
    });
  } else {
    // 스와이프/드래그 제스처 처리
    const touch = touches[0];
    const startPoint = currentTouchInteraction.touchPoints[0];
    if (!startPoint) return;

    const dx = touch.clientX - startPoint.x;
    const dy = touch.clientY - startPoint.y;
    const distance = Math.hypot(dx, dy);
    
    let direction: 'left' | 'right' | 'up' | 'down' | undefined;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    currentTouchInteraction.gestures.push({
      type,
      startPoints: [startPoint],
      endPoints: [{
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0,
        timestamp
      }],
      duration: timestamp - startPoint.timestamp,
      distance,
      direction
    });
  }
}

// 데이터 저장
function saveMobileBehaviorData(): void {
  try {
    const currentSequence = parseInt(localStorage.getItem('mobile_sequence') || '0');
    const nextSequence = currentSequence + 1;
    const storageKey = `mobile_behavior_${nextSequence}`;
    
    const data: MobileBehaviorData = {
      sessionId: `mobile_${Date.now()}`,
      startTime: currentTouchInteraction.touchPoints[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenSize: {
          width: window.screen.width,
          height: window.screen.height
        },
        orientation: window.screen.height > window.screen.width ? 'portrait' : 'landscape'
      },
      touchInteractions: currentTouchInteraction
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
    localStorage.setItem('mobile_sequence', nextSequence.toString());
    
    // 현재 세션 데이터 초기화
    currentTouchInteraction = {
      touchPoints: [],
      gestures: [],
      touchIntervals: [],
      averageTouchInterval: 0,
      touchPressures: [],
      touchDistribution: {
        leftHalf: 0,
        rightHalf: 0,
        topHalf: 0,
        bottomHalf: 0
      }
    };
    
    console.log('모바일 행동 데이터가 저장되었습니다:', {
      시퀀스번호: nextSequence,
      저장키: storageKey
    });
  } catch (error) {
    console.error('모바일 데이터 저장 중 오류:', error);
  }
}

// 데이터 다운로드
function downloadMobileBehaviorData(): void {
  try {
    const currentSequence = parseInt(localStorage.getItem('mobile_sequence') || '0');
    let allData: MobileBehaviorData[] = [];
    
    for (let i = 1; i <= currentSequence; i++) {
      const data = localStorage.getItem(`mobile_behavior_${i}`);
      if (data) {
        allData.push(JSON.parse(data));
      }
    }

    const jsonData = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mobile_behavior_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('모바일 데이터 다운로드 중 오류:', error);
  }
}

export {
  handleTouchStart,
  handleGesture,
  saveMobileBehaviorData,
  downloadMobileBehaviorData
};