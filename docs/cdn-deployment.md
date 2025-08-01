# CDN 배포 가이드

이 문서는 Real Captcha Widget을 CDN에 배포하는 방법을 설명합니다.

## 📋 INFRA-305: CDN 연동 설계 및 구성

### 목표
- 캡차 위젯 JS 파일을 CDN을 통해 빠르게 제공
- 전 세계 사용자에게 최적화된 로딩 속도 제공
- 버전 관리 및 캐싱 전략 구현

## 🔧 배포 방법

### 1. 환경 설정

#### Windows PowerShell에서 환경 변수 설정
```powershell
# .env 파일 생성
cp env-template.txt .env

# 환경 변수 편집 (VS Code 등 사용)
code .env
```

#### AWS 설정 예시
```bash
CDN_PROVIDER=aws
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
CDN_S3_BUCKET=realcaptcha-cdn
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
```

### 2. 빌드 및 배포

#### 로컬에서 배포
```bash
# 의존성 설치
npm install

# CDN 빌드
npm run build:cdn

# CDN 배포
npm run deploy:cdn
```

#### GitHub Actions를 통한 자동 배포
1. **Staging 배포**: `develop` 브랜치에 푸시
2. **Production 배포**: `v1.0.0` 형태의 태그 생성

```bash
# 프로덕션 릴리스
git tag v1.0.0
git push origin v1.0.0
```

## 🌐 CDN 구조

### 파일 구조
```
CDN Root/
├── latest/
│   └── realcaptcha-widget.min.js    # 최신 버전
├── v1.0.0/
│   ├── realcaptcha-widget.min.js    # 고정 버전
│   ├── example.html                 # 사용 예제
│   ├── metadata.json               # 메타데이터
│   └── hashes.json                 # 무결성 검사
└── v1.0.1/
    └── ...
```

### CDN URLs
- **최신 버전**: `https://cdn.realcaptcha.com/latest/realcaptcha-widget.min.js`
- **고정 버전**: `https://cdn.realcaptcha.com/v1.0.0/realcaptcha-widget.min.js`
- **사용 예제**: `https://cdn.realcaptcha.com/v1.0.0/example.html`

## 🎯 성능 최적화

### 캐싱 전략
- **JS 파일**: 1년 캐싱 (`max-age=31536000`)
- **HTML 파일**: 1시간 캐싱 (`max-age=3600`)
- **JSON 파일**: 1일 캐싱 (`max-age=86400`)

### 압축 및 최적화
- **Gzip/Brotli 압축** 적용
- **Terser**를 통한 JavaScript 최소화
- **React/ReactDOM 외부 의존성** 처리

### 무결성 검사
- SHA256, SHA512 해시 제공
- SRI (Subresource Integrity) 지원

```html
<script 
  src="https://cdn.realcaptcha.com/v1.0.0/realcaptcha-widget.min.js"
  integrity="sha256-ABC123..."
  crossorigin="anonymous">
</script>
```

## 📊 모니터링

### 성능 목표
- **로드 시간**: < 500ms
- **캐시 적중률**: > 95%
- **가용성**: > 99.9%

### 알림 설정
- 응답 시간 > 1초
- 오류율 > 5%
- 캐시 적중률 < 90%

## 🔒 보안

### CORS 설정
```json
{
  "allowed_origins": ["*"],
  "allowed_methods": ["GET", "HEAD"],
  "allowed_headers": ["Content-Type", "Authorization"]
}
```

### 보안 헤더
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 🚨 문제 해결

### 일반적인 문제

#### 1. 배포 실패
```bash
# 빌드 파일 확인
ls -la dist-cdn/

# 환경 변수 확인
echo $CDN_PROVIDER
echo $AWS_ACCESS_KEY_ID
```

#### 2. CDN 캐시 문제
```bash
# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/latest/*" "/v1.0.0/*"
```

#### 3. CORS 오류
- AWS S3 버킷의 CORS 정책 확인
- CloudFront의 Origin 설정 확인

### Windows 환경 특이사항

#### PowerShell 실행 정책
```powershell
# 실행 정책 확인
Get-ExecutionPolicy

# 필요시 정책 변경
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 경로 구분자 문제
- Node.js 스크립트에서 `path.join()` 사용
- 환경 변수에서 백슬래시(`\`) 이스케이프 주의

## 📚 참고 자료

- [AWS CloudFront 설명서](https://docs.aws.amazon.com/cloudfront/)
- [카카오클라우드 CDN 가이드](https://kakaocloud.com/docs/cdn)
- [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [CORS 정책](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**담당자**: 전남규(인프라 보조 담당자)  
**일정**: 2025.08.01 → 2025.08.04  
**우선순위**: 보통