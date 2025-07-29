# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# NGINX 기본 설정 파일을 삭제하거나 오버라이드
# COPY nginx.conf /etc/nginx/nginx.conf; # 전체 nginx.conf를 오버라이드할 경우
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 단계에서 생성된 React 정적 파일 복사
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]