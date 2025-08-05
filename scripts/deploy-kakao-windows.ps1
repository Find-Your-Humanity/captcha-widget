# Real Captcha Widget 카카오클라우드 CDN 배포 스크립트 (Windows PowerShell)
# 사용법: .\scripts\deploy-kakao-windows.ps1 -Environment "production"

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

# 색상 출력 함수
function Write-ColorText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Write-Success { param([string]$Text) Write-ColorText $Text "Green" }
function Write-Error { param([string]$Text) Write-ColorText $Text "Red" }
function Write-Warning { param([string]$Text) Write-ColorText $Text "Yellow" }
function Write-Info { param([string]$Text) Write-ColorText $Text "Cyan" }

# 스크립트 시작
Write-ColorText "🌟 Real Captcha Widget 카카오클라우드 CDN 배포 시작..." "Magenta"
Write-Info "- 환경: $Environment"
Write-Info "- 빌드 건너뛰기: $SkipBuild"
Write-Info "- 강제 모드: $Force"
Write-Host ""

# 기본 설정
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

try {
    # 1. 환경 변수 확인
    Write-Info "🔍 1. 카카오클라우드 환경 변수 확인..."
    
    if (-not (Test-Path ".env")) {
        if (Test-Path "env-template-kakao.txt") {
            Write-Warning ".env 파일이 없습니다. env-template-kakao.txt를 복사합니다."
            Copy-Item "env-template-kakao.txt" ".env"
            Write-Warning ".env 파일을 편집하여 카카오클라우드 인증 정보를 입력하세요."
            
            if (-not $Force) {
                Write-Host ""
                Write-Warning "필수 설정 항목:"
                Write-Warning "  - KAKAO_ACCESS_KEY: 카카오클라우드 액세스 키"
                Write-Warning "  - KAKAO_SECRET_KEY: 카카오클라우드 시크릿 키"
                Write-Warning "  - KAKAO_CDN_BUCKET: Object Storage 버킷 이름"
                Write-Warning "  - KAKAO_CDN_DOMAIN: CDN 도메인"
                Write-Host ""
                
                $confirm = Read-Host "설정을 완료하고 계속하시겠습니까? (y/N)"
                if ($confirm -ne "y" -and $confirm -ne "Y") {
                    Write-Warning "배포가 취소되었습니다."
                    exit 1
                }
            }
        } else {
            Write-Error ".env 파일과 env-template-kakao.txt가 모두 없습니다."
            throw ".env 파일을 생성해주세요."
        }
    }
    
    # .env 파일 로드
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    
    # 카카오클라우드 설정 확인
    $requiredVars = @("KAKAO_ACCESS_KEY", "KAKAO_SECRET_KEY", "KAKAO_CDN_BUCKET")
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        $value = [Environment]::GetEnvironmentVariable($var, "Process")
        if (-not $value -or $value -eq "your_kakao_access_key" -or $value -eq "your_kakao_secret_key") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Error "카카오클라우드 설정이 누락되었습니다: $($missingVars -join ', ')"
        Write-Error ".env 파일에서 실제 값으로 수정해주세요."
        throw "카카오클라우드 인증 정보를 확인해주세요."
    }
    
    Write-Success "✓ 카카오클라우드 환경 변수 로드 완료"
    
    $bucket = [Environment]::GetEnvironmentVariable("KAKAO_CDN_BUCKET", "Process")
    $domain = [Environment]::GetEnvironmentVariable("KAKAO_CDN_DOMAIN", "Process")
    Write-Info "  - 버킷: $bucket"
    Write-Info "  - 도메인: $domain"
    
    # 2. Node.js 및 npm 확인
    Write-Info "🔍 2. Node.js 환경 확인..."
    
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Success "✓ Node.js: $nodeVersion"
        Write-Success "✓ npm: $npmVersion"
    } catch {
        Write-Error "Node.js가 설치되지 않았습니다."
        throw "Node.js를 설치해주세요: https://nodejs.org"
    }
    
    # 3. 의존성 설치
    Write-Info "🔍 3. 의존성 설치..."
    
    if (-not (Test-Path "node_modules")) {
        Write-Info "npm install 실행 중..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install 실패"
        }
        Write-Success "✓ 의존성 설치 완료"
    } else {
        Write-Success "✓ 의존성 이미 설치됨"
    }
    
    # 4. CDN 빌드
    if (-not $SkipBuild) {
        Write-Info "🔍 4. CDN 빌드 실행..."
        
        npm run build:cdn
        if ($LASTEXITCODE -ne 0) {
            throw "CDN 빌드 실패"
        }
        
        # 빌드 결과 확인
        if (Test-Path "dist-cdn\realcaptcha-widget.min.js") {
            $fileSize = (Get-Item "dist-cdn\realcaptcha-widget.min.js").Length
            Write-Success "✓ CDN 빌드 완료 ($('{0:N0}' -f $fileSize) bytes)"
            
            # 빌드 파일 목록 표시
            Write-Info "빌드 된 파일 목록:"
            Get-ChildItem "dist-cdn" | ForEach-Object {
                $size = if ($_.PSIsContainer) { "<DIR>" } else { "{0:N0} bytes" -f $_.Length }
                Write-Info "  - $($_.Name) ($size)"
            }
        } else {
            throw "CDN 빌드 실패: 출력 파일이 없습니다."
        }
    } else {
        Write-Warning "🚀 빌드 건너뛰기 (--SkipBuild)"
    }
    
    # 5. 카카오클라우드 CDN 배포
    Write-Info "🔍 5. 카카오클라우드 CDN 배포 실행..."
    
    npm run deploy:kakao
    if ($LASTEXITCODE -ne 0) {
        throw "카카오클라우드 CDN 배포 실패"
    }
    
    Write-Success "✓ 카카오클라우드 CDN 배포 완료!"
    
    # 6. 배포 결과 표시
    Write-Info "🔍 6. 배포 결과 확인..."
    
    if (Test-Path "dist-cdn\deploy-log.json") {
        $deployLog = Get-Content "dist-cdn\deploy-log.json" | ConvertFrom-Json
        
        Write-Success ""
        Write-Success "🌟 카카오클라우드 CDN 배포 성공!"
        Write-Success "- 버전: $($deployLog.version)"
        Write-Success "- 시간: $($deployLog.timestamp)"
        Write-Success "- 제공자: $($deployLog.provider)"
        Write-Success "- 리전: $($deployLog.region)"
        Write-Success "- 버킷: $($deployLog.bucket)"
        Write-Success ""
        Write-Success "🌐 카카오클라우드 CDN URLs:"
        
        $deployLog.urls.PSObject.Properties | ForEach-Object {
            Write-Success "  $($_.Name): $($_.Value)"
        }
        
        Write-Success ""
        Write-Success "📝 사용 예시:"
        Write-ColorText "<script src=`"$($deployLog.urls.widget_latest)`"></script>" "Gray"
        Write-Success ""
        Write-Success "🛠 카카오클라우드 콘솔:"
        Write-ColorText "https://console.kakaocloud.com/storage/object-storage" "Gray"
        Write-ColorText "https://console.kakaocloud.com/cdn" "Gray"
    }
    
    # 7. CDN 연결 테스트
    Write-Info "🔍 7. CDN 연결 테스트..."
    
    try {
        $testUrl = "https://$domain/latest/realcaptcha-widget.min.js"
        Write-Info "테스트 URL: $testUrl"
        
        $response = Invoke-WebRequest -Uri $testUrl -Method Head -TimeoutSec 10 -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 200) {
            Write-Success "✓ 카카오클라우드 CDN 연결 성공 ($($response.StatusCode))"
            
            $contentLength = $response.Headers["Content-Length"]
            if ($contentLength) {
                Write-Success "✓ 파일 크기: $('{0:N0}' -f [int]$contentLength) bytes"
            }
            
            $cacheControl = $response.Headers["Cache-Control"]
            if ($cacheControl) {
                Write-Success "✓ 캐시 설정: $cacheControl"
            }
        } else {
            Write-Warning "CDN 연결 상태: $($response.StatusCode)"
            Write-Warning "카카오클라우드 CDN 전파에 시간이 걸릴 수 있습니다."
        }
    } catch {
        Write-Warning "CDN 연결 테스트 실패: $($_.Exception.Message)"
        Write-Warning "배포는 성공했지만 CDN 전파에 5-10분 정도 시간이 걸릴 수 있습니다."
    }
    
    Write-Success ""
    Write-Success "🎉 카카오클라우드 CDN 배포가 모두 완료되었습니다!"
    Write-Success ""
    Write-Info "📚 다음 단계:"
    Write-Info "1. 카카오클라우드 콘솔에서 CDN 도메인 설정 확인"
    Write-Info "2. 도메인 DNS 설정 (CNAME 레코드)"
    Write-Info "3. SSL 인증서 설정"
    Write-Info "4. 예제 페이지에서 정상 작동 확인"
    Write-Success ""
    
} catch {
    Write-Error ""
    Write-Error "❌ 카카오클라우드 CDN 배포 중 오류 발생:"
    Write-Error $_.Exception.Message
    Write-Error ""
    
    # 로그 파일 생성
    $errorLog = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        environment = $Environment
        provider = "kakao"
        error = $_.Exception.Message
        stackTrace = $_.ScriptStackTrace
    } | ConvertTo-Json
    
    $errorLog | Out-File "deploy-error-kakao.log" -Encoding UTF8
    Write-Error "오류 로그가 deploy-error-kakao.log에 저장되었습니다."
    
    Write-Error "📞 도움말:"
    Write-Error "1. 카카오클라우드 콘솔에서 API 키 확인"
    Write-Error "2. Object Storage 버킷 생성 확인"
    Write-Error "3. CDN 서비스 활성화 확인"
    Write-Error ""
    
    exit 1
}

# 정리
Set-Location $PSScriptRoot