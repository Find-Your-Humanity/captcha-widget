from fastapi import FastAPI
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from modell.inference_bot_detector import detect_bot

app = FastAPI()

class BehaviorDataRequest(BaseModel):
    behavior_data: dict  # 파일 경로 대신 데이터 자체를 받음

@app.post('/api/next-captcha')
def next_captcha(request: BehaviorDataRequest):
    print('[LOG] /api/next-captcha 요청 수신')
    print(f'[LOG] 입력 데이터 샘플: {str(request.behavior_data)[:200]}...')

    # 1. 봇/사람 판별 및 스코어링
    print('[LOG] detect_bot 분석 시작')
    result = detect_bot(request.behavior_data)  # dict를 바로 넘김
    print(f'[LOG] detect_bot 결과: {result}')
    score = result['score']

    # 2. 임계값에 따라 다음 캡차 유형 결정
    if score >= 0.7:
        next_captcha = 'none'  # 추가 캡차 없이 통과
    elif score >= 0.4:
        next_captcha = 'imagecaptcha'
    elif score >= 0.2:
        next_captcha = 'handwritingcaptcha'
    else:
        next_captcha = 'abstractcaptcha'
    print(f'[LOG] 최종 캡차 유형 결정: {next_captcha}')

    return {
        'score': score,
        'is_bot': result['is_bot'],
        'next_captcha': next_captcha
    }