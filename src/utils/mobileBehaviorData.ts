// 모바일 터치 데이터 타입 정의
interface TouchData {
  startTime: number;
  endTime?: number;
  duration?: number;
  startPosition: { x: number; y: number };
  endPosition?: { x: number; y: number };
  force: number;
  touchPoints: Array<{
    x: number;
    y: number;
    timestamp: number;
    force: number;
  }>;
  distance?: number;
  speed?: number;
  isMultiTouch: boolean;
  touchCount: number;
}

interface MobileBehaviorMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  deviceInfo: {
    userAgent: string;
    screenSize: { width: number; height: number };
    orientation: 'portrait' | 'landscape';
  };
  touchEvents: TouchData[];
  touchPatterns: {
    averageDuration: number;
    averageForce: number;
    averageDistance: number;
    averageSpeed: number;
    multiTouchCount: number;
    totalTouches: number;
  };
}

// 현재 세션의 데이터 저장소
let currentTouchData: TouchData | null = null;
let mobileBehaviorStore: MobileBehaviorMetrics = {
  sessionId: `mobile_${Date.now()}`,
  startTime: Date.now(),
  deviceInfo: {
    userAgent: navigator.userAgent,
    screenSize: {
      width: window.screen.width,
      height: window.screen.height
    },
    orientation: window.screen.height > window.screen.width ? 'portrait' : 'landscape'
  },
  touchEvents: [],
  touchPatterns: {
    averageDuration: 0,
    averageForce: 0,
    averageDistance: 0,
    averageSpeed: 0,
    multiTouchCount: 0,
    totalTouches: 0
  }
};

// 터치 시작 이벤트 처리
export function handleTouchStart(event: TouchEvent): void {
  const touch = event.touches[0];
  currentTouchData = {
    startTime: Date.now(),
    startPosition: {
      x: touch.clientX,
      y: touch.clientY
    },
    force: touch.force || 0,
    touchPoints: [{
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      force: touch.force || 0
    }],
    isMultiTouch: event.touches.length > 1,
    touchCount: event.touches.length
  };

  if (currentTouchData.isMultiTouch) {
    mobileBehaviorStore.touchPatterns.multiTouchCount++;
  }
  mobileBehaviorStore.touchPatterns.totalTouches++;
}

// 터치 이동 이벤트 처리
export function handleTouchMove(event: TouchEvent): void {
  if (!currentTouchData) return;

  const touch = event.touches[0];
  currentTouchData.touchPoints.push({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now(),
    force: touch.force || 0
  });
}

// 터치 종료 이벤트 처리
export function handleTouchEnd(event: TouchEvent): void {
  if (!currentTouchData) return;

  const endTime = Date.now();
  const lastTouch = event.changedTouches[0];

  // 터치 데이터 완성
  currentTouchData.endTime = endTime;
  currentTouchData.duration = endTime - currentTouchData.startTime;
  currentTouchData.endPosition = {
    x: lastTouch.clientX,
    y: lastTouch.clientY
  };

  // 이동 거리 계산
  const dx = currentTouchData.endPosition.x - currentTouchData.startPosition.x;
  const dy = currentTouchData.endPosition.y - currentTouchData.startPosition.y;
  currentTouchData.distance = Math.sqrt(dx * dx + dy * dy);

  // 속도 계산 (픽셀/밀리초)
  currentTouchData.speed = currentTouchData.distance / currentTouchData.duration;

  // 전체 데이터 저장
  mobileBehaviorStore.touchEvents.push(currentTouchData);

  // 패턴 데이터 업데이트
  updateTouchPatterns();

  // 현재 터치 데이터 초기화
  currentTouchData = null;
}

// 터치 패턴 분석 업데이트
function updateTouchPatterns(): void {
  const events = mobileBehaviorStore.touchEvents;
  if (events.length === 0) return;

  mobileBehaviorStore.touchPatterns = {
    averageDuration: events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length,
    averageForce: events.reduce((sum, e) => sum + e.force, 0) / events.length,
    averageDistance: events.reduce((sum, e) => sum + (e.distance || 0), 0) / events.length,
    averageSpeed: events.reduce((sum, e) => sum + (e.speed || 0), 0) / events.length,
    multiTouchCount: events.filter(e => e.isMultiTouch).length,
    totalTouches: events.length
  };
}

// 데이터 저장
export function saveMobileBehaviorData(): void {
  try {
    const currentSequence = parseInt(localStorage.getItem('mobile_sequence') || '0');
    const nextSequence = currentSequence + 1;
    const storageKey = `mobile_behavior_${nextSequence}`;

    mobileBehaviorStore.endTime = Date.now();
    
    localStorage.setItem(storageKey, JSON.stringify(mobileBehaviorStore));
    localStorage.setItem('mobile_sequence', nextSequence.toString());
    
    console.log('모바일 행동 데이터가 저장되었습니다:', {
      시퀀스번호: nextSequence,
      저장키: storageKey,
      데이터: mobileBehaviorStore
    });

    // 새로운 세션 시작
    mobileBehaviorStore = {
      sessionId: `mobile_${Date.now()}`,
      startTime: Date.now(),
      deviceInfo: mobileBehaviorStore.deviceInfo,
      touchEvents: [],
      touchPatterns: {
        averageDuration: 0,
        averageForce: 0,
        averageDistance: 0,
        averageSpeed: 0,
        multiTouchCount: 0,
        totalTouches: 0
      }
    };
  } catch (error) {
    console.error('모바일 데이터 저장 중 오류:', error);
  }
}

// 데이터 다운로드
export function downloadMobileBehaviorData(): void {
  try {
    const currentSequence = parseInt(localStorage.getItem('mobile_sequence') || '0');
    let allData = [];
    
    // 모든 시퀀스의 데이터 수집
    for (let i = 1; i <= currentSequence; i++) {
      const data = localStorage.getItem(`mobile_behavior_${i}`);
      if (data) {
        allData.push(JSON.parse(data));
      }
    }

    // 현재 진행 중인 세션 데이터도 포함
    if (mobileBehaviorStore.touchEvents.length > 0) {
      mobileBehaviorStore.endTime = Date.now();
      allData.push({ ...mobileBehaviorStore });
    }

    // 데이터를 JSON 파일로 변환
    const jsonContent = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 다운로드 링크 생성 및 클릭 (모바일/PC 모두 동작)
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mobile_behavior_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 일정 시간 후 URL 해제
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000); // 1분 후 해제
  } catch (error) {
    console.error('모바일 데이터 다운로드 중 오류:', error);
  }
}