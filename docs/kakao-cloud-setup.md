# 🌟 카카오클라우드 CDN 설정 가이드

이 가이드는 카카오클라우드에서 Real Captcha Widget CDN을 설정하는 방법을 설명합니다.

## 📋 개요

### 카카오클라우드 CDN 아키텍처
```
사용자 요청
    ↓
CDN Edge Server (전세계)
    ↓
Kakao Cloud Object Storage
    │
    ├── latest/realcaptcha-widget.min.js
    ├── v1.0.0/realcaptcha-widget.min.js
    └── v1.0.0/example.html
```

### 주요 특징
- **글로벌 CDN**: 전세계 Edge 서버
- **Object Storage**: S3 호환 API
- **자동 캐싱**: 고성능 캐싱 전략
- **한국 최적화**: 국내 사용자 대상

---

## 🛠 1단계: 카카오클라우드 계정 설정

### 1.1 계정 생성
1. **카카오클라우드 콘솔** 접속: [console.kakaocloud.com](https://console.kakaocloud.com)
2. **회원가입** 및 **신용카드 등록**
3. **프로젝트 생성**: "RealCaptcha CDN"

### 1.2 API 키 생성
```
콘솔 > IAM > API 키 관리
↓
새 API 키 생성
↓
권한 설정:
- Object Storage: 전체 권한
- CDN: 전체 권한
```

**주의**: Access Key와 Secret Key를 안전하게 보관하세요!

---

## 📦 2단계: Object Storage 설정

### 2.1 버킷 생성
1. **Object Storage 서비스** 이동
2. **버킷 생성** 클릭
3. 버킷 설정:
   - **버킷명**: `realcaptcha-cdn`
   - **리전**: `kr-central-1` (서울)
   - **액세스 제어**: `공개 읽기` 허용

### 2.2 CORS 설정
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 2.3 버킷 정책 설정
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::realcaptcha-cdn/*"
    }
  ]
}
```

---

## 🌐 3단계: CDN 서비스 설정

### 3.1 CDN 디스트리뷔션 생성
1. **CDN 서비스** 이동
2. **디스트리뷔션 생성** 클릭
3. 기본 설정:
   - **원본 서버**: Object Storage 버킷
   - **도메인**: `1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com`
   - **프로토콜**: HTTPS

### 3.2 캐싱 설정
```
캐싱 동작 설정:
├── *.js 파일: 1년 (31536000초)
├── *.html 파일: 1시간 (3600초)
└── *.json 파일: 1일 (86400초)
```

### 3.3 압축 설정
- **Gzip 압축**: 활성화
- **대상 파일**: `*.js`, `*.css`, `*.html`, `*.json`

---

## 🔑 4단계: 도메인 및 SSL 설정

### 4.1 도메인 등록
1. **도메인 추가**: `1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com`
2. **DNS 설정**:
```
1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com. CNAME your-distribution.kr-central-1.kakaoi.io.
```

### 4.2 SSL 인증서
- **Let's Encrypt**: 자동 발급 및 갱신
- **사용자 인증서**: 직접 업로드 가능

---

## 💻 5단계: Windows 배포 설정

### 5.1 환경 변수 설정
```powershell
# 프로젝트 폴더로 이동
cd "D:\workspace\realcatcha\frontend\captcha-widget"

# 카카오클라우드 템플릿 복사
copy env-template-kakao.txt .env

# 환경 변수 편집
notepad .env
```

### 5.2 .env 파일 예시
```bash
# CDN 제공자
CDN_PROVIDER=kakao

# 카카오클라우드 인증
KAKAO_ACCESS_KEY=KAIA1234567890ABCDEF
KAKAO_SECRET_KEY=your-secret-key-here

# 리전 및 버킷
KAKAO_REGION=kr-central-2
KAKAO_CDN_BUCKET=realcaptcha-cdn

# 엔드포인트
KAKAO_STORAGE_ENDPOINT=https://objectstorage.kr-central-1.kakaoi.io
KAKAO_CDN_ENDPOINT=https://realcaptcha-cdn.kr-central-1.kakaoi.io
KAKAO_CDN_DOMAIN=cdn.realcaptcha.com

# 빌드 설정
REACT_APP_API_ENDPOINT=https://api.realcaptcha.com
REACT_APP_VERSION=1.0.0
```

### 5.3 배포 실행
```powershell
# 단일 명령어로 배포
.\scripts\deploy-kakao-windows.ps1 -Environment "production"

# 또는 단계별 실행
npm install
npm run build:cdn
npm run deploy:kakao
```

---

## 📊 6단계: 성능 모니터링

### 6.1 성능 지표
- **로드 시간**: < 300ms (한국 내)
- **캐시 적중률**: > 95%
- **가용성**: > 99.9%
- **대역폭**: 무제한 (트래픽 기반 과금)

### 6.2 모니터링 대시보드
```
카카오클라우드 콘솔 > CDN > 모니터링
↓
- 요청 수 및 대역폭 사용량
- 캐시 적중률
- 응답 시간
- 오류율
```

---

## 🔗 7단계: 사용법b

### 7.1 기본 HTML 사용
```html
<!DOCTYPE html>
<html>
<head>
    <title>Real Captcha with Kakao Cloud CDN</title>
</head>
<body>
    <!-- React 의존성 -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- 카카오클라우드 CDN에서 로드 -->
    <script src="https://cdn.realcaptcha.com/latest/realcaptcha-widget.min.js"></script>
    
    <div id="captcha-container"></div>
    
    <script>
        renderRealCaptcha('captcha-container', {
            theme: 'light',
            size: 'normal'
        }, function(result) {
            if (result.success) {
                console.log('캐트차 성공!', result.token);
                // 서버로 토큰 전송
            }
        });
    </script>
</body>
</html>
```

### 7.2 버전 관리
```javascript
// 최신 버전 (자동 업데이트)
https://cdn.realcaptcha.com/latest/realcaptcha-widget.min.js

// 고정 버전 (안정성 중시)
https://cdn.realcaptcha.com/v1.0.0/realcaptcha-widget.min.js

// 다음 버전 예시
https://cdn.realcaptcha.com/v1.1.0/realcaptcha-widget.min.js
```

---

## 🚨 문제 해결

### 일반적인 문제

#### 1. API 키 인증 오류
```
오류: 403 Forbidden
해결:
1. 카카오클라우드 콘솔에서 API 키 확인
2. Object Storage 및 CDN 권한 확인
3. 프로젝트에 API 키가 연결되어 있는지 확인
```

#### 2. CORS 오류
```
오류: Access to fetch at 'https://cdn.realcaptcha.com' from origin 'https://example.com' has been blocked by CORS policy
해결:
1. Object Storage CORS 설정 확인
2. CDN CORS 헤더 설정 확인
```

#### 3. CDN 캐시 문제
```
증상: 이전 버전의 파일이 로드됨
해결:
1. 카카오클라우드 콘솔에서 CDN 캐시 무효화
2. 브라우저 캐시 삭제 (Ctrl+F5)
3. URL에 버전 파라미터 추가 (?v=1.0.0)
```

#### 4. 업로드 실패
```
오류: Upload failed with status 500
해결:
1. 버킷 이름 및 권한 확인
2. 파일 크기 제한 확인 (100MB 제한)
3. 네트워크 연결 상태 확인
```

### Windows 특이 문제

#### PowerShell 실행 정책
```powershell
# 현재 정책 확인
Get-ExecutionPolicy

# 정책 변경
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 한글 인코딩 문제
```powershell
# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 📚 참고 자료

### 공식 문서
- [카카오클라우드 Object Storage](https://docs.kakaocloud.com/storage/object-storage)
- [카카오클라우드 CDN](https://docs.kakaocloud.com/cdn)
- [카카오클라우드 API 가이드](https://docs.kakaocloud.com/api)

### 요금 정보
- **Object Storage**: 저장 용량 + API 요청 기반
- **CDN**: 데이터 전송량 기반
- **무료 혈량**: 월 1GB 데이터 전송

### 지원
- **고객지원**: 1588-2999
- **개발자 커뮤니티**: [github.com/kakaocloud](https://github.com/kakaocloud)
- **상태 페이지**: [status.kakaocloud.com](https://status.kakaocloud.com)

---

## 🎉 마무리

카카오클라우드 CDN 설정이 완료되었습니다!

### 최종 결과
- ✅ **CDN URL**: `https://cdn.realcaptcha.com/latest/realcaptcha-widget.min.js`
- ✅ **한국 내 로드 시간**: < 300ms
- ✅ **글로벌 로드 시간**: < 500ms
- ✅ **자동 배포**: GitHub Actions + PowerShell
- ✅ **모니터링**: 실시간 성능 추적

**🇰🇷 한국 사용자들이 가장 빠른 속도로 캡차 서비스를 이용할 수 있습니다!** 🚀