import { addBehaviorData, ClickPrecision, InteractionDensity, ImageInteraction } from '../utils/behaviorData';

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
  mouseTrajectory: ClickPrecision[];
  
  // 버튼 상호작용
  refreshCount: number;
  verifyAttempts: number;
  
  // 검증 결과
  verificationSuccess: boolean;
  attemptDuration: number;
}

class ImageBehaviorCollector {
  private metrics: ImageBehaviorMetrics;
  private isTracking: boolean = false;
  private lastMousePosition: ClickPrecision | null = null;

  constructor() {
    this.metrics = {
      sessionId: `image_${Date.now()}`,
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

    // 이미지 상호작용 초기화 (백엔드 ID: 0..8)
    for (let i = 0; i < 9; i++) {
      this.metrics.imageInteractions[i] = {
        imageId: i,
        clicks: [],
        hovers: [],
        totalHoverTime: 0,
        isSelected: false,
        interactionDensity: {
          clickCount: 0,
          hoverCount: 0,
          totalHoverTime: 0,
          averageDwellTime: 0,
          density: 0
        }
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
    const rect = document.querySelector('.image-captcha')?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );

    const point: ClickPrecision = {
      x: x / rect.width,  // 상대 좌표로 변환
      y: y / rect.height, // 상대 좌표로 변환
      distanceFromCenter,
      timestamp
    };

    this.metrics.mouseTrajectory.push(point);
    this.lastMousePosition = point;
  }

  public trackImageClick(imageId: number, event: MouseEvent): void {
    if (!this.isTracking) return;

    const interaction = this.metrics.imageInteractions[imageId];
    if (!interaction) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const centerX = 0.5;
    const centerY = 0.5;
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );

    const click: ClickPrecision = {
      x,
      y,
      distanceFromCenter,
      timestamp: Date.now()
    };

    interaction.clicks.push(click);
    interaction.interactionDensity.clickCount++;
    this.updateInteractionDensity(interaction);
  }

  public trackImageHover(imageId: number, isEnter: boolean): void {
    if (!this.isTracking) return;

    const interaction = this.metrics.imageInteractions[imageId];
    if (!interaction) return;

    const timestamp = Date.now();
    if (isEnter) {
      interaction.hovers.push({ enter: timestamp, leave: 0 });
      interaction.interactionDensity.hoverCount++;
    } else {
      const lastHover = interaction.hovers[interaction.hovers.length - 1];
      if (lastHover && lastHover.leave === 0) {
        lastHover.leave = timestamp;
        const hoverTime = timestamp - lastHover.enter;
        interaction.totalHoverTime += hoverTime;
        interaction.interactionDensity.totalHoverTime += hoverTime;
      }
    }
    this.updateInteractionDensity(interaction);
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

  public trackImageSelection(imageId: number, isSelected: boolean): void {
    if (!this.isTracking) return;
    // 선택/해제 순서 기록
    // 누락된 ID는 즉시 초기화 (백엔드가 0..8 ID를 사용함)
    if (!this.metrics.imageInteractions[imageId]) {
      this.metrics.imageInteractions[imageId] = {
        imageId,
        clicks: [],
        hovers: [],
        totalHoverTime: 0,
        isSelected: false,
        interactionDensity: {
          clickCount: 0,
          hoverCount: 0,
          totalHoverTime: 0,
          averageDwellTime: 0,
          density: 0,
        },
      };
    }
    if (isSelected) {
      this.metrics.selectionOrder.push(imageId);
      this.metrics.imageInteractions[imageId].isSelected = true;
    } else {
      this.metrics.deselectionOrder.push(imageId);
      this.metrics.imageInteractions[imageId].isSelected = false;
    }
  }

  private updateInteractionDensity(interaction: ImageInteraction): void {
    const totalTime = Date.now() - this.metrics.startTime;
    interaction.interactionDensity.averageDwellTime = 
      interaction.interactionDensity.totalHoverTime / interaction.interactionDensity.hoverCount || 0;
    interaction.interactionDensity.density = 
      (interaction.interactionDensity.clickCount + interaction.interactionDensity.hoverCount) / 
      (totalTime || 1);
  }

  private saveToLocalStorage(): void {
    try {
      // behaviorData에 저장
      addBehaviorData(this.metrics);
    } catch (error) {
      console.error('데이터 저장 중 오류:', error);
    }
  }

  public downloadMetrics(filename?: string): void {
    const data = JSON.stringify(this.metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `image_behavior_${this.metrics.sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default ImageBehaviorCollector; 