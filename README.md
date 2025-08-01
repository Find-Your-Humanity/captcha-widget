# Captcha UI

이미지에서 보여진 "I'm not a robot" 캡차 UI의 네 가지 상태를 구현한 React 컴포넌트입니다.

## 상태

1. **초기 상태**: 빈 체크박스와 "I'm not a robot" 텍스트
2. **로딩 상태**: 회전하는 스피너와 "LOADING..." 텍스트
3. **성공 상태**: 녹색 체크마크와 성공 표시
4. **오류 상태**: 빨간색 체크박스와 오류 메시지

## 기능

- 클릭 시 로딩 상태로 전환
- 2초 후 랜덤하게 성공 또는 실패
- 새로고침 버튼으로 초기 상태로 리셋
- 오류 상태에서 다시 클릭하면 초기 상태로 복귀

## 실행 방법

### 기본 개발 환경
```bash
# 의존성 설치
npm install

# 개발 서버 실행
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

## 기술 스택

- React 18
- TypeScript  
- CSS3 (애니메이션 포함)
- Webpack (CDN 번들링)
- AWS S3 + CloudFront (CDN)
- GitHub Actions (CI/CD) 