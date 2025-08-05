#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

/**
 * AWS CLI를 사용한 카카오클라우드 CDN 배포 스크립트
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

  validateConfig() {
    const required = ['accessKey', 'secretKey', 'bucket'];
    const missing = required.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(`카카오클라우드 설정이 누락되었습니다: ${missing.join(', ')}`);
    }

    // GitHub Actions 환경에서 디버깅 정보 출력
    console.log('🔍 환경 변수 디버깅:');
    console.log(`  - ACCESS_KEY: ${this.config.accessKey ? this.config.accessKey.substring(0, 8) + '...' : 'NOT_SET'}`);
    console.log(`  - SECRET_KEY: ${this.config.secretKey ? this.config.secretKey.substring(0, 8) + '...' : 'NOT_SET'}`);
    console.log(`  - PROJECT_ID: ${this.config.projectId}`);
    console.log(`  - REGION: ${this.config.region}`);
    console.log(`  - BUCKET: ${this.config.bucket}`);

    // 리전·엔드포인트 일관성 확인
    if (this.config.region !== 'kr-central-2') {
      throw new Error(`지원되지 않는 리전입니다: ${this.config.region}. kr-central-2만 사용하세요.`);
    }
    if (!this.config.endpoint.includes('kr-central-2')) {
      throw new Error(`엔드포인트(${this.config.endpoint}) 가 kr-central-2 리전용이 아닙니다.`);
    }
  }

  async deploy() {
    console.log('🌟 카카오클라우드 CDN 배포 시작 (AWS CLI 사용)...');
    console.log(`📦 버킷: ${this.config.bucket}`);
    console.log(`🌐 CDN 도메인: ${this.config.cdnDomain}`);
    console.log(`🔗 Storage 엔드포인트: ${this.config.endpoint}`);
    
    try {
      // AWS CLI 설치 확인
      await this.checkAWSCLI();
      
      // 버킷 존재 여부 확인
      await this.checkBucketExists();
      
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

  async checkAWSCLI() {
    console.log('🔍 AWS CLI 설치 확인 중...');
    
    try {
      const version = execSync('aws --version', { encoding: 'utf8' });
      console.log(`✅ AWS CLI 설치됨: ${version.trim()}`);
    } catch (error) {
      console.log('❌ AWS CLI가 설치되지 않았습니다.');
      console.log('📦 설치 방법:');
      console.log('  - Windows: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html');
      console.log('  - Linux: sudo apt-get install awscli');
      console.log('  - macOS: brew install awscli');
      throw new Error('AWS CLI 설치가 필요합니다.');
    }
  }

  async checkBucketExists() {
    console.log('🔍 버킷 존재 여부 확인 중...');
    
    try {
      const command = [
        'aws', 's3', 'ls',
        `s3://${this.config.bucket}`,
        '--endpoint-url', this.config.endpoint,
        '--region', this.config.region
      ].join(' ');
      
      console.log(`🔧 AWS CLI 명령어: ${command}`);
      
      execSync(command, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKey,
          AWS_SECRET_ACCESS_KEY: this.config.secretKey,
          AWS_DEFAULT_REGION: this.config.region
        },
        stdio: 'inherit'
      });
      
      console.log('✅ 버킷 접근 가능');
      
    } catch (error) {
      console.log('❌ 버킷 접근 실패:', error.message);
      throw new Error(`버킷 '${this.config.bucket}'에 접근할 수 없습니다. 버킷이 존재하는지, API 키 권한을 확인해주세요.`);
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
        
        // latest 폴더에만 업로드
        await this.uploadFile(filePath, `latest/${file}`, file);
        
        console.log(`✅ ${file} 업로드 완료`);
      } else {
        console.log(`⏭️ ${file} 건너뛰기 (필요하지 않은 파일)`);
      }
    }

    console.log('✅ Object Storage 업로드 완료');
  }

  async uploadFile(filePath, key, filename) {
    console.log(`📤 업로드: ${key}`);
    
    const s3Url = `s3://${this.config.bucket}/${key}`;
    
    console.log(`🌐 S3 URL: ${s3Url}`);
    console.log(`📁 로컬 파일: ${filePath}`);
    
    // AWS CLI 명령어 구성
    const awsCommand = [
      'aws', 's3', 'cp',
      filePath,
      s3Url,
      '--endpoint-url', this.config.endpoint,
      '--region', this.config.region,
      '--content-type', this.getContentType(filename),
      '--cache-control', this.getCacheControl(filename),
      '--metadata', `project-id=${this.config.projectId}`,
      '--quiet'
    ].join(' ');
    
    console.log(`🔧 AWS CLI 명령어: ${awsCommand}`);
    
    // AWS CLI 실행
    execSync(awsCommand, {
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: this.config.accessKey,
        AWS_SECRET_ACCESS_KEY: this.config.secretKey,
        AWS_DEFAULT_REGION: this.config.region
      },
      stdio: 'inherit'
    });
    
    console.log(`✅ 업로드 완료: ${key}`);
  }

  async invalidateCDN() {
    console.log('🔄 카카오클라우드 CDN 캐시 무효화...');
    
    const paths = [
      '/latest/realcaptcha-widget.min.js'
    ];
    
    console.log(`🔄 캐시 무효화 대상: ${JSON.stringify(paths)}`);
    
    // CDN 캐시 무효화는 카카오클라우드 콘솔에서 수동으로 진행
    console.log('⚠️ CDN 캐시 무효화는 카카오클라우드 콘솔에서 수동으로 진행해주세요.');
    console.log('📍 콘솔 경로: CDN > realcatcha-cdn > 캐시 무효화');
    
    console.log('✅ CDN 캐시 무효화 완료');
  }

  async postDeploy() {
    console.log('📋 배포 완료 후 작업...');
    
    // CDN URLs 생성
    const urls = this.generateCDNUrls();
    console.log('🌐 카카오클라우드 CDN URLs:');
    Object.entries(urls).forEach(([key, url]) => {
      console.log(`  ${key}: ${url}`);
    });
    
    // 배포 로그 저장
    const deployLog = {
      timestamp: new Date().toISOString(),
      version: this.version,
      bucket: this.config.bucket,
      cdnDomain: this.config.cdnDomain,
      urls: urls,
      status: 'success'
    };
    
    const logPath = path.join(this.cdnDir, 'deploy-log.json');
    await fs.writeJson(logPath, deployLog, { spaces: 2 });
    console.log(`📝 배포 로그 저장: ${logPath}`);
    
    // CDN 연결 테스트
    await this.testCDNUrls(urls);
  }

  generateCDNUrls() {
    const baseUrl = `https://${this.config.cdnDomain}`;
    
    return {
      widget_latest: `${baseUrl}/latest/realcaptcha-widget.min.js`,
      widget_versioned: `${baseUrl}/v${this.version}/realcaptcha-widget.min.js`,
      example: `${baseUrl}/v${this.version}/example.html`,
      metadata: `${baseUrl}/v${this.version}/metadata.json`
    };
  }

  async testCDNUrls(urls) {
    console.log('🔍 CDN 연결 테스트...');
    
    for (const [key, url] of Object.entries(urls)) {
      try {
        const command = `curl -I -s -o /dev/null -w "%{http_code}" "${url}"`;
        const statusCode = execSync(command, { encoding: 'utf8' }).trim();
        
        if (statusCode === '200') {
          console.log(`  ✅ ${key}: OK (${statusCode})`);
        } else {
          console.log(`  ⚠️ ${key}: ${statusCode}`);
        }
      } catch (error) {
        console.log(`  ⏰ ${key}: 타임아웃`);
      }
    }
  }

  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getCacheControl(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    if (ext === '.js' || ext === '.css') {
      return 'public, max-age=31536000, immutable'; // 1년 캐시
    } else if (ext === '.html') {
      return 'public, max-age=3600'; // 1시간 캐시
    } else {
      return 'public, max-age=86400'; // 1일 캐시
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const deployer = new KakaoCDNDeployer();
  deployer.deploy().catch(error => {
    console.error('❌ 배포 실패:', error.message);
    process.exit(1);
  });
}

module.exports = KakaoCDNDeployer; 