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

// 마지막 저장 시점
let lastSaveTimestamp: number = 0;

// 시퀀스 카운터
const sequenceCounters = {
  captcha: 0,
  image: 0,
  abstractFeeling: 0,
  handwriting: 0
};

// 현재 시간 기반으로 파일명 생성
function getCurrentTimeString(): string {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
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
    // 현재 시퀀스 번호 가져오기
    const currentSequence = parseInt(localStorage.getItem('current_sequence') || '0');
    const nextSequence = currentSequence + 1;
    
    // 새로운 키로 현재 데이터 저장
    const storageKey = `behavior_data_${nextSequence}`;
    
    // 데이터 저장
    localStorage.setItem(storageKey, JSON.stringify(behaviorDataStore));
    localStorage.setItem('current_sequence', nextSequence.toString());
    
    // 디버깅을 위한 로그
    console.log('행동 데이터가 저장되었습니다:', {
      시퀀스번호: nextSequence,
      저장키: storageKey,
      데이터길이: behaviorDataStore.length
    });

    // 저장 후 behaviorDataStore 초기화
    behaviorDataStore = [];
  } catch (error) {
    console.error('행동 데이터 저장 중 오류:', error);
  }
}

// 행동 데이터 로드
function loadBehaviorData(): void {
  try {
    const currentSequence = parseInt(localStorage.getItem('current_sequence') || '0');
    let allData: any[] = [];
    
    // 모든 시퀀스의 데이터 로드
    for (let i = 1; i <= currentSequence; i++) {
      const sequenceData = localStorage.getItem(`behavior_data_${i}`);
      if (sequenceData) {
        const parsedData = JSON.parse(sequenceData);
        allData = allData.concat(parsedData);
      }
    }
    
    behaviorDataStore = allData;
  } catch (error) {
    console.error('행동 데이터 로드 중 오류:', error);
  }
}

// 행동 데이터 초기화
function clearBehaviorData(): void {
  behaviorDataStore = [];  // 배열로 초기화
  lastSaveTimestamp = 0;   // 마지막 저장 시점 초기화
  Object.keys(sequenceCounters).forEach(key => {
    sequenceCounters[key as keyof typeof sequenceCounters] = 0;
  });
  
  // 기존 시퀀스 데이터 모두 삭제
  const currentSequence = parseInt(localStorage.getItem('current_sequence') || '0');
  for (let i = 1; i <= currentSequence; i++) {
    localStorage.removeItem(`behavior_data_${i}`);
  }
  
  localStorage.removeItem('current_sequence');
  localStorage.removeItem('sequence_counters');
}

// 행동 데이터 다운로드
function downloadBehaviorData(): void {
  try {
    // localStorage에서 모든 데이터 수집
    const currentSequence = parseInt(localStorage.getItem('current_sequence') || '0');
    let allData: any[] = [];
    
    // 모든 시퀀스의 데이터 수집
    for (let i = 1; i <= currentSequence; i++) {
      const sequenceData = localStorage.getItem(`behavior_data_${i}`);
      if (sequenceData) {
        const parsedData = JSON.parse(sequenceData);
        allData = allData.concat(parsedData);
      }
    }
    
    // 현재 메모리에 있는 데이터도 추가 (아직 저장되지 않은 데이터)
    if (behaviorDataStore.length > 0) {
      allData = allData.concat(behaviorDataStore);
    }
    
    const data = JSON.stringify(allData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 현재 시간 기반으로 파일명 생성
    const timeString = getCurrentTimeString();
    link.download = `behavior_data_${timeString}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('데이터 다운로드 완료:', {
      시퀀스개수: currentSequence,
      전체데이터수: allData.length,
      현재메모리데이터수: behaviorDataStore.length
    });
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