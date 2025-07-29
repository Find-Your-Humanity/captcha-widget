interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface GridPosition {
  row: number;
  col: number;
}

interface ImageInteraction {
  imageId: number;
  gridPosition: GridPosition;
  clicks: Point[];
  hovers: {
    enter: number;
    leave: number;
  }[];
  totalHoverTime: number;
  isSelected: boolean;
}

interface ImageBehaviorMetrics {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalTime: number;
  
  // 이미지 상호작용
  imageInteractions: { [key: number]: ImageInteraction };
  selectionOrder: number[];
  deselectionOrder: number[];
  finalSelection: number[];
  
  // 마우스 움직임
  mouseTrajectory: Point[];
  gridMovements: {
    from: GridPosition;
    to: GridPosition;
    timestamp: number;
  }[];
  
  // 버튼 상호작용
  refreshCount: number;
  verifyAttempts: number;
  
  // 검증 결과
  verificationSuccess: boolean;
  attemptDuration: number;
}

class WarmFeelingBehaviorCollector {
  private metrics: ImageBehaviorMetrics;
  private isTracking: boolean = false;
  private lastGridPosition: GridPosition | null = null;
  private lastMousePosition: Point | null = null;

  constructor() {
    this.metrics = {
      sessionId: `session_${Date.now()}`,
      startTime: Date.now(),
      endTime: 0,
      totalTime: 0,
      imageInteractions: {},
      selectionOrder: [],
      deselectionOrder: [],
      finalSelection: [],
      mouseTrajectory: [],
      gridMovements: [],
      refreshCount: 0,
      verifyAttempts: 0,
      verificationSuccess: false,
      attemptDuration: 0
    };

    // 이미지 상호작용 초기화 (9개 그리드)
    for (let i = 1; i <= 9; i++) {
      this.metrics.imageInteractions[i] = {
        imageId: i,
        gridPosition: {
          row: Math.ceil(i / 3),
          col: ((i - 1) % 3) + 1
        },
        clicks: [],
        hovers: [],
        totalHoverTime: 0,
        isSelected: false
      };
    }
  }

  public startTracking(): void {
    this.isTracking = true;
    this.metrics.startTime = Date.now();
  }

  public stopTracking(): void {
    this.isTracking = false;
    this.metrics.endTime = Date.now();
    this.metrics.totalTime = this.metrics.endTime - this.metrics.startTime;
    this.saveToLocalStorage();
  }

  public trackMouseMove(x: number, y: number): void {
    if (!this.isTracking) return;

    const timestamp = Date.now();
    const point: Point = { x, y, timestamp };
    this.metrics.mouseTrajectory.push(point);

    // 그리드 위치 계산
    const gridPosition = this.calculateGridPosition(x, y);
    if (gridPosition && this.lastGridPosition) {
      if (gridPosition.row !== this.lastGridPosition.row || 
          gridPosition.col !== this.lastGridPosition.col) {
        this.metrics.gridMovements.push({
          from: this.lastGridPosition,
          to: gridPosition,
          timestamp
        });
      }
    }
    this.lastGridPosition = gridPosition;
    this.lastMousePosition = point;
  }

  public trackImageSelection(imageId: number, selected: boolean): void {
    if (!this.isTracking) return;

    const interaction = this.metrics.imageInteractions[imageId];
    if (!interaction) return;

    interaction.isSelected = selected;
    if (selected) {
      this.metrics.selectionOrder.push(imageId);
    } else {
      this.metrics.deselectionOrder.push(imageId);
    }

    // 클릭 위치 기록
    if (this.lastMousePosition) {
      interaction.clicks.push(this.lastMousePosition);
    }
  }

  public trackImageHover(imageId: number, isEnter: boolean): void {
    if (!this.isTracking) return;

    const interaction = this.metrics.imageInteractions[imageId];
    if (!interaction) return;

    const timestamp = Date.now();
    if (isEnter) {
      interaction.hovers.push({ enter: timestamp, leave: 0 });
    } else {
      const lastHover = interaction.hovers[interaction.hovers.length - 1];
      if (lastHover && lastHover.leave === 0) {
        lastHover.leave = timestamp;
        interaction.totalHoverTime += timestamp - lastHover.enter;
      }
    }
  }

  public trackRefresh(): void {
    if (!this.isTracking) return;
    this.metrics.refreshCount++;
  }

  public downloadAllSessionsAsJS(): void {
    try {
      // 모든 세션 데이터 가져오기
      const sessionList = JSON.parse(localStorage.getItem('warm_feeling_captcha_sessions') || '[]');
      const allSessions = sessionList.map((key: string) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }).filter(Boolean);

      // JavaScript 파일 내용 생성
      const jsContent = `
// WarmFeeling Captcha Behavior Data
const behaviorData = ${JSON.stringify(allSessions, null, 2)};

// 데이터 분석을 위한 유틸리티 함수들
const utils = {
  // 총 세션 수
  getTotalSessions() {
    return behaviorData.length;
  },

  // 총 마우스 이동 거리
  getTotalMouseDistance() {
    return behaviorData.reduce((total, session) => {
      let sessionTotal = 0;
      const movements = session.mouseTrajectory;
      for (let i = 1; i < movements.length; i++) {
        const dx = movements[i].x - movements[i-1].x;
        const dy = movements[i].y - movements[i-1].y;
        sessionTotal += Math.sqrt(dx * dx + dy * dy);
      }
      return total + sessionTotal;
    }, 0);
  },

  // 그리드 이동 분석
  getGridMovementAnalysis() {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalMovements: session.gridMovements.length,
      movementPattern: session.gridMovements.map(m => ({
        from: m.from,
        to: m.to,
        timestamp: m.timestamp
      }))
    }));
  },

  // 이미지 상호작용 분석
  getImageInteractionAnalysis() {
    return behaviorData.map(session => {
      const interactions = Object.values(session.imageInteractions);
      return {
        sessionId: session.sessionId,
        totalClicks: interactions.reduce((sum, int) => sum + int.clicks.length, 0),
        totalHoverTime: interactions.reduce((sum, int) => sum + int.totalHoverTime, 0),
        selectionOrder: session.selectionOrder,
        deselectionOrder: session.deselectionOrder,
        finalSelection: session.finalSelection
      };
    });
  },

  // 시간 관련 분석
  getTimeAnalysis() {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalDuration: session.endTime - session.startTime,
      verificationAttempts: session.verifyAttempts,
      verificationSuccess: session.verificationSuccess,
      attemptDuration: session.attemptDuration
    }));
  },

  // 성공률 분석
  getSuccessAnalysis() {
    const total = behaviorData.length;
    const successful = behaviorData.filter(session => session.verificationSuccess).length;
    return {
      totalSessions: total,
      successfulSessions: successful,
      successRate: (successful / total) * 100
    };
  }
};

// 데이터 내보내기
module.exports = {
  behaviorData,
  utils
};`;

      // 파일 다운로드
      const blob = new Blob([jsContent], { type: 'application/javascript' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `warm_feeling_behavior_${Date.now()}.js`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 다운로드 후 로컬 스토리지 클리어
      sessionList.forEach((key: string) => localStorage.removeItem(key));
      localStorage.removeItem('warm_feeling_captcha_sessions');
    } catch (error) {
      console.error('데이터 다운로드 중 오류:', error);
    }
  }

  public trackVerifyAttempt(success: boolean): void {
    if (!this.isTracking) return;
    
    this.metrics.verifyAttempts++;
    this.metrics.verificationSuccess = success;
    this.metrics.attemptDuration = Date.now() - this.metrics.startTime;
    this.metrics.finalSelection = Object.entries(this.metrics.imageInteractions)
      .filter(([_, interaction]) => interaction.isSelected)
      .map(([id]) => parseInt(id));
    
    this.saveToLocalStorage();
    this.downloadAllSessionsAsJS(); // verify 시도시 모든 세션 데이터 다운로드
  }

  private calculateGridPosition(x: number, y: number): GridPosition | null {
    // 그리드 위치 계산 로직
    const gridSize = 33.33; // 3x3 그리드에서 각 셀의 크기 (%)
    const row = Math.ceil(y / gridSize);
    const col = Math.ceil(x / gridSize);
    
    if (row >= 1 && row <= 3 && col >= 1 && col <= 3) {
      return { row, col };
    }
    return null;
  }

  private saveToLocalStorage(): void {
    try {
      const storageKey = `warm_feeling_behavior_${this.metrics.sessionId}`;
      localStorage.setItem(storageKey, JSON.stringify(this.metrics));

      // 세션 목록 관리
      const sessionList = JSON.parse(localStorage.getItem('warm_feeling_captcha_sessions') || '[]');
      if (!sessionList.includes(storageKey)) {
        sessionList.push(storageKey);
        localStorage.setItem('warm_feeling_captcha_sessions', JSON.stringify(sessionList));
      }
    } catch (error) {
      console.error('로컬 스토리지 저장 중 오류:', error);
    }
  }

  public downloadMetrics(): void {
    const data = JSON.stringify(this.metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `warm_feeling_behavior_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  public reset(): void {
    this.metrics = {
      sessionId: `session_${Date.now()}`,
      startTime: Date.now(),
      endTime: 0,
      totalTime: 0,
      imageInteractions: {},
      selectionOrder: [],
      deselectionOrder: [],
      finalSelection: [],
      mouseTrajectory: [],
      gridMovements: [],
      refreshCount: 0,
      verifyAttempts: 0,
      verificationSuccess: false,
      attemptDuration: 0
    };

    // 이미지 상호작용 초기화 (9개 그리드)
    for (let i = 1; i <= 9; i++) {
      this.metrics.imageInteractions[i] = {
        imageId: i,
        gridPosition: {
          row: Math.ceil(i / 3),
          col: ((i - 1) % 3) + 1
        },
        clicks: [],
        hovers: [],
        totalHoverTime: 0,
        isSelected: false
      };
    }

    this.lastGridPosition = null;
    this.lastMousePosition = null;
    this.isTracking = true;
  }
}

export default WarmFeelingBehaviorCollector; 