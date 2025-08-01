# train_autoencoder.py

import torch
import torch.nn as nn
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
from torch.utils.data import DataLoader, TensorDataset

class AutoEncoder(nn.Module):
    def __init__(self, input_dim):
        super(AutoEncoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 16)
        )
        self.decoder = nn.Sequential(
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.Linear(32, input_dim)
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

def train(csv_path):
    df = pd.read_csv(csv_path)
    drop_cols = ['user_id', 'session_id', 'label'] if 'label' in df.columns else ['user_id', 'session_id']
    df = df.drop(columns=drop_cols, errors='ignore')

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(df)
    joblib.dump(scaler, "scaler.pkl")

    X = torch.tensor(scaled, dtype=torch.float32)
    dataset = TensorDataset(X)
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    model = AutoEncoder(input_dim=X.shape[1])
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    best_loss = float('inf')
    for epoch in range(50):
        model.train()
        total_loss = 0.0
        for xb in loader:
            xb = xb[0]
            recon = model(xb)
            loss = criterion(recon, xb)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        avg_loss = total_loss / len(loader)
        print(f"Epoch {epoch+1}/50, Loss: {avg_loss:.6f}")
        if avg_loss < best_loss:
            best_loss = avg_loss
            torch.save(model.state_dict(), "model.pth")

    model.eval()
    with torch.no_grad():
        recon = model(X)
        mse = torch.mean((X - recon)**2, dim=1).numpy()
    threshold = np.mean(mse) + 3 * np.std(mse)
    with open("threshold.txt", "w") as f:
        f.write(str(threshold))
    print(f"✅ 최적 모델 저장 완료, Threshold: {threshold:.6f}")

if __name__ == "__main__":
    train("merged_session_basic_data.csv")
