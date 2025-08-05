import { addBehaviorData, ClickPrecision, InteractionDensity, ImageInteraction } from '../utils/behaviorData';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface AbstractBehaviorMetrics {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalTime: number;
  
  // 이미지 상호작용
  imageInteractions: {
    [key: number]: {
      imageId: number;
      clicks: Point[];
      hovers: {
        enter: number;
        leave: number;
      }[];
      totalHoverTime: number;
      isSelected: boolean;
    }
  };
  selectionOrder: number[];
  deselectionOrder: number[];
  finalSelection: number[];
  
  // 마우스 움직임
  mouseTrajectory: Point[];
  
  // 버튼 상호작용
  refreshCount: number;
  verifyAttempts: number;
  
  // 검증 결과
  verificationSuccess: boolean;
  attemptDuration: number;
}

class ImageBehaviorCollector {
  private metrics: AbstractBehaviorMetrics;
  private isTracking: boolean = false;
  private lastMousePosition: Point | null = null;

  constructor() {
    this.metrics = {
      sessionId: `warm_feeling_${Date.now()}`,
      startTime: Date.now(),
      endTime: 0,
      totalTime: 0,
      imageInteractions: {},
      selectionOrder: [],
      deselectionOrder: [],
      finalSelection: [],
      mouseTrajectory: [],
      refreshCount: 0,
      verifyAttempts: 0,
      verificationSuccess: false,
      attemptDuration: 0
    };

    // 이미지 상호작용 초기화 (9개 이미지)
    for (let i = 1; i <= 9; i++) {
      this.metrics.imageInteractions[i] = {
        imageId: i,
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
    if (!this.isTracking) return;
    
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

  public trackVerifyAttempt(success: boolean): void {
    if (!this.isTracking) return;
    
    this.metrics.verifyAttempts++;
    this.metrics.verificationSuccess = success;
    this.metrics.attemptDuration = Date.now() - this.metrics.startTime;
    this.metrics.finalSelection = Object.entries(this.metrics.imageInteractions)
      .filter(([_, interaction]) => interaction.isSelected)
      .map(([id]) => parseInt(id));
    
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    try {
      addBehaviorData(this.metrics);
    } catch (error) {
      console.error('데이터 저장 중 오류:', error);
    }
  }
}

export default ImageBehaviorCollector; 