export interface ClickPrecision {
  x: number;          // 클릭 X 좌표 (이미지 내부 상대 좌표, 0~1)
  y: number;          // 클릭 Y 좌표 (이미지 내부 상대 좌표, 0~1)
  distanceFromCenter: number; // 중심점으로부터의 거리
  timestamp: number;
}

export interface InteractionDensity {
  clickCount: number;    // 총 클릭 수
  hoverCount: number;    // 총 호버 수
  totalHoverTime: number;// 총 호버 시간
  averageDwellTime: number; // 평균 체류 시간
  density: number;       // (클릭 수 + 호버 수) / 전체 상호작용 시간
}

export interface ImageInteraction {
  imageId: number;
  clicks: ClickPrecision[];
  hovers: {
    enter: number;
    leave: number;
  }[];
  totalHoverTime: number;
  isSelected: boolean;
  interactionDensity: InteractionDensity;
}

// 행동 데이터 저장소
let behaviorDataStore: any[] = [];

// 시퀀스 카운터
const sequenceCounters = {
  captcha: 0,
  image: 0,
  warmFeeling: 0,
  handwriting: 0
};

// 컴포넌트 타입 확인
function getComponentType(data: any): string {
  if (data.sessionId.includes('image_')) {
    return 'image';
  } else if (data.sessionId.includes('warm_feeling_')) {
    return 'warmFeeling';
  } else if (data.sessionId.includes('handwriting_')) {
    return 'handwriting';
  }
  return 'captcha';
}

// 시퀀스 번호 생성
function getNextSequence(componentType: string): number {
  sequenceCounters[componentType as keyof typeof sequenceCounters]++;
  return sequenceCounters[componentType as keyof typeof sequenceCounters];
}

// 행동 데이터 추가
//captcha setInterval 10초마다 저장
function addBehaviorData(data: any): void {
  behaviorDataStore.push(data);
  saveBehaviorData();
}

// 행동 데이터 저장
//captcha setInterval 10초마다 저장
function saveBehaviorData(): void {
  try {
    localStorage.setItem('behavior_data', JSON.stringify(behaviorDataStore));
    localStorage.setItem('sequence_counters', JSON.stringify(sequenceCounters));
  } catch (error) {
    console.error('행동 데이터 저장 중 오류:', error);
  }
}

// 행동 데이터 로드
function loadBehaviorData(): void {
  try {
    const data = localStorage.getItem('behavior_data');
    const counters = localStorage.getItem('sequence_counters');
    if (data) {
      behaviorDataStore = JSON.parse(data);
    }
    if (counters) {
      Object.assign(sequenceCounters, JSON.parse(counters));
    }
  } catch (error) {
    console.error('행동 데이터 로드 중 오류:', error);
  }
}

// 행동 데이터 초기화
function clearBehaviorData(): void {
  behaviorDataStore = [];
  Object.keys(sequenceCounters).forEach(key => {
    sequenceCounters[key as keyof typeof sequenceCounters] = 0;
  });
  localStorage.removeItem('behavior_data');
  localStorage.removeItem('sequence_counters');
}

// 행동 데이터 다운로드
function downloadBehaviorData(): void {
  try {
    const data = JSON.stringify(behaviorDataStore, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 마지막 데이터의 컴포넌트 타입 확인
    const lastData = behaviorDataStore[behaviorDataStore.length - 1];
    const componentType = getComponentType(lastData);
    const sequence = getNextSequence(componentType);

    // 컴포넌트별 파일명 생성
    const fileNames = {
      captcha: `captcha_session${sequence}`,
      image: `image_captcha_session${sequence}`,
      warmFeeling: `warm_feeling_captcha_session${sequence}`,
      handwriting: `handwriting_captcha_session${sequence}`
    };

    link.download = `${fileNames[componentType as keyof typeof fileNames]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('데이터 다운로드 중 오류:', error);
  }
}

export {
  behaviorDataStore,
  addBehaviorData,
  loadBehaviorData,
  clearBehaviorData,
  downloadBehaviorData
}; 