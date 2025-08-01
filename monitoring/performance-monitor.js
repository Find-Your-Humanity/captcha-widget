/**
 * CDN 성능 모니터링 스크립트
 * 이 스크립트는 CDN에서 위젯 로딩 성능을 실시간 모니터링합니다.
 */

class CDNPerformanceMonitor {
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || 'https://api.realcaptcha.com';
    this.cdnUrls = options.cdnUrls || [
      'https://cdn.realcaptcha.com/latest/realcaptcha-widget.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/realcaptcha/latest/realcaptcha-widget.min.js'
    ];
    this.interval = options.interval || 60000; // 1분
    this.metrics = {
      loadTimes: [],
      errorCounts: {},
      cacheHitRates: [],
      availability: []
    };
  }

  async start() {
    console.log('📊 CDN 성능 모니터링 시작...');
    
    // 초기 측정
    await this.measurePerformance();
    
    // 주기적 측정
    this.monitoringInterval = setInterval(() => {
      this.measurePerformance();
    }, this.interval);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('📊 CDN 성능 모니터링 중지');
    }
  }

  async measurePerformance() {
    const timestamp = new Date().toISOString();
    console.log(`🔍 ${timestamp}: CDN 성능 측정 시작...`);

    for (const url of this.cdnUrls) {
      try {
        const result = await this.testCDNUrl(url);
        this.recordMetrics(url, result, timestamp);
      } catch (error) {
        this.recordError(url, error, timestamp);
      }
    }

    // 결과 보고
    await this.reportMetrics(timestamp);
  }

  async testCDNUrl(url) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      return {
        url,
        status: response.status,
        loadTime,
        cacheStatus: response.headers.get('x-cache') || 'unknown',
        contentLength: response.headers.get('content-length'),
        lastModified: response.headers.get('last-modified'),
        etag: response.headers.get('etag'),
        success: response.ok
      };
    } catch (error) {
      const endTime = performance.now();
      throw {
        url,
        error: error.message,
        loadTime: endTime - startTime,
        success: false
      };
    }
  }

  recordMetrics(url, result, timestamp) {
    // 로드 시간 기록
    this.metrics.loadTimes.push({
      url,
      timestamp,
      loadTime: result.loadTime,
      status: result.status
    });

    // 캐시 적중률 기록
    const isCacheHit = result.cacheStatus.toLowerCase().includes('hit');
    this.metrics.cacheHitRates.push({
      url,
      timestamp,
      cacheHit: isCacheHit,
      cacheStatus: result.cacheStatus
    });

    // 가용성 기록
    this.metrics.availability.push({
      url,
      timestamp,
      available: result.success,
      status: result.status
    });

    // 성능 임계값 확인
    this.checkThresholds(url, result);
  }

  recordError(url, error, timestamp) {
    if (!this.metrics.errorCounts[url]) {
      this.metrics.errorCounts[url] = [];
    }

    this.metrics.errorCounts[url].push({
      timestamp,
      error: error.error || error.message,
      loadTime: error.loadTime
    });

    console.error(`❌ CDN 오류 (${url}):`, error);
  }

  checkThresholds(url, result) {
    const alerts = [];

    // 로드 시간 임계값 (500ms)
    if (result.loadTime > 500) {
      alerts.push({
        type: 'slow_response',
        url,
        value: result.loadTime,
        threshold: 500,
        message: `느린 응답 시간: ${result.loadTime.toFixed(2)}ms`
      });
    }

    // HTTP 상태 코드 확인
    if (result.status >= 400) {
      alerts.push({
        type: 'http_error',
        url,
        value: result.status,
        message: `HTTP 오류: ${result.status}`
      });
    }

    // 알림 발송
    alerts.forEach(alert => this.sendAlert(alert));
  }

  async sendAlert(alert) {
    console.warn(`⚠️ CDN 알림:`, alert);
    
    try {
      // 알림 API로 전송 (예: Slack, Discord, Email 등)
      await fetch(`${this.apiEndpoint}/api/monitoring/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'cdn_performance',
          alert,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('알림 전송 실패:', error);
    }
  }

  async reportMetrics(timestamp) {
    const report = this.generateReport();
    
    console.log('📊 CDN 성능 리포트:', report);

    try {
      // 메트릭 API로 전송
      await fetch(`${this.apiEndpoint}/api/monitoring/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp,
          metrics: report,
          source: 'cdn_monitor'
        })
      });
    } catch (error) {
      console.error('메트릭 전송 실패:', error);
    }
  }

  generateReport() {
    const recent = Date.now() - 5 * 60 * 1000; // 최근 5분

    // 최근 로드 시간 통계
    const recentLoadTimes = this.metrics.loadTimes.filter(
      m => new Date(m.timestamp).getTime() > recent
    );
    
    const avgLoadTime = recentLoadTimes.length > 0
      ? recentLoadTimes.reduce((sum, m) => sum + m.loadTime, 0) / recentLoadTimes.length
      : 0;

    // 최근 캐시 적중률
    const recentCacheRates = this.metrics.cacheHitRates.filter(
      m => new Date(m.timestamp).getTime() > recent
    );
    
    const cacheHitRate = recentCacheRates.length > 0
      ? (recentCacheRates.filter(m => m.cacheHit).length / recentCacheRates.length) * 100
      : 0;

    // 최근 가용성
    const recentAvailability = this.metrics.availability.filter(
      m => new Date(m.timestamp).getTime() > recent
    );
    
    const availabilityRate = recentAvailability.length > 0
      ? (recentAvailability.filter(m => m.available).length / recentAvailability.length) * 100
      : 0;

    return {
      averageLoadTime: Math.round(avgLoadTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      availabilityRate: Math.round(availabilityRate * 100) / 100,
      totalRequests: recentLoadTimes.length,
      errorCount: Object.values(this.metrics.errorCounts)
        .flat()
        .filter(e => new Date(e.timestamp).getTime() > recent).length
    };
  }

  // 메트릭 초기화 (데이터 양 제한)
  cleanup() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24시간 전

    this.metrics.loadTimes = this.metrics.loadTimes.filter(
      m => new Date(m.timestamp).getTime() > cutoff
    );
    
    this.metrics.cacheHitRates = this.metrics.cacheHitRates.filter(
      m => new Date(m.timestamp).getTime() > cutoff
    );
    
    this.metrics.availability = this.metrics.availability.filter(
      m => new Date(m.timestamp).getTime() > cutoff
    );

    // 오류 로그도 정리
    Object.keys(this.metrics.errorCounts).forEach(url => {
      this.metrics.errorCounts[url] = this.metrics.errorCounts[url].filter(
        e => new Date(e.timestamp).getTime() > cutoff
      );
    });

    console.log('🧹 오래된 메트릭 데이터 정리 완료');
  }
}

// 사용 예시
if (typeof window !== 'undefined') {
  // 브라우저 환경에서 사용
  window.CDNPerformanceMonitor = CDNPerformanceMonitor;
  
  // 자동 시작 (옵션)
  if (window.AUTO_START_CDN_MONITOR) {
    const monitor = new CDNPerformanceMonitor();
    monitor.start();
    
    // 1시간마다 정리
    setInterval(() => monitor.cleanup(), 60 * 60 * 1000);
  }
} else {
  // Node.js 환경에서 사용
  module.exports = CDNPerformanceMonitor;
}