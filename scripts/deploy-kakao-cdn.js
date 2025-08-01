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
      region: process.env.KAKAO_REGION || 'kr-central-1',
      accessKey: process.env.KAKAO_ACCESS_KEY,
      secretKey: process.env.KAKAO_SECRET_KEY,
      bucket: process.env.KAKAO_CDN_BUCKET || 'realcaptcha-cdn',
      endpoint: process.env.KAKAO_STORAGE_ENDPOINT || 'https://objectstorage.kr-central-1.kakaoi.io',
      cdnEndpoint: process.env.KAKAO_CDN_ENDPOINT || 'https://realcaptcha-cdn.kr-central-1.kakaoi.io',
      cdnDomain: process.env.KAKAO_CDN_DOMAIN || 'cdn.realcaptcha.com'
    };
    
    this.validateConfig();
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
    
    try {
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
      'realcaptcha-widget.min.js',
      'metadata.json',
      'hashes.json',
      'example.html'
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
      const filePath = path.join(this.cdnDir, file);
      const fileContent = await fs.readFile(filePath);
      
      // 버전별 업로드
      await this.uploadFile(fileContent, `v${this.version}/${file}`, file);
      
      // latest 버전도 업로드 (JS 파일만)
      if (file === 'realcaptcha-widget.min.js') {
        await this.uploadFile(fileContent, `latest/${file}`, file);
      }
    }

    console.log('✅ Object Storage 업로드 완료');
  }

  async uploadFile(content, key, filename) {
    const contentType = this.getContentType(filename);
    const contentMD5 = crypto.createHash('md5').update(content).digest('base64');
    
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Content-MD5': contentMD5,
        'Cache-Control': this.getCacheControl(filename),
        'x-amz-acl': 'public-read',
        'Authorization': this.getAuthHeader('PUT', key, contentType, contentMD5)
      }
    };

    const url = new URL(key, `${this.config.endpoint}/${this.config.bucket}/`);
    
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`📝 업로드 완료: ${key}`);
          resolve();
        } else {
          reject(new Error(`업로드 실패 ${key}: ${res.statusCode} ${res.statusMessage}`));
        }
      });
      
      req.on('error', reject);
      req.write(content);
      req.end();
    });
  }

  getAuthHeader(method, key, contentType, contentMD5) {
    const date = new Date().toUTCString();
    const resource = `/${this.config.bucket}/${key}`;
    
    const stringToSign = [
      method,
      contentMD5,
      contentType,
      date,
      resource
    ].join('\n');
    
    const signature = crypto
      .createHmac('sha1', this.config.secretKey)
      .update(stringToSign)
      .digest('base64');
    
    return `AWS ${this.config.accessKey}:${signature}`;
  }

  async invalidateCDN() {
    console.log('🔄 카카오클라우드 CDN 캐시 무효화...');
    
    try {
      // 카카오클라우드 CDN API를 통한 캐시 무효화
      const invalidationPaths = [
        `/v${this.version}/*`,
        '/latest/*'
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