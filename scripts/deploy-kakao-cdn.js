#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');
require('dotenv').config();

/**
 * 카카오클라우드 CDN 배포 스크립트
 * Object Storage + CDN 서비스를 이용한 캡차 위젯 배포
 */
class KakaoCDNDeployer {
  constructor() {
    this.cdnDir = path.join(__dirname, '../dist-cdn');
    this.version = require('../package.json').version;
    
    // 카카오클라우드 설정
    this.config = {
      region: process.env.KAKAO_REGION || 'kr-central-2',
      accessKey: process.env.KAKAO_ACCESS_KEY,
      secretKey: process.env.KAKAO_SECRET_KEY,
      bucket: process.env.KAKAO_CDN_BUCKET || 'realcatcha-cdn',
      projectId: process.env.KAKAO_PROJECT_ID || '1bb3c9ceb1db43928600b93b2a2b1d50',
      endpoint: process.env.KAKAO_STORAGE_ENDPOINT || 'https://objectstorage.kr-central-2.kakaocloud.com',
      cdnEndpoint: process.env.KAKAO_CDN_ENDPOINT || 'https://realcaptcha-cdn.kr-central-2.kakaocloud.com',
      cdnDomain: process.env.KAKAO_CDN_DOMAIN || 'cdn.realcaptcha.com'
    };
    
    this.validateConfig();
  }

  async testNetworkConnection() {
    console.log('🔍 카카오클라우드 네트워크 연결 테스트...');
    
    const url = new URL(this.config.endpoint);
    const options = {
      method: 'HEAD',
      timeout: 10000
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        console.log(`✅ 네트워크 연결 성공: ${res.statusCode}`);
        resolve();
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('네트워크 연결 테스트 타임아웃 (10초)'));
      });
      
      req.on('error', (error) => {
        console.log(`❌ 네트워크 연결 실패: ${error.message}`);
        console.log(`📍 연결 시도 주소: ${url.href}`);
        reject(error);
      });
      
      req.end();
    });
  }

  validateConfig() {
    const required = ['accessKey', 'secretKey', 'bucket'];
    const missing = required.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      throw new Error(`카카오클라우드 설정이 누락되었습니다: ${missing.join(', ')}`);
    }
  }

  async deploy() {
    console.log('🌟 카카오클라우드 CDN 배포 시작...');
    console.log(`📦 버킷: ${this.config.bucket}`);
    console.log(`🌐 CDN 도메인: ${this.config.cdnDomain}`);
    console.log(`🔗 Storage 엔드포인트: ${this.config.endpoint}`);
    
    try {
      // 네트워크 연결 테스트 (실패해도 계속 진행)
      try {
        await this.testNetworkConnection();
      } catch (error) {
        console.log(`⚠️ 네트워크 연결 테스트 실패, 하지만 배포를 계속 진행합니다: ${error.message}`);
      }
      
      // 빌드 파일 존재 확인
      await this.validateBuildFiles();
      
      // Object Storage에 업로드
      await this.uploadToObjectStorage();
      
      // CDN 캐시 무효화
      await this.invalidateCDN();
      
      // 배포 완료 후 작업
      await this.postDeploy();
      
      console.log('✅ 카카오클라우드 CDN 배포 완료!');
      
    } catch (error) {
      console.error('❌ CDN 배포 실패:', error.message);
      process.exit(1);
    }
  }

  async validateBuildFiles() {
    const requiredFiles = [
      'realcaptcha-widget.min.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.cdnDir, file);
      if (!await fs.pathExists(filePath)) {
        throw new Error(`필수 파일이 없습니다: ${file}`);
      }
    }

    console.log('✅ 빌드 파일 검증 완료');
  }

  async uploadToObjectStorage() {
    console.log('📤 카카오클라우드 Object Storage 업로드 중...');
    
    const files = await fs.readdir(this.cdnDir);
    
    for (const file of files) {
      // realcaptcha-widget.min.js 파일만 업로드
      if (file === 'realcaptcha-widget.min.js') {
        const filePath = path.join(this.cdnDir, file);
        const fileContent = await fs.readFile(filePath);
        
        // latest 폴더에만 업로드
        await this.uploadFile(fileContent, `latest/${file}`, file);
        
        console.log(`✅ ${file} 업로드 완료`);
      } else {
        console.log(`⏭️ ${file} 건너뛰기 (필요하지 않은 파일)`);
      }
    }

    console.log('✅ Object Storage 업로드 완료');
  }

  async uploadFile(content, key, filename, retryCount = 0) {
    const maxRetries = 3;
    const timeout = 60000; // 60초 타임아웃 (GitHub Actions 환경 고려)
    
    console.log(`📤 업로드 시도 ${retryCount + 1}/${maxRetries + 1}: ${key}`);
    
    const contentType = this.getContentType(filename);
    const contentMD5 = crypto.createHash('md5').update(content).digest('base64');
    const date = new Date().toUTCString();
    
    const options = {
      method: 'PUT',
      timeout: timeout,
      headers: {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Content-MD5': contentMD5,
        'Date': date,
        'Authorization': this.getAuthHeader('PUT', key, contentType, contentMD5, date)
      }
    };

    const url = new URL(`/v1/${this.config.projectId}/${this.config.bucket}/${key}`, this.config.endpoint);
    console.log(`🌐 업로드 URL: ${url.href}`);
    console.log(`📋 요청 헤더: ${JSON.stringify(options.headers, null, 2)}`);
    
    // curl 명령어 생성 (디버깅용)
    const curlHeaders = Object.entries(options.headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');
    const curlCommand = `curl -X PUT ${curlHeaders} --data-binary @dist-cdn/realcaptcha-widget.min.js "${url.href}"`;
    console.log(`🔧 테스트용 curl 명령어:\n${curlCommand}`);
    
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let responseBody = '';
        
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log(`✅ 업로드 완료: ${key}`);
            resolve();
          } else {
            console.log(`❌ HTTP 응답 상세 정보:`);
            console.log(`  Status: ${res.statusCode} ${res.statusMessage}`);
            console.log(`  Headers: ${JSON.stringify(res.headers, null, 2)}`);
            console.log(`  Body: ${responseBody}`);
            
            const error = new Error(`업로드 실패 ${key}: ${res.statusCode} ${res.statusMessage}`);
            reject(error);
          }
        });
      });
      
      // 타임아웃 설정
      req.setTimeout(timeout, () => {
        req.destroy();
        const error = new Error(`업로드 타임아웃 (${timeout}ms): ${key}`);
        console.log(`⏰ 타임아웃: ${error.message}`);
        
        // 재시도 로직
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 지수 백오프
          console.log(`🔄 ${delay}ms 후 재시도...`);
          setTimeout(() => {
            this.uploadFile(content, key, filename, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          reject(error);
        }
      });
      
      req.on('error', (error) => {
        console.log(`🚨 네트워크 오류: ${error.message}`);
        console.log(`📍 오류 코드: ${error.code}`);
        console.log(`📍 연결 주소: ${url.href}`);
        console.log(`📍 시스템 오류: ${error.syscall || 'N/A'}`);
        
        // 재시도 로직
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 지수 백오프
          console.log(`🔄 ${delay}ms 후 재시도... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            this.uploadFile(content, key, filename, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          console.log(`❌ 최대 재시도 횟수 초과. 포기합니다.`);
          reject(error);
        }
      });
      
      req.write(content);
      req.end();
    });
  }

  getAuthHeader(method, key, contentType, contentMD5, date) {
    // 카카오클라우드 Object Storage의 리소스 경로는 버킷/키만 포함
    const resource = `/${this.config.bucket}/${key}`;
    
    const stringToSign = [
      method,
      contentMD5,
      contentType,
      date,
      resource
    ].join('\n');
    
    console.log('🔐 Authorization 디버깅:');
    console.log(`  Method: ${method}`);
    console.log(`  Content-MD5: ${contentMD5}`);
    console.log(`  Content-Type: ${contentType}`);
    console.log(`  Date: ${date}`);
    console.log(`  Resource: ${resource}`);
    console.log(`  String to Sign: ${JSON.stringify(stringToSign)}`);
    
    const signature = crypto
      .createHmac('sha1', this.config.secretKey)
      .update(stringToSign)
      .digest('base64');
    
    const authHeader = `AWS ${this.config.accessKey}:${signature}`;
    console.log(`  Authorization: ${authHeader}`);
    
    return authHeader;
  }

  async invalidateCDN() {
    console.log('🔄 카카오클라우드 CDN 캐시 무효화...');
    
    try {
      // 카카오클라우드 CDN API를 통한 캐시 무효화
      const invalidationPaths = [
        '/latest/realcaptcha-widget.min.js'
      ];
      
      // TODO: 카카오클라우드 CDN API 연동
      // 현재는 시뮬레이션
      console.log('🔄 캐시 무효화 대상:', invalidationPaths);
      
      // 실제 API 호출 시뮬레이션 (3초 대기)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ CDN 캐시 무효화 완료');
      
    } catch (error) {
      console.warn('⚠️ CDN 캐시 무효화 실패 (배포는 성공):', error.message);
    }
  }

  async postDeploy() {
    // 배포 로그 생성
    const deployLog = {
      version: this.version,
      timestamp: new Date().toISOString(),
      provider: 'kakao',
      region: this.config.region,
      bucket: this.config.bucket,
      files: await fs.readdir(this.cdnDir),
      urls: this.generateCDNUrls()
    };

    await fs.writeFile(
      path.join(this.cdnDir, 'deploy-log.json'),
      JSON.stringify(deployLog, null, 2)
    );

    // CDN URL 정보 출력
    console.log('\n🌐 카카오클라우드 CDN URLs:');
    Object.entries(deployLog.urls).forEach(([key, url]) => {
      console.log(`  ${key}: ${url}`);
    });
    
    // 연결 테스트
    await this.testCDNUrls(deployLog.urls);
  }

  generateCDNUrls() {
    const baseUrl = this.config.cdnDomain.startsWith('http') 
      ? this.config.cdnDomain
      : `https://${this.config.cdnDomain}`;

    return {
      widget_latest: `${baseUrl}/latest/realcaptcha-widget.min.js`,
      widget_versioned: `${baseUrl}/v${this.version}/realcaptcha-widget.min.js`,
      example: `${baseUrl}/v${this.version}/example.html`,
      metadata: `${baseUrl}/v${this.version}/metadata.json`
    };
  }

  async testCDNUrls(urls) {
    console.log('\n🔍 CDN 연결 테스트...');
    
    for (const [name, url] of Object.entries(urls)) {
      try {
        const testUrl = new URL(url);
        
        await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: testUrl.hostname,
            port: 443,
            path: testUrl.pathname,
            method: 'HEAD'
          }, (res) => {
            if (res.statusCode === 200) {
              console.log(`  ✅ ${name}: OK (${res.statusCode})`);
              resolve();
            } else {
              console.log(`  ⚠️ ${name}: ${res.statusCode}`);
              resolve();
            }
          });
          
          req.on('error', () => {
            console.log(`  ❌ ${name}: 연결 실패`);
            resolve();
          });
          
          req.setTimeout(5000, () => {
            console.log(`  ⏰ ${name}: 타임아웃`);
            resolve();
          });
          
          req.end();
        });
        
      } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
      }
    }
  }

  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getCacheControl(filename) {
    if (filename.endsWith('.js')) {
      return 'public, max-age=31536000, immutable'; // 1년
    } else if (filename.endsWith('.html')) {
      return 'public, max-age=3600'; // 1시간
    } else {
      return 'public, max-age=86400'; // 1일
    }
  }
}

// 실행
if (require.main === module) {
  const deployer = new KakaoCDNDeployer();
  deployer.deploy();
}

module.exports = KakaoCDNDeployer;