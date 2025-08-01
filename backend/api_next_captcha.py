import sys
import os
import logging
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fastapi import FastAPI
from pydantic import BaseModel
from modell.inference_bot_detector import detect_bot

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
    if score >= 0.7:
        next_captcha = 'none'  # 추가 캡차 없이 통과
        threshold = 'score >= 0.7'
    elif score >= 0.4:
        next_captcha = 'imagecaptcha'
        threshold = '0.4 <= score < 0.7'
    elif score >= 0.2:
        next_captcha = 'handwritingcaptcha'
        threshold = '0.2 <= score < 0.4'
    else:
        next_captcha = 'abstractcaptcha'
        threshold = 'score < 0.2'
    logging.info(f'임계값: {threshold}, 최종 캡차 유형: {next_captcha}')

    return {
        'score': score,
        'is_bot': is_bot,
        'next_captcha': next_captcha
    }