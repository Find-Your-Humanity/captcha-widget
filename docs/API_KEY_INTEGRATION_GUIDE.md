# RealCaptcha API 키 통합 가이드

## 개요

RealCaptcha는 API 키 기반의 보안 캡차 시스템입니다. 이 가이드는 개발자가 웹사이트에 RealCaptcha를 통합하는 방법을 설명합니다.

## 1. API 키 발급

### 1.1 대시보드에서 API 키 생성
1. [RealCaptcha 대시보드](https://dashboard.realcatcha.com)에 로그인
2. "API Keys" 섹션으로 이동
3. "Create New API Key" 클릭
4. API 키 정보 입력:
   - **Name**: API 키 이름 (예: "My Website")
   - **Description**: 설명 (선택사항)
   - **Allowed Domains**: 허용된 도메인 목록 (예: `["example.com", "*.example.com"]`)

### 1.2 API 키 정보
- **Site Key (공개 키)**: 클라이언트 측에서 사용
- **Secret Key (비밀 키)**: 서버 측에서 사용 (절대 노출 금지)

## 2. 클라이언트 측 통합

### 2.1 HTML에 스크립트 추가

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
    <!-- React 및 ReactDOM 로드 -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <!-- RealCaptcha SDK 로드 -->
    <script src="https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com/realcaptcha-widget.min.js"></script>
</head>
<body>
    <!-- 캡차 컨테이너 -->
    <div id="captcha-container"></div>
    
    <script>
        // 캡차 위젯 초기화
        const captcha = new RealCaptcha({
            siteKey: 'rc_live_your_site_key_here', // 발급받은 Site Key
            theme: 'light',
            size: 'normal',
            language: 'ko',
            apiEndpoint: 'https://api.realcatcha.com'
        });
        
        // 캡차 렌더링
        const captchaInstance = captcha.render('captcha-container', function(result) {
            if (result.success) {
                console.log('캡차 성공!');
                console.log('토큰:', result.captcha_token);
                
                // 서버로 토큰 전송
                verifyCaptchaOnServer(result.captcha_token);
            } else {
                console.log('캡차 실패:', result.error);
            }
        });
        
        // 서버에서 토큰 검증
        async function verifyCaptchaOnServer(captchaToken) {
            try {
                const response = await fetch('/api/verify-captcha', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        captcha_token: captchaToken,
                        // 기타 필요한 데이터
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    // 캡차 검증 성공
                    console.log('서버 검증 성공!');
                } else {
                    console.log('서버 검증 실패:', result.error);
                }
            } catch (error) {
                console.error('검증 요청 실패:', error);
            }
        }
    </script>
</body>
</html>
```

### 2.2 reCAPTCHA 호환 방식

```html
<script>
// reCAPTCHA와 유사한 방식으로 사용
window.REAL.init({
    container: 'captcha-container',
    siteKey: 'rc_live_your_site_key_here',
    callback: function(result) {
        if (result.success) {
            console.log('캡차 토큰:', result.captcha_token);
            // 서버로 토큰 전송
        }
    },
    'expired-callback': function() {
        console.log('캡차 만료');
    }
});
</script>
```

## 3. 서버 측 통합

### 3.1 토큰 검증 API 호출

```javascript
// Node.js 예시
const axios = require('axios');

async function verifyCaptcha(captchaToken, secretKey, siteKey) {
    try {
        const response = await axios.post('https://api.realcatcha.com/api/verify-captcha', {
            site_key: siteKey,
            secret_key: secretKey,
            captcha_token: captchaToken,
            response: 'captcha_completed' // 캡차 완료 응답
        });
        
        return response.data;
    } catch (error) {
        console.error('캡차 검증 실패:', error.response?.data || error.message);
        throw error;
    }
}

// 사용 예시
app.post('/api/verify-captcha', async (req, res) => {
    const { captcha_token } = req.body;
    
    try {
        const result = await verifyCaptcha(
            captcha_token,
            process.env.REALCAPTCHA_SECRET_KEY,
            process.env.REALCAPTCHA_SITE_KEY
        );
        
        if (result.success) {
            res.json({ success: true, message: '캡차 검증 성공' });
        } else {
            res.status(400).json({ success: false, message: '캡차 검증 실패' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류' });
    }
});
```

### 3.2 Python 예시

```python
import requests

def verify_captcha(captcha_token, secret_key, site_key):
    url = 'https://api.realcatcha.com/api/verify-captcha'
    data = {
        'site_key': site_key,
        'secret_key': secret_key,
        'captcha_token': captcha_token,
        'response': 'captcha_completed'
    }
    
    try:
        response = requests.post(url, json=data)
        return response.json()
    except requests.RequestException as e:
        print(f'캡차 검증 실패: {e}')
        raise

# Flask 예시
from flask import Flask, request, jsonify

@app.route('/api/verify-captcha', methods=['POST'])
def verify_captcha_endpoint():
    data = request.get_json()
    captcha_token = data.get('captcha_token')
    
    try:
        result = verify_captcha(
            captcha_token,
            os.getenv('REALCAPTCHA_SECRET_KEY'),
            os.getenv('REALCAPTCHA_SITE_KEY')
        )
        
        if result['success']:
            return jsonify({'success': True, 'message': '캡차 검증 성공'})
        else:
            return jsonify({'success': False, 'message': '캡차 검증 실패'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': '서버 오류'}), 500
```

## 4. 보안 기능

### 4.1 도메인 제한
API 키 생성 시 허용된 도메인을 설정하면, 해당 도메인에서만 캡차가 작동합니다.

```javascript
// API 키 생성 시 도메인 제한 설정
const allowedDomains = [
    'example.com',        // 정확한 도메인
    '*.example.com',      // 서브도메인 허용
    'localhost'           // 개발 환경
];
```

### 4.2 일회성 토큰
- 각 캡차 토큰은 한 번만 사용 가능
- 토큰 사용 후 자동으로 무효화
- 10분 후 자동 만료

### 4.3 사용량 제한
- 분당/일당/월당 요청 수 제한
- 요금제에 따른 사용량 관리

## 5. 오류 처리

### 5.1 일반적인 오류 코드
- `401`: API 키가 유효하지 않음
- `403`: 도메인이 허용되지 않음
- `429`: 사용량 제한 초과
- `400`: 토큰이 유효하지 않거나 이미 사용됨

### 5.2 오류 처리 예시

```javascript
captcha.render('captcha-container', function(result) {
    if (result.success) {
        // 성공 처리
        console.log('캡차 성공:', result.captcha_token);
    } else {
        // 오류 처리
        switch (result.error) {
            case 'invalid_api_key':
                console.error('API 키가 유효하지 않습니다.');
                break;
            case 'domain_not_allowed':
                console.error('현재 도메인에서 사용할 수 없습니다.');
                break;
            case 'rate_limit_exceeded':
                console.error('사용량 제한을 초과했습니다.');
                break;
            default:
                console.error('알 수 없는 오류:', result.error);
        }
    }
});
```

## 6. 테스트

### 6.1 테스트 모드
개발 환경에서 테스트하려면:

```javascript
// 테스트 모드 활성화
const captcha = new RealCaptcha({
    siteKey: 'rc_test_your_test_key',
    apiEndpoint: 'https://test-api.realcatcha.com'
});
```

### 6.2 로컬 개발
로컬 개발 시 도메인 제한에 `localhost`를 추가하세요.

## 7. CDN 정보

### 7.1 CDN 엔드포인트
- **CDN URL**: `https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com`
- **위젯 파일**: `https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com/realcaptcha-widget.min.js`

### 7.2 배포 명령어
```bash
# CDN 배포
cd frontend/captcha-widget
npm run deploy:cdn
```

## 8. 지원 및 문의

- **문서**: [https://docs.realcatcha.com](https://docs.realcatcha.com)
- **지원**: [support@realcatcha.com](mailto:support@realcatcha.com)
- **GitHub**: [https://github.com/realcatcha](https://github.com/realcatcha)
