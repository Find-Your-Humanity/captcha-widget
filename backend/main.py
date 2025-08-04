from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
import uvicorn
import logging

# 프로젝트 루트 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

from model.inference_bot_detector import detect_bot

# logging 설정 (콘솔+파일)
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("api_next_captcha.log")
    ]
)

app = FastAPI()

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://test.realcatcha.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BehaviorDataRequest(BaseModel):
    behavior_data: dict  # 파일 경로 대신 데이터 자체를 받음

@app.post('/api/next-captcha')
def next_captcha(request: BehaviorDataRequest):
    logging.info('/api/next-captcha 요청 수신')
    logging.info(f'입력 데이터 샘플: {str(request.behavior_data)[:200]}...')

    # 1. 봇/사람 판별 및 스코어링
    logging.info('detect_bot 분석 시작')
    result = detect_bot(request.behavior_data)
    logging.info(f'detect_bot 결과: {result}')
    score = result['score']
    is_bot = result['is_bot']
    logging.info(f'판별 결과: {"봇" if is_bot else "사람"}, 스코어: {score}')

    # 2. 임계값에 따라 다음 캡차 유형 결정
    if score >= 70:
        next_captcha = 'none'  # 추가 캡차 없이 통과
        threshold = 'score >= 70'
    elif score >= 40:
        next_captcha = 'imagecaptcha'
        threshold = '40 <= score < 70'
    elif score >= 20:
        next_captcha = 'handwritingcaptcha'
        threshold = '20 <= score < 40'
    else:
        next_captcha = 'abstractcaptcha'
        threshold = 'score < 20'
    logging.info(f'임계값: {threshold}, 최종 캡차 유형: {next_captcha}')

    return {
        'score': score,
        'is_bot': is_bot,
        'next_captcha': next_captcha
    }

if __name__ == "__main__":
    logging.info("서버 시작")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False
    )