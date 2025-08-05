#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const AWS = require('aws-sdk');
const crypto = require('crypto');
require('dotenv').config();

class CDNDeployer {
  constructor() {
    this.cdnDir = path.join(__dirname, '../dist-cdn');
    this.version = require('../package.json').version;
    
    // CDN 설정
    this.config = {
      // AWS S3 + CloudFront 설정
      aws: {
        region: process.env.AWS_REGION || 'ap-northeast-2',
        bucket: process.env.CDN_S3_BUCKET || 'realcaptcha-cdn',
        distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      // 카카오클라우드 CDN 설정 (대안)
      kakao: {
        endpoint: process.env.KAKAO_CDN_ENDPOINT,
        accessKey: process.env.KAKAO_ACCESS_KEY,
        secretKey: process.env.KAKAO_SECRET_KEY,
        bucket: process.env.KAKAO_CDN_BUCKET || 'realcaptcha-cdn'
      }
    };
    
    this.cdnProvider = process.env.CDN_PROVIDER || 'kakao'; // 'kakao' or 'aws'
  }

  async deploy() {
    console.log('🚀 CDN 배포 시작...');
    console.log(`🌐 CDN 제공자: ${this.cdnProvider}`);
    
    try {
      // 빌드 파일 존재 확인
      await this.validateBuildFiles();
      
      // CDN 제공자별 배포
      if (this.cdnProvider === 'kakao') {
        await this.deployToKakao();
      } else if (this.cdnProvider === 'aws') {
        await this.deployToAWS();
      } else {
        throw new Error(`지원하지 않는 CDN 제공자: ${this.cdnProvider}`);
      }
      
      // 배포 완료 후 작업
      await this.postDeploy();
      
      console.log('✅ CDN 배포 완료!');
      
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

  async deployToAWS() {
    console.log('🚫 AWS S3 + CloudFront로 배포 중...');
    
    // AWS SDK 설정
    AWS.config.update({
      region: this.config.aws.region,
      accessKeyId: this.config.aws.accessKeyId,
      secretAccessKey: this.config.aws.secretAccessKey
    });

    const s3 = new AWS.S3();
    const cloudfront = new AWS.CloudFront();

    // S3에 파일 업로드
    const files = await fs.readdir(this.cdnDir);
    
    for (const file of files) {
      const filePath = path.join(this.cdnDir, file);
      const fileContent = await fs.readFile(filePath);
      
      const contentType = this.getContentType(file);
      const cacheControl = this.getCacheControl(file);
      
      const uploadParams = {
        Bucket: this.config.aws.bucket,
        Key: `v${this.version}/${file}`,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: cacheControl,
        ACL: 'public-read'
      };

      console.log(`📎 S3 업로드: ${file}`);
      await s3.upload(uploadParams).promise();
      
      // latest 버전도 동시에 업로드
      if (file === 'realcaptcha-widget.min.js') {
        await s3.upload({
          ...uploadParams,
          Key: `latest/${file}`
        }).promise();
      }
    }

    // CloudFront 캐시 무효화
    if (this.config.aws.distributionId) {
      console.log('🔄 CloudFront 캐시 무효화...');
      await cloudfront.createInvalidation({
        DistributionId: this.config.aws.distributionId,
        InvalidationBatch: {
          CallerReference: `deploy-${Date.now()}`,
          Paths: {
            Quantity: 2,
            Items: [`/v${this.version}/*`, '/latest/*']
          }
        }
      }).promise();
    }
  }

  async deployToKakao() {
    console.log('🌟 카카오클라우드 CDN으로 배포 중...');
    
    // 카카오클라우드 전용 배포 스크립트 사용
    const KakaoCDNDeployer = require('./deploy-kakao-cdn');
    const kakaoDeployer = new KakaoCDNDeployer();
    
    try {
      await kakaoDeployer.deploy();
      console.log('✅ 카카오클라우드 CDN 배포 성공');
    } catch (error) {
      console.error('❌ 카카오클라우드 CDN 배포 실패:', error.message);
      throw error;
    }
  }

  async postDeploy() {
    // 배포 로그 생성
    const deployLog = {
      version: this.version,
      timestamp: new Date().toISOString(),
      provider: this.cdnProvider,
      files: await fs.readdir(this.cdnDir),
      urls: this.generateCDNUrls()
    };

    await fs.writeFile(
      path.join(this.cdnDir, 'deploy-log.json'),
      JSON.stringify(deployLog, null, 2)
    );

    // CDN URL 정보 출력
    console.log('\n🌐 CDN URLs:');
    Object.entries(deployLog.urls).forEach(([key, url]) => {
      console.log(`  ${key}: ${url}`);
    });
  }

  generateCDNUrls() {
    const baseUrl = this.cdnProvider === 'aws' 
      ? `https://${this.config.aws.bucket}.s3.${this.config.aws.region}.amazonaws.com`
      : this.config.kakao.endpoint;

    return {
      widget_latest: `${baseUrl}/latest/realcaptcha-widget.min.js`,
      widget_versioned: `${baseUrl}/v${this.version}/realcaptcha-widget.min.js`,
      example: `${baseUrl}/v${this.version}/example.html`,
      metadata: `${baseUrl}/v${this.version}/metadata.json`
    };
  }

  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getCacheControl(filename) {
    // JS 파일은 장기 캐싱, HTML은 단기 캐싱
    if (filename.endsWith('.js')) {
      return 'public, max-age=31536000'; // 1년
    } else if (filename.endsWith('.html')) {
      return 'public, max-age=3600'; // 1시간
    } else {
      return 'public, max-age=86400'; // 1일
    }
  }
}

// 실행
if (require.main === module) {
  const deployer = new CDNDeployer();
  deployer.deploy();
}

module.exports = CDNDeployer;