import json
import numpy as np
import os
import sys
from glob import glob
from datetime import datetime
from pathlib import Path
import random

# config 모듈 import를 위한 경로 추가
current_dir = Path(__file__).parent
project_root = current_dir.parent.parent.parent
sys.path.append(str(project_root))

from config.paths import get_data_file_path, DATA_DIR

# 1. 원본 JSON 데이터 경로 (config 기반)
data_dir = DATA_DIR
json_files = sorted(glob(str(data_dir / "behavior_data_*.json")))

# 2. 통계 계산용 피처 추출
features = {
    "avg_speed": [],
    "click_count": [],
    "drag_time": [],
    "stay_time": [],
}

for path in json_files:
    with open(path, "r") as f:
        sessions = json.load(f)

    for session in sessions:
        mouse = session.get("mouseMovements", [])
        clicks = session.get("mouseClicks", [])
        page = session.get("pageEvents", {})

        speeds = []
        for i in range(1, len(mouse)):
            dx = mouse[i]["x"] - mouse[i - 1]["x"]
            dy = mouse[i]["y"] - mouse[i - 1]["y"]
            dt = mouse[i]["timestamp"] - mouse[i - 1]["timestamp"]
            dist = (dx**2 + dy**2)**0.5
            if dt > 0:
                speeds.append(dist / dt)

        if len(speeds) > 0:
            features["avg_speed"].append(np.mean(speeds))

        features["click_count"].append(len(clicks))

        drag_time = 0
        down = None
        for c in clicks:
            if c["type"] == "mousedown":
                down = c["timestamp"]
            elif c["type"] == "mouseup" and down is not None:
                drag_time += c["timestamp"] - down
                down = None
        features["drag_time"].append(drag_time)

        stay_time = page.get("totalTime", 0)
        if stay_time > 0:
            features["stay_time"].append(stay_time)

# 3. 통계 계산 및 스타일 분리
stats = {}
for key, vals in features.items():
    clean = [v for v in vals if not np.isnan(v)]
    mu = np.mean(clean)
    std = np.std(clean)
    stats[key] = {
        "mean": mu,
        "std": std,
        "slow_range": (mu - 2 * std, mu - 1 * std),
        "normal_range": (mu - 1 * std, mu + 1 * std),
        "fast_range": (mu + 1 * std, mu + 2 * std),
    }

# 4. 세션 구성 함수
def generate_mouse_movements(n_points=50, avg_speed=0.5):
    x, y = 500, 400
    t = 0
    movements = []

    dt_mean = max(10, (10 / avg_speed) * 1000)
    dt_std = dt_mean * 0.3

    for _ in range(n_points):
        dx = np.random.normal(0, 10)
        dy = np.random.normal(0, 10)
        dt = max(5, np.random.normal(dt_mean, dt_std))
        t += dt
        x += dx
        y += dy
        movements.append({
            "x": int(x),
            "y": int(y),
            "timestamp": int(t)
        })

    return movements, int(t)

def generate_click_events(count):
    clicks = []
    for _ in range(count):
        t = random.randint(0, 10000)
        click_type = random.choice(["click", "mousedown", "mouseup"])
        clicks.append({
            "x": random.randint(300, 800),
            "y": random.randint(200, 600),
            "timestamp": t,
            "type": click_type
        })
    return clicks

def generate_scroll_events(session_duration):
    return [{"timestamp": random.randint(0, session_duration)} for _ in range(random.randint(0, 3))]

# 5. 증강 데이터 생성
def generate_augmented_sessions(style="normal", n=50, output_dir=None):
    if output_dir is None:
        output_dir = DATA_DIR / "generated"
    
    # Path 객체를 문자열로 변환
    output_dir = str(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    for i in range(n):
        speed = np.random.uniform(*stats["avg_speed"][f"{style}_range"])
        click_count = max(0, int(np.random.uniform(*stats["click_count"][f"{style}_range"])))
        drag_time = max(0, int(np.random.uniform(*stats["drag_time"][f"{style}_range"])))
        stay_time = max(5000, int(np.random.uniform(*stats["stay_time"][f"{style}_range"])))

        # 마우스 이동 생성 (속도 기반)
        movements, duration = generate_mouse_movements(stay_time, speed)
        clicks = generate_click_events(click_count)
        scrolls = generate_scroll_events(duration)

        session = {
            "sessionId": f"{style}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            "mouseMovements": movements,
            "mouseClicks": clicks,
            "scrollEvents": scrolls,
            "pageEvents": {
                "totalTime": stay_time
            }
        }

        filename = os.path.join(output_dir, f"{style}_session_{i+1}.json")
        with open(filename, "w") as f:
            json.dump([session], f, indent=2)

# 6. 실행
if __name__ == "__main__":
    generate_augmented_sessions(style="slow", n=250)
    generate_augmented_sessions(style="normal", n=500)
    generate_augmented_sessions(style="fast", n=250)
