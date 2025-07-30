// 데이터 분석을 위한 유틸리티 함수들
const utils = {
  // 총 마우스 이동 거리
  getTotalMouseDistance(behaviorData) {
    return behaviorData.reduce((total, session) => {
      let sessionTotal = 0;
      const movements = session.mouseMovements;
      for (let i = 1; i < movements.length; i++) {
        const dx = movements[i].x - movements[i-1].x;
        const dy = movements[i].y - movements[i-1].y;
        sessionTotal += Math.sqrt(dx * dx + dy * dy);
      }
      return total + sessionTotal;
    }, 0);
  },

  // 클릭 분석
  getClickAnalysis(behaviorData) {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalClicks: session.mouseClicks.length,
      clickTypes: session.mouseClicks.reduce((acc, click) => {
        acc[click.type] = (acc[click.type] || 0) + 1;
        return acc;
      }, {}),
      clickPattern: session.mouseClicks.map(click => ({
        type: click.type,
        position: { x: click.x, y: click.y },
        timestamp: click.timestamp
      }))
    }));
  },

  // 스크롤 분석
  getScrollAnalysis(behaviorData) {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalScrolls: session.scrollEvents.length,
      maxScroll: Math.max(...session.scrollEvents.map(e => e.position)),
      scrollPattern: session.scrollEvents.map(e => ({
        position: e.position,
        timestamp: e.timestamp
      }))
    }));
  },

  // 세션 시간 분석
  getTimeAnalysis(behaviorData) {
    return behaviorData.map(session => ({
      sessionId: session.sessionId,
      totalTime: session.pageEvents.totalTime,
      startTime: session.pageEvents.enterTime,
      endTime: session.pageEvents.exitTime
    }));
  }
};

module.exports = utils; 