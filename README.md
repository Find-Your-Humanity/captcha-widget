# Real Captcha Widget

Real Captcha는 전통적인 캡차 시스템을 대체하는 혁신적인 **적응형 AI 캡차 시스템**입니다. 사용자의 자연스러운 행동 패턴을 분석하여 봇과 인간을 구별하고, 신뢰도 점수에 따라 적절한 난이도의 캡차를 동적으로 제시합니다.

## 주요 기능

### 적응형 캡차 시스템 (Adaptive Captcha)
사용자의 행동 분석 결과에 따라 단계별로 캡차를 제시:
- **스코어 70+ (높은 신뢰도)**: 캡차 없이 즉시 통과
- **스코어 40-69 (중간 신뢰도)**: **이미지 캡차** - 특정 객체가 포함된 이미지 선택
- **스코어 20-39 (낮은 신뢰도)**: **필기 캡차** - 손글씨 입력 기반 인증  
- **스코어 20 미만 (매우 낮은 신뢰도)**: **추상 캡차** - AI 기반 감정/개념 판단

### 지능형 행동 분석 (AutoEncoder 기반)
- **마우스 움직임 패턴**: 속도, 가속도, 이동 궤적의 자연스러움 분석
- **클릭 행동 패턴**: 클릭 지속 시간, 압력, 리듬 패턴 분석
- **타이밍 패턴**: 반응 시간, 호버 시간, 인터랙션 간격 분석
- **필기 행동 패턴**: 스트로크 속도, 압력 변화, 리듬 일관성 분석

### 실시간 AI 분석
- AutoEncoder 기반 이상 탐지로 봇 행동 패턴 식별
- 행동 데이터를 실시간으로 특성 추출 및 분석
- 스코어 기반 동적 캡차 난이도 조절

### 추상 캡차 (Abstract Captcha) - 개발 진행 중
- **현재 단계**: 정적 이미지와 하드코딩된 감정 레이블 사용
- **목표 구현**: ImageNet 데이터셋 + AI 감정 분석 모델 연동
  - ImageNet에서 실시간 이미지 로딩
  - AI 모델이 각 이미지의 "warm feeling", "cold feeling" 등 추상적 개념 자동 판단
  - 동적 캡차 문제 생성 (예: "따뜻한 느낌의 이미지를 모두 선택하세요")

## 🏗️ 프로젝트 구조

```
src/
├── components/
│   ├── Captcha.tsx                    # 메인 캡차 컴포넌트 (환경변수 기반 API 연결)
│   ├── ImageCaptcha.tsx               # 이미지 선택 캡차
│   ├── HandwritingCaptcha.tsx         # 필기 입력 캡차
│   ├── AbstractCaptcha.tsx            # 추상 패턴 캡차
│   ├── Collector.ts                   # 기본 행동 데이터 수집기
│   ├── ImageBehaviorCollector.ts      # 이미지 캡차 행동 분석
│   └── HandwritingBehaviorCollector.ts # 필기 캡차 행동 분석
├── types/                             # TypeScript 타입 정의
├── utils/                             # 유틸리티 함수
└── App.tsx                           # 메인 애플리케이션

# 환경변수 파일들 (새로 추가됨)
├── .env.development                   # 개발환경 설정 (localhost)
├── .env.production                    # 프로덕션 설정 (도메인)
└── .env.local                         # 로컬 오버라이드 (선택사항)
```

## 🌐 **환경별 설정 (Environment Configuration)**

### **환경변수 파일**

#### `.env.development` (개발환경)
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

#### `.env.production` (프로덕션)
```env
REACT_APP_API_BASE_URL=https://api.realcatcha.com
```

#### `.env.local` (로컬 오버라이드, 선택사항)
```env
REACT_APP_API_BASE_URL=http://localhost:8001  # 커스텀 포트
```

### **환경별 동작 방식**
- **개발 실행** (`npm start`): `.env.development` 로드 → localhost API 호출
- **프로덕션 빌드** (`npm run build`): `.env.production` 로드 → 도메인 API 호출
- **로컬 테스트**: `.env.local`이 있으면 다른 설정보다 우선 적용

## 🚀 빠른 시작

### Frontend 실행

#### 1. 의존성 설치
```bash
npm install
```

#### 2. 개발 서버 실행
```bash
npm start
```

브라우저에서 `http://localhost:3000`으로 접속하여 캡차 위젯을 테스트할 수 있습니다.

#### 3. 프로덕션 빌드
```bash
npm run build
```

**빌드 후 확인:**
```bash
# 프로덕션 도메인 적용 확인
grep -r "api.realcatcha.com" build/

# 환경 설정 확인
echo "현재 환경: $NODE_ENV"
```

### **백엔드 서비스 연결**

> **중요**: 이 프론트엔드는 **별도의 백엔드 서비스들**과 연동됩니다.

#### **필요한 백엔드 서비스들:**

1. **캡차 API** (`backend/captcha-api`)
   - 메인 캡차 로직 처리
   - 엔드포인트: `/api/next-captcha`
   - 포트: `8000` (기본값)

2. **ML 서비스** (`backend/ml-service`)
   - AI 기반 행동 분석 및 봇 탐지
   - AutoEncoder 모델 추론
   - 신뢰도 스코어 계산

3. **게이트웨이 API** (`backend/gateway-api`)
   - API 라우팅 및 로드밸런싱
   - 인증 및 권한 관리
   - 요청 제한 및 보안

#### **백엔드 서비스 실행 방법:**

```bash
# 1. 캡차 API 실행
cd ../backend/captcha-api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python src/main.py

# 2. ML 서비스 실행  
cd ../backend/ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python src/behavior_analysis/train_autoEncoder.py  # 최초 모델 훈련
python src/api/main.py  # API 서버 실행

# 3. 게이트웨이 API 실행
cd ../backend/gateway-api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

## 🐳 Docker 배포

### Docker 이미지 빌드
```bash
docker build -t captcha-widget .
```

### Docker 컨테이너 실행
```bash
# 개발환경
docker run -p 3000:3000 -e NODE_ENV=development captcha-widget

# 프로덕션환경
docker run -p 3000:3000 -e NODE_ENV=production captcha-widget
```

Docker를 사용하면 Nginx를 통해 최적화된 프로덕션 환경에서 위젯을 서빙할 수 있습니다.

## 🔧 기술 스택

### Frontend
- **React 18 + TypeScript**: 컴포넌트 기반 UI 개발
- **CSS3**: 애니메이션 및 반응형 디자인
- **React Scripts**: 빌드 및 개발 환경
- **환경변수 관리**: dotenv 기반 설정 관리
- **Nginx**: 프로덕션 정적 파일 서빙

### **백엔드 연동** (별도 저장소)
- **FastAPI**: RESTful API 서버 (`backend/captcha-api`)
- **PyTorch**: AutoEncoder 모델 (`backend/ml-service`)  
- **Gateway API**: 통합 라우팅 (`backend/gateway-api`)
- **CORS**: 크로스 오리진 요청 처리

### AI/ML 모델 (backend/ml-service)
- **PyTorch**: AutoEncoder 기반 봇 탐지 모델
- **Scikit-learn**: 데이터 전처리 (MinMaxScaler)
- **Pandas + NumPy**: 행동 데이터 분석 및 특성 추출
- **Joblib**: 모델 직렬화/역직렬화

### 행동 분석 시스템
- **커스텀 JavaScript**: 실시간 마우스/터치 이벤트 수집
- **특성 추출**: 속도, 가속도, 클릭 패턴, 타이밍 분석
- **AutoEncoder**: 정상 행동 패턴 학습 및 이상 탐지

### 배포 & 인프라
- **Docker**: 컨테이너화된 배포
- **Kubernetes**: 오케스트레이션 (`deploy-manifests`)
- **환경변수**: 개발/프로덕션 자동 전환
- **로깅**: 행동 분석 로그 및 API 로그

## 📊 AI 기반 행동 분석 시스템

### 데이터 수집 및 특성 추출

위젯은 사용자의 상호작용을 실시간으로 분석하여 다음 특성들을 추출합니다:

#### 마우스 행동 특성
- **이동 패턴**: 속도 분포, 가속도 변화, 이동 궤적의 부드러움
- **클릭 패턴**: 클릭 간격, 더블클릭 빈도, 드래그 지속 시간
- **호버 행동**: 이미지별 호버 시간, 호버 패턴 분석

#### 타이밍 특성  
- **반응 시간**: 캡차 제시부터 첫 반응까지의 시간
- **완료 시간**: 전체 캡차 완료 소요 시간
- **페이지 상호작용**: 페이지 로드부터 이탈까지의 시간

#### 특성 정규화 및 분석
```javascript
// 프론트엔드에서 수집되는 행동 데이터 예시
const behaviorData = {
  mouse_movements: [...],  // 마우스 이동 궤적
  clicks: [...],          // 클릭 이벤트
  timing: {               // 타이밍 정보
    start_time: timestamp,
    end_time: timestamp,
    total_duration: ms
  }
};

// 백엔드 ML 서비스로 전송
fetch(`${apiBaseUrl}/api/next-captcha`, {
  method: 'POST',
  body: JSON.stringify({ behavior_data: behaviorData })
});
```

### AutoEncoder 기반 이상 탐지 (backend/ml-service)

1. **정상 행동 패턴 학습**: 인간 사용자의 행동 데이터로 AutoEncoder 훈련
2. **실시간 분석**: 새로운 행동 데이터의 재구성 오차 계산
3. **스코어링**: 재구성 오차가 클수록 봇일 가능성이 높음
4. **적응형 응답**: 스코어에 따라 다음 캡차 유형 결정

### 개인정보 보호
- 모든 데이터는 익명화된 행동 패턴으로만 처리
- 개인 식별 정보 수집 없음
- 로컬 분석 우선, 최소한의 서버 전송

## 🔧 **개발 및 디버깅**

### **API 연결 상태 확인**
```bash
# 개발 서버에서 API 연결 테스트
curl http://localhost:8000/api/next-captcha \
  -H "Content-Type: application/json" \
  -d '{"behavior_data": {"test": true}}'

# 프로덕션에서 API 연결 테스트  
curl https://api.realcatcha.com/api/next-captcha \
  -H "Content-Type: application/json" \
  -d '{"behavior_data": {"test": true}}'
```

### **환경변수 디버깅**
브라우저 개발자 도구 콘솔에서 현재 설정 확인:
```javascript
console.log('🌐 현재 환경:', process.env.NODE_ENV);
console.log('🔗 API URL:', process.env.REACT_APP_API_BASE_URL);
```

### **빌드 결과 확인**
```bash
# 빌드된 파일에서 API URL 확인
grep -r "api.realcatcha.com" build/
grep -r "localhost:8000" build/
```

## 🔒 보안 및 개인정보 보호

- 개인 식별 가능한 정보는 수집하지 않습니다
- 모든 행동 데이터는 익명화되어 처리됩니다
- GDPR 및 개인정보보호법 준수
- **환경변수 보안**: API 키나 민감한 정보는 서버사이드에서만 관리
- **CORS 정책**: 허용된 도메인에서만 API 접근 가능

## 🚀 **배포 가이드**

### **개발 → 프로덕션 전환**

1. **환경변수 확인**:
   ```bash
   # .env.production에 올바른 도메인 설정되어 있는지 확인
   cat .env.production
   ```

2. **프로덕션 빌드**:
   ```bash
   NODE_ENV=production npm run build
   ```

3. **백엔드 서비스 배포**: 
   - `backend/captcha-api`를 도메인에 배포
   - `backend/ml-service` API 서버 실행
   - `backend/gateway-api` 로드밸런서 구성

4. **CORS 설정 확인**:
   백엔드에서 프론트엔드 도메인 허용 설정

## 🔗 **관련 저장소**

- **📊 대시보드**: [`frontend/dashboard`](../dashboard/) - 관리자 패널
- **🌐 메인 웹사이트**: [`frontend/website`](../website/) - 랜딩 페이지
- **🔌 캡차 API**: [`backend/captcha-api`](../../backend/captcha-api/) - 메인 백엔드
- **🤖 ML 서비스**: [`backend/ml-service`](../../backend/ml-service/) - AI 모델
- **🌉 게이트웨이**: [`backend/gateway-api`](../../backend/gateway-api/) - API 게이트웨이
- **☸️ 배포**: [`deploy-manifests`](../../deploy-manifests/) - Kubernetes 매니페스트

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 [이슈 트래커](https://github.com/Find-Your-Humanity/captcha/issues)를 통해 문의해주세요.

---

**Real Captcha Widget v2.1.0**  
© 2025 Find Your Humanity. All rights reserved. 