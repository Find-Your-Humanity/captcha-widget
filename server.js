const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('.')); // 정적 파일 서빙

// RealCaptcha API 설정
const REALCAPTCHA_API_URL = 'https://captcha-api.realcatcha.com';
const API_KEY = 'rc_live_f49a055d62283fd02e8203ccaba70fc2';

// 캡차 검증 엔드포인트
app.post('/verify-captcha', async (req, res) => {
    try {
        const { token, captcha_type = 'handwriting' } = req.body;
        
        if (!token) {
            return res.status(400).json({ 
                success: false, 
                message: '토큰이 필요합니다.' 
            });
        }

        console.log(`캡차 검증 요청: ${captcha_type} 타입, 토큰: ${token}`);

        // RealCaptcha 서버에 검증 요청
        const response = await axios.post(`${REALCAPTCHA_API_URL}/api/verify-${captcha_type}`, {
            token: token,
            // 추가 데이터가 필요한 경우 여기에 포함
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        });
        
        console.log('RealCaptcha 응답:', response.data);

        if (response.data.success) {
            res.json({ 
                success: true, 
                message: '캡차 검증 성공!',
                data: response.data
            });
        } else {
            res.json({ 
                success: false, 
                message: '캡차 검증 실패',
                error: response.data.detail || '알 수 없는 오류'
            });
        }
    } catch (error) {
        console.error('캡차 검증 오류:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ 
                success: false, 
                message: 'API 키가 유효하지 않습니다.' 
            });
        } else if (error.response?.status === 429) {
            res.status(429).json({ 
                success: false, 
                message: '요청 한도를 초과했습니다.' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: '서버 오류가 발생했습니다.',
                error: error.message
            });
        }
    }
});

// API 키 검증 엔드포인트
app.post('/verify-api-key', async (req, res) => {
    try {
        const response = await axios.post(`${REALCAPTCHA_API_URL}/api/verify-api-key`, {}, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('API 키 검증 오류:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: 'API 키 검증 중 오류가 발생했습니다.' 
        });
    }
});

// 캡차 시작 엔드포인트
app.post('/start-captcha', async (req, res) => {
    try {
        const { captcha_type = 'handwriting', behavior_data = {} } = req.body;
        
        const response = await axios.post(`${REALCAPTCHA_API_URL}/api/next-captcha`, {
            captcha_type: captcha_type,
            behavior_data: behavior_data
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('캡차 시작 오류:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: '캡차 시작 중 오류가 발생했습니다.' 
        });
    }
});

// 테스트 페이지 제공
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/test-integration.html');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 RealCaptcha 테스트 서버가 ${PORT}번 포트에서 실행 중입니다.`);
    console.log(`📱 테스트 페이지: http://localhost:${PORT}`);
    console.log(`🔑 API 키: ${API_KEY}`);
    console.log(`🌐 RealCaptcha API: ${REALCAPTCHA_API_URL}`);
});

module.exports = app;
