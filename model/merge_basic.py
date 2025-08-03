import json
import numpy as np
import pandas as pd
from glob import glob
import os

# 폴더 경로 설정 (절대경로 또는 상대경로)
data_dir = "./data"  # 또는 "./data"
json_files = sorted(glob(os.path.join(data_dir, "behavior_data_*.json")))  # 패턴에 맞는 파일 모두 가져오기

# # ✅ bot_sessions.json도 포함시키려면 아래 추가
# json_files.append("/Users/kang-yeongmo/userdata/data/bot_sessions.json")

summary_features = []

for file_path in json_files:
    with open(file_path, 'r') as f:
        sessions = json.load(f)

    for session in sessions:
        session_id = session.get("sessionId", "unknown")
        mouse = pd.DataFrame(session.get("mouseMovements", []))
        clicks = pd.DataFrame(session.get("mouseClicks", []))

        if len(mouse) == 0:
            continue

        # 시간 차 계산
        mouse["dt"] = mouse["timestamp"].diff().fillna(0)

        # 이동 거리 및 속도 계산
        dx = mouse["x"].diff().fillna(0)
        dy = mouse["y"].diff().fillna(0)
        distance = np.sqrt(dx**2 + dy**2)
        speed = distance / mouse["dt"].replace(0, np.nan)

        # 클릭 이벤트 요약
        click_counts = {
            "click_count": len(clicks),
            "mousedown_count": 0,
            "mouseup_count": 0,
        }
        if not clicks.empty and "type" in clicks.columns:
            click_counts["mousedown_count"] = (clicks["type"] == "mousedown").sum()
            click_counts["mouseup_count"] = (clicks["type"] == "mouseup").sum()
            for t in clicks["type"].unique():
                click_counts[f"click_type_{t}"] = (clicks["type"] == t).sum()

        # 요약 피처
        summary = {
            "session_id": session_id,
            "total_distance": distance.sum(),
            "average_speed": speed.mean(),
            "max_speed": speed.max(),
            "min_speed": speed.min(),
            "std_speed": speed.std(),
            "total_duration": mouse["timestamp"].iloc[-1] - mouse["timestamp"].iloc[0],
            "movement_count": len(mouse),
            "pause_count": (speed < 5).sum()
        }
        summary.update(click_counts)
        summary_features.append(summary)

# 병합 (요약 피처만 사용)
df_summary = pd.DataFrame(summary_features)

# 누락된 클릭 피처들 NaN → 0 대체
click_type_cols = [col for col in df_summary.columns if col.startswith("click_type_")]
df_summary[click_type_cols] = df_summary[click_type_cols].fillna(0)

# 저장
df_summary.to_csv("merged_session_basic_data.csv", index=False)
