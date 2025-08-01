#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class CDNBuilder {
  constructor() {
    this.buildDir = path.join(__dirname, '../build');
    this.cdnDir = path.join(__dirname, '../dist-cdn');
    this.version = require('../package.json').version;
  }

  async build() {
    console.log('🚀 CDN 전용 빌드 시작...');
    
    try {
      // CDN 디렉토리 정리
      await fs.emptyDir(this.cdnDir);
      
      // Webpack으로 CDN 빌드
      console.log('🛠 Webpack 빌드 실행 중...');
      execSync('npx webpack --config webpack.cdn.config.js', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '../')
      });
      
      // React, ReactDOM CDN 링크를 포함한 HTML 예제 생성
      await this.generateExampleHTML();
      
      // 버전 정보와 함께 메타데이터 생성
      await this.generateMetadata();
      
      // 무결성 검사를 위한 해시 생성
      await this.generateHashes();
      
      console.log('✅ CDN 빌드 완료!');
      console.log(`📁 출력 디렉토리: ${this.cdnDir}`);
      
    } catch (error) {
      console.error('❌ CDN 빌드 실패:', error.message);
      process.exit(1);
    }
  }

  async generateExampleHTML() {
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real Captcha Widget 예제</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .example {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .captcha-container {
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Real Captcha Widget CDN 예제</h1>
    
    <div class="example">
        <h2>기본 사용법</h2>
        <div id="captcha1" class="captcha-container"></div>
        <button onclick="resetCaptcha1()">리셋</button>
    </div>
    
    <div class="example">
        <h2>커스텀 옵션</h2>
        <div id="captcha2" class="captcha-container"></div>
        <button onclick="resetCaptcha2()">리셋</button>
    </div>
    
    <!-- React 및 ReactDOM CDN -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- Real Captcha Widget -->
    <script src="./realcaptcha-widget.min.js"></script>
    
    <script>
        let captcha1Instance;
        let captcha2Instance;
        
        // 기본 예제
        captcha1Instance = renderRealCaptcha('captcha1', {
            theme: 'light',
            size: 'normal'
        }, function(result) {
            console.log('캡차 1 결과:', result);
            alert('캡차 완료: ' + (result.success ? '성공' : '실패'));
        });
        
        // 커스텀 옵션 예제
        captcha2Instance = renderRealCaptcha('captcha2', {
            theme: 'dark',
            size: 'compact',
            language: 'ko'
        }, function(result) {
            console.log('캡차 2 결과:', result);
            alert('캡차 완료: ' + (result.success ? '성공' : '실패'));
        });
        
        function resetCaptcha1() {
            if (captcha1Instance) {
                captcha1Instance.reset();
            }
        }
        
        function resetCaptcha2() {
            if (captcha2Instance) {
                captcha2Instance.reset();
            }
        }
    </script>
</body>
</html>`;

    await fs.writeFile(path.join(this.cdnDir, 'example.html'), htmlContent);
  }

  async generateMetadata() {
    const stats = await fs.stat(path.join(this.cdnDir, 'realcaptcha-widget.min.js'));
    
    const metadata = {
      name: 'Real Captcha Widget',
      version: this.version,
      buildTime: new Date().toISOString(),
      size: stats.size,
      sizeFormatted: this.formatBytes(stats.size),
      files: {
        main: 'realcaptcha-widget.min.js',
        example: 'example.html'
      },
      cdn: {
        recommended: {
          react: 'https://unpkg.com/react@18/umd/react.production.min.js',
          reactDom: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
        }
      },
      usage: {
        basic: 'renderRealCaptcha("container-id", options, callback)',
        advanced: 'new RealCaptcha(options).render("container-id", callback)'
      }
    };

    await fs.writeFile(
      path.join(this.cdnDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  async generateHashes() {
    const files = ['realcaptcha-widget.min.js'];
    const hashes = {};

    for (const file of files) {
      const filePath = path.join(this.cdnDir, file);
      const content = await fs.readFile(filePath);
      
      hashes[file] = {
        md5: crypto.createHash('md5').update(content).digest('hex'),
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
        sha512: crypto.createHash('sha512').update(content).digest('hex')
      };
    }

    await fs.writeFile(
      path.join(this.cdnDir, 'hashes.json'),
      JSON.stringify(hashes, null, 2)
    );
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// 실행
if (require.main === module) {
  const builder = new CDNBuilder();
  builder.build();
}

module.exports = CDNBuilder;