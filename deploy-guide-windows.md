# 💻 Windows CDN 배포 가이드

이 가이드는 Windows 환경에서 Real Captcha Widget을 CDN에 배포하는 방법을 설명합니다.

## 📊 INFRA-305 작업 완료 보고

### ✅ 완료된 작업
- CDN 서비스 선택 및 설정 (카카오클라우드 CDN + Object Storage)
- 캡차 위젯 빌드 최적화 및 CDN 배포 스크립트 작성
- CDN URL 설정 및 배포 파이프라인 구성
- 캐싱 전략 및 버전 관리 시스템 구축
- 성능 모니터링 및 CDN 최적화 설정
- Windows PowerShell 자동 배포 스크립트

### 🎉 최종 결과
- **CDN URL**: `https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com/latest/realcaptcha-widget.min.js`
- **버전 관리**: `v1.0.0` 형태의 고정 버전 지원
- **전역 배포**: 카카오클라우드 글로벌 CDN (한국 최적화)
- **자동 배포**: GitHub Actions + PowerShell CI/CD 파이프라인
- **백업 CDN**: AWS CloudFront 대안 지원

---

## 🛠 사전 준비

### 1. 필수 소프트웨어
- **Node.js** 18 이상: [nodejs.org](https://nodejs.org) 에서 다운로드
- **PowerShell** 5.1 이상 (윈도우 기본 설치)
- **AWS CLI** (선택사항): [AWS CLI 설치 가이드](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### 2. 환경 변수 설정

#### PowerShell에서 환경 설정
```powershell
# 1. 프로젝트 폴더로 이동
cd "D:\workspace\realcatcha\frontend\captcha-widget"

# 2. 환경 변수 템플릿 복사
copy env-template.txt .env

# 3. 환경 변수 파일 편집
notepad .env
# 또는
code .env
```

#### .env 파일 예시 (카카오클라우드)
```bash
# CDN 제공자
CDN_PROVIDER=kakao

# 카카오클라우드 인증
KAKAO_ACCESS_KEY=KAIA1234567890ABCDEF
KAKAO_SECRET_KEY=your-kakao-secret-key

# 리전 및 버킷
KAKAO_REGION=kr-central-1
KAKAO_CDN_BUCKET=realcaptcha-cdn

# CDN 엔드포인트
KAKAO_STORAGE_ENDPOINT=https://objectstorage.kr-central-1.kakaoi.io
KAKAO_CDN_ENDPOINT=https://realcaptcha-cdn.kr-central-1.kakaoi.io
KAKAO_CDN_DOMAIN=cdn.realcaptcha.com

# 빌드 설정
REACT_APP_API_ENDPOINT=https://api.realcaptcha.com
REACT_APP_VERSION=1.0.0
```

## 🚀 자동 배포 (추천)

### 카카오클라우드 CDN 배포
```powershell
# 기본 배포
.\scripts\deploy-kakao-windows.ps1

# Production 배포
.\scripts\deploy-kakao-windows.ps1 -Environment "production"

# 빌드 건너뛰고 배포만
.\scripts\deploy-kakao-windows.ps1 -SkipBuild

# 강제 배포 (확인 없이)
.\scripts\deploy-kakao-windows.ps1 -Force
```

### AWS CDN 배포 (대안)
```powershell
# AWS 배포
.\scripts\deploy-windows.ps1 -Environment "production"
```

### 스크립트 주요 기능
- ✅ 환경 변수 자동 로드
- ✅ Node.js 및 npm 환경 확인
- ✅ 의존성 자동 설치
- ✅ CDN 빌드 및 최적화
- ✅ AWS/카카오클라우드 CDN 배포
- ✅ 배포 결과 자동 테스트
- ✅ 오류 로그 자동 생성

## 🔧 수동 배포

### 1. 단계별 배포
```powershell
# 1. 의존성 설치
npm install

# 2. CDN 빌드
npm run build:cdn

# 3. 빌드 결과 확인
ls dist-cdn\

# 4. CDN 배포
npm run deploy:cdn
```

### 2. 빌드 결과 확인
```powershell
# 빌드 되는 파일들
Get-ChildItem dist-cdn\

# 주요 파일 크기 확인
(Get-Item "dist-cdn\realcaptcha-widget.min.js").Length
(Get-Item "dist-cdn\metadata.json").Length
```

### 3. 배포 결과 확인
```powershell
# 배포 로그 확인
cat dist-cdn\deploy-log.json | ConvertFrom-Json

# CDN URL 테스트
Invoke-WebRequest -Uri "https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com/latest/realcaptcha-widget.min.js" -Method Head
```

## 📊 성능 모니터링

### 로컬 모니터링 실행
```powershell
# 모니터링 스크립트 실행
node monitoring\performance-monitor.js

# 또는 브라우저에서 examples\integration-examples.html 열기
start examples\integration-examples.html
```

### 모니터링 메트릭
- **로드 시간**: < 500ms 목표
- **캐시 적중률**: > 95% 목표
- **가용성**: > 99.9% 목표

## 🔗 CDN 사용법

### 기본 HTML 사용
```html
<!DOCTYPE html>
<html>
<head>
    <title>Real Captcha 예제</title>
</head>
<body>
    <!-- React 의존성 -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- Real Captcha Widget -->
    <script src="https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com/latest/realcaptcha-widget.min.js"></script>
    
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

### WordPress 플러그인
```php
// functions.php
function realcaptcha_enqueue_scripts() {
    wp_enqueue_script('realcaptcha', 
        'https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com/latest/realcaptcha-widget.min.js', 
        array('react', 'react-dom'), '1.0.0', true);
}
add_action('wp_enqueue_scripts', 'realcaptcha_enqueue_scripts');

// 사용법: [realcaptcha theme="light" size="normal"]
```

## 🚨 문제 해결

### 일반적인 문제

#### 1. PowerShell 실행 정책 오류
```powershell
# 현재 정책 확인
Get-ExecutionPolicy

# 정책 변경 (관리자 권한 필요)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 또는 일회성 허용
PowerShell -ExecutionPolicy Bypass -File .\scripts\deploy-windows.ps1
```

#### 2. Node.js 경로 문제
```powershell
# Node.js 설치 위치 확인
where node
where npm

# PATH 환경변수에 Node.js 추가
$env:PATH += ";C:\Program Files\nodejs"
```

#### 3. .env 파일 인코딩 문제
```powershell
# UTF-8 인코딩으로 저장
Get-Content .env | Out-File .env -Encoding UTF8
```

#### 4. AWS 인증 오류
```powershell
# AWS CLI 설정 확인
aws configure list

# 인증 정보 확인
aws sts get-caller-identity

# 버킷 접근 권한 확인
aws s3 ls s3://realcaptcha-cdn/
```

#### 5. 캐시 문제
```powershell
# npm 캐시 정리
npm cache clean --force

# node_modules 재설치
Remove-Item node_modules -Recurse -Force
npm install
```

### 로그 파일 확인
```powershell
# 배포 오류 로그
cat deploy-error.log

# npm 로그
cat npm-debug.log
```

## 📚 참고 자료

### 공식 문서
- [AWS S3 설명서](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront 설명서](https://docs.aws.amazon.com/cloudfront/)
- [Node.js Windows 설치](https://nodejs.org/en/download/)
- [PowerShell 실행 정책](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies)

### 프로젝트 문서
- [CDN 배포 가이드](docs/cdn-deployment.md)
- [GEMINI.md](../../GEMINI.md) - 인프라 계획
- [WBS](../../documents/wbs.md) - 작업 내역

### 예제 파일
- [integration-examples.html](examples/integration-examples.html) - 통합 예제
- [performance-monitor.js](monitoring/performance-monitor.js) - 성능 모니터링

---

## 🎉 축하합니다!

**INFRA-305 CDN 연동 설계 및 구성**이 성공적으로 완료되었습니다!

🌐 **CDN URL**: `https://cdn.realcaptcha.com/latest/realcaptcha-widget.min.js`  
📅 **완료일**: 2025.01.26  
👨‍💻 **담당자**: 전남규(인프라 보조 담당자)  

이제 전 세계 사용자들이 빠르고 안정적인 캡차 서비스를 이용할 수 있습니다! 🚀