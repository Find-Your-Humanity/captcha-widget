import { addBehaviorData } from '../utils/behaviorData';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface WritingMetrics {
  // 기본 스트로크 데이터
  strokeCount: number;           // 총 스트로크 수
  strokeLengths: number[];      // 각 스트로크의 길이
  strokeDurations: number[];    // 각 스트로크의 지속 시간
  strokeIntervals: number[];    // 스트로크 간 간격

  // 움직임 특성
  strokeCurvatures: number[];   // 곡률
  strokeJitters: number[];      // 떨림
  directionChanges: number[];   // 방향 전환
  hesitationPoints: number[];   // 망설임 지점

  // 시간 관련
  totalTime: number;            // 총 소요 시간
  averageSpeed: number;         // 평균 속도
  speedVariations: number[];    // 속도 변화

  // 세션 정보
  sessionId: string;
  startTime: number;
  endTime: number;
  
  // 검증 결과
  verificationSuccess: boolean;
}

class HandwritingBehaviorCollector {
  private metrics: WritingMetrics;
  private isTracking: boolean = false;
  private currentStroke: Point[] = [];
  private lastStrokeEnd: number = 0;

  constructor() {
    this.metrics = {
      strokeCount: 0,
      strokeLengths: [],
      strokeDurations: [],
      strokeIntervals: [],
      strokeCurvatures: [],
      strokeJitters: [],
      directionChanges: [],
      hesitationPoints: [],
      totalTime: 0,
      averageSpeed: 0,
      speedVariations: [],
      sessionId: `handwriting_${Date.now()}`,
      startTime: Date.now(),
      endTime: 0,
      verificationSuccess: false
    };
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
    
    // 최종 데이터만 저장
    this.saveToLocalStorage();
  }

  public startStroke(x: number, y: number): void {
    if (!this.isTracking) return;

    const timestamp = Date.now();
    const point: Point = { x, y, timestamp };
    
    this.currentStroke = [point];
    
    if (this.lastStrokeEnd > 0) {
      this.metrics.strokeIntervals.push(timestamp - this.lastStrokeEnd);
    }
  }

  public addPoint(x: number, y: number): void {
    if (!this.isTracking || this.currentStroke.length === 0) return;

    const point: Point = { x, y, timestamp: Date.now() };
    this.currentStroke.push(point);
    this.updateMetrics();
  }

  public endStroke(): void {
    if (!this.isTracking || this.currentStroke.length < 2) return;

    this.metrics.strokeCount++;
    this.lastStrokeEnd = Date.now();
    
    const length = this.calculateStrokeLength();
    const duration = this.currentStroke[this.currentStroke.length - 1].timestamp - this.currentStroke[0].timestamp;
    const curvature = this.calculateCurvature();
    const jitter = this.calculateJitter();
    const directionChanges = this.calculateDirectionChanges();
    const hesitations = this.calculateHesitations();

    this.metrics.strokeLengths.push(length);
    this.metrics.strokeDurations.push(duration);
    this.metrics.strokeCurvatures.push(curvature);
    this.metrics.strokeJitters.push(jitter);
    this.metrics.directionChanges.push(directionChanges);
    this.metrics.hesitationPoints.push(hesitations);

    const speed = length / duration;
    this.metrics.speedVariations.push(speed);

    this.updateAverages();
    this.currentStroke = [];
  }

  private calculateStrokeLength(): number {
    let length = 0;
    for (let i = 1; i < this.currentStroke.length; i++) {
      const dx = this.currentStroke[i].x - this.currentStroke[i-1].x;
      const dy = this.currentStroke[i].y - this.currentStroke[i-1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  private calculateCurvature(): number {
    if (this.currentStroke.length < 3) return 0;
    
    let totalCurvature = 0;
    for (let i = 1; i < this.currentStroke.length - 1; i++) {
      const prev = this.currentStroke[i-1];
      const curr = this.currentStroke[i];
      const next = this.currentStroke[i+1];
      
      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      totalCurvature += Math.abs(angle2 - angle1);
    }
    
    return totalCurvature / (this.currentStroke.length - 2);
  }

  private calculateJitter(): number {
    if (this.currentStroke.length < 3) return 0;
    
    let totalJitter = 0;
    for (let i = 1; i < this.currentStroke.length - 1; i++) {
      const expected = {
        x: (this.currentStroke[i-1].x + this.currentStroke[i+1].x) / 2,
        y: (this.currentStroke[i-1].y + this.currentStroke[i+1].y) / 2
      };
      const actual = this.currentStroke[i];
      const deviation = Math.sqrt(
        Math.pow(expected.x - actual.x, 2) + 
        Math.pow(expected.y - actual.y, 2)
      );
      totalJitter += deviation;
    }
    
    return totalJitter / (this.currentStroke.length - 2);
  }

  private calculateDirectionChanges(): number {
    if (this.currentStroke.length < 3) return 0;
    
    let changes = 0;
    let prevDirection = Math.atan2(
      this.currentStroke[1].y - this.currentStroke[0].y,
      this.currentStroke[1].x - this.currentStroke[0].x
    );
    
    for (let i = 2; i < this.currentStroke.length; i++) {
      const currDirection = Math.atan2(
        this.currentStroke[i].y - this.currentStroke[i-1].y,
        this.currentStroke[i].x - this.currentStroke[i-1].x
      );
      
      if (Math.abs(currDirection - prevDirection) > Math.PI / 4) {
        changes++;
      }
      prevDirection = currDirection;
    }
    
    return changes;
  }

  private calculateHesitations(): number {
    if (this.currentStroke.length < 2) return 0;
    
    let hesitations = 0;
    const speedThreshold = 0.1;
    
    for (let i = 1; i < this.currentStroke.length; i++) {
      const dt = this.currentStroke[i].timestamp - this.currentStroke[i-1].timestamp;
      const dx = this.currentStroke[i].x - this.currentStroke[i-1].x;
      const dy = this.currentStroke[i].y - this.currentStroke[i-1].y;
      const speed = Math.sqrt(dx*dx + dy*dy) / dt;
      
      if (speed < speedThreshold) {
        hesitations++;
      }
    }
    
    return hesitations;
  }

  private updateAverages(): void {
    const totalLength = this.metrics.strokeLengths.reduce((a, b) => a + b, 0);
    const totalDuration = this.metrics.strokeDurations.reduce((a, b) => a + b, 0);
    this.metrics.averageSpeed = totalLength / totalDuration;
  }

  private updateMetrics(): void {
    if (this.currentStroke.length >= 2) {
      const lastPoint = this.currentStroke[this.currentStroke.length - 1];
      const prevPoint = this.currentStroke[this.currentStroke.length - 2];
      
      const dt = lastPoint.timestamp - prevPoint.timestamp;
      const dx = lastPoint.x - prevPoint.x;
      const dy = lastPoint.y - prevPoint.y;
      const instantSpeed = Math.sqrt(dx*dx + dy*dy) / dt;
      
      this.metrics.speedVariations.push(instantSpeed);
    }
  }

  public setVerificationResult(success: boolean): void {
    this.metrics.verificationSuccess = success;
    // 검증 결과가 나왔을 때 최종 데이터 저장
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    try {
      const storageKey = `handwriting_behavior_${this.metrics.sessionId}`;
      localStorage.setItem(storageKey, JSON.stringify(this.metrics));
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
    link.download = `handwriting_behavior_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  public reset(): void {
    this.currentStroke = [];
    this.metrics = {
      strokeCount: 0,
      strokeLengths: [],
      strokeDurations: [],
      strokeIntervals: [],
      strokeCurvatures: [],
      strokeJitters: [],
      directionChanges: [],
      hesitationPoints: [],
      totalTime: 0,
      averageSpeed: 0,
      speedVariations: [],
      sessionId: `handwriting_${Date.now()}`,
      startTime: Date.now(),
      endTime: 0,
      verificationSuccess: false
    };
    this.lastStrokeEnd = 0;
    this.isTracking = true;
  }
}

export default HandwritingBehaviorCollector; 