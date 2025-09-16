/**
 * 캡차별 행동 데이터를 MongoDB에 전송하는 유틸리티 함수
 */

export interface BehaviorDataRequest {
  behavior_data: any;
  pageEvents: {
    enterTime: number;
    exitTime: number;
    totalTime: number;
  };
  captcha_type?: string; // image/abstract 캡차에서만 사용
}

export async function sendBehaviorDataToMongo(
  collectionName: string, 
  behaviorData: BehaviorDataRequest,
  apiKey?: string,
  apiEndpoint?: string
): Promise<void> {
  try {
    const apiBaseUrl = apiEndpoint || process.env.REACT_APP_API_BASE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://api.realcatcha.com' 
        : 'http://localhost:8000');
    
    // 컬렉션명에 따른 엔드포인트 매핑
    let endpoint: string;
    if (collectionName === "behavior_data_image") {
      endpoint = "/api/behavior-data/image";
    } else if (collectionName === "behavior_data_writing") {
      endpoint = "/api/behavior-data/writing";
    } else {
      throw new Error(`Unknown collection: ${collectionName}`);
    }
    
    console.log(`📤 [${collectionName}] 데이터 전송 시작:`, {
      endpoint,
      captcha_type: behaviorData.captcha_type,
      behavior_data_keys: Object.keys(behaviorData.behavior_data || {})
    });
    
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      },
      body: JSON.stringify(behaviorData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ [${collectionName}] 데이터 저장 완료:`, result);
  } catch (error) {
    console.error(`❌ [${collectionName}] 데이터 저장 실패:`, error);
    // 에러가 발생해도 캡차 진행에는 영향을 주지 않음
  }
}

