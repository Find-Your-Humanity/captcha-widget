# Real Captcha Widget

Real Captcha는 전통적인 캡차 시스템을 대체하는 혁신적인 솔루션입니다. 사용자의 자연스러운 행동 패턴을 분석하여 봇과 인간을 구별하는 인텔리전트 캡차 위젯입니다.

## 주요 기능

### 다양한 캡차 유형
- **기본 캡차**: "I'm not a robot" 클릭 기반 캡차
- **이미지 캡차**: 이미지 선택 기반 인증
- **필기 캡차**: 손글씨 입력 기반 인증  
- **추상 캡차**: 패턴 인식 기반 인증

### 지능형 행동 분석
- **마우스 움직임 패턴 분석**: 자연스러운 인간의 마우스 이동 궤적 감지
- **클릭 행동 분석**: 클릭 압력, 지속 시간, 패턴 분석
- **타이밍 분석**: 사용자 반응 시간 및 행동 리듬 분석
- **필기 행동 분석**: 손글씨 입력 시 압력, 속도, 리듬 패턴 분석

### 실시간 검증
- 사용자 행동 데이터를 실시간으로 수집 및 분석
- ML 기반 봇 탐지 알고리즘 적용
- 즉각적인 인증 결과 제공

## 🏗️ 프로젝트 구조

```
src/
├── components/
│   ├── Captcha.tsx                    # 메인 캡차 컴포넌트
│   ├── ImageCaptcha.tsx               # 이미지 선택 캡차
│   ├── HandwritingCaptcha.tsx         # 필기 입력 캡차
│   ├── AbstractCaptcha.tsx            # 추상 패턴 캡차
│   ├── Collector.ts                   # 기본 행동 데이터 수집기
│   ├── ImageBehaviorCollector.ts      # 이미지 캡차 행동 분석
│   └── HandwritingBehaviorCollector.ts # 필기 캡차 행동 분석
├── types/                             # TypeScript 타입 정의
├── utils/                             # 유틸리티 함수
└── App.tsx                           # 메인 애플리케이션
```

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm start
```

브라우저에서 `http://localhost:3000`으로 접속하여 확인할 수 있습니다.

### CDN 배포용 빌드
```bash
# CDN 전용 빌드 (UMD 번들 생성)
npm run build:cdn

# 카카오클라우드 CDN에 배포 (기본)
npm run deploy:kakao

# AWS CDN에 배포 (대안)
npm run deploy:cdn
```

## 🚀 CDN 배포 설정

### 카카오클라우드 CDN 배포 (기본)
```bash
# Windows PowerShell에서
.\scripts\deploy-kakao-windows.ps1 -Environment "production"

# 또는 단계별
npm install
npm run build:cdn
npm run deploy:kakao
```

### 환경 변수 설정
```bash
# 카카오클라우드 템플릿 사용
copy env-template-kakao.txt .env

# .env 파일 편집
notepad .env

# 주요 설정
CDN_PROVIDER=kakao
KAKAO_ACCESS_KEY=your_kakao_access_key
KAKAO_SECRET_KEY=your_kakao_secret_key
KAKAO_CDN_BUCKET=realcaptcha-cdn
KAKAO_CDN_DOMAIN=cdn.realcaptcha.com
```

### AWS S3 + CloudFront 배포 (대안)
```bash
# AWS 템플릿 사용
copy env-template.txt .env

# AWS CLI 설정 (선택사항)
aws configure

# CDN 빌드 및 배포
npm run deploy:cdn
```

## 📦 CDN 사용법

### 기본 사용 (HTML)
```html
<!-- React 및 ReactDOM CDN -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Real Captcha Widget -->
<script src="https://cdn.realcaptcha.com/latest/realcaptcha-widget.min.js"></script>

<div id="captcha-container"></div>
<script>
  renderRealCaptcha('captcha-container', {
    theme: 'light',
    size: 'normal'
  }, function(result) {
    console.log('캡차 결과:', result);
    if (result.success) {
      alert('캡차 인증 성공!');
    }
  });
</script>
```

### 고급 사용법
```javascript
// 캡차 인스턴스 생성
const captcha = new RealCaptcha({
  theme: 'dark',
  size: 'compact',
  language: 'ko',
  apiEndpoint: 'https://api.realcaptcha.com'
});

// 렌더링
const instance = captcha.render('captcha-container', function(result) {
  console.log('캡차 완료:', result);
});

// 리셋
instance.reset();

// 제거
instance.destroy();
```

### 3. 프로덕션 빌드
```bash
npm run build
```

## 🐳 Docker 배포

### Docker 이미지 빌드
```bash
docker build -t captcha-widget .
```

### Docker 컨테이너 실행
```bash
docker run -p 3000:3000 captcha-widget
```

Docker를 사용하면 Nginx를 통해 최적화된 프로덕션 환경에서 위젯을 서빙할 수 있습니다.

## 🔧 기술 스택

- **Frontend**: React 18, TypeScript
- **스타일링**: CSS3 (애니메이션 및 반응형 디자인)
- **빌드 도구**: React Scripts, Webpack
- **서버**: Nginx (프로덕션 환경)
- **컨테이너**: Docker
- **행동 분석**: 커스텀 JavaScript 라이브러리

## 📊 행동 데이터 수집

위젯은 다음과 같은 사용자 행동 데이터를 수집합니다:

- **마우스 데이터**: 위치, 이동 속도, 가속도, 클릭 패턴
- **타이밍 데이터**: 응답 시간, 호버 시간, 클릭 지속 시간
- **터치 데이터**: 모바일 터치 압력, 제스처 패턴 (모바일 환경)
- **필기 데이터**: 스트로크 속도, 압력, 리듬 패턴 (필기 캡차)

수집된 데이터는 개인정보를 식별할 수 없는 익명화된 행동 패턴으로만 사용됩니다.

## 🔒 보안 및 개인정보 보호

- 개인 식별 가능한 정보는 수집하지 않습니다
- 모든 행동 데이터는 익명화되어 처리됩니다
- GDPR 및 개인정보보호법 준수
- 클라이언트 사이드에서만 동작하는 경량 솔루션


## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 [이슈 트래커](https://github.com/Find-Your-Humanity/captcha/issues)를 통해 문의해주세요. 