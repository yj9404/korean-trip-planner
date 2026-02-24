const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 배포 준비 중...');

const envPath = path.join(__dirname, '.env');
const credsPath = path.join(__dirname, 'firebase-credentials.json');
const yamlPath = path.join(__dirname, 'env.yaml');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env 파일이 없습니다! 먼저 설정해주세요.');
    process.exit(1);
}

const yamlContent = {};

// Parse .env
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

envLines.forEach(line => {
    line = line.trim();
    if (line.startsWith('#') || !line) return;

    // Split by first '='
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;

    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();

    // Exclude local-only settings
    const ignoreKeys = ['HOST', 'PORT', 'FIREBASE_CREDENTIALS_PATH', 'FIREBASE_CREDENTIALS_JSON'];
    if (!ignoreKeys.includes(key)) {
        yamlContent[key] = value;
    }
});

// Parse firebase-credentials.json
if (fs.existsSync(credsPath)) {
    const credsContent = fs.readFileSync(credsPath, 'utf8');
    try {
        const jsonObj = JSON.parse(credsContent);
        // Create one-line JSON string without spaces
        const jsonStr = JSON.stringify(jsonObj);
        yamlContent['FIREBASE_CREDENTIALS_JSON'] = jsonStr;
        console.log('✅ firebase-credentials.json 로드 완료.');
    } catch (error) {
        console.error('❌ JSON 파싱 에러:', error);
    }
} else {
    console.warn('⚠️ firebase-credentials.json 파일이 없습니다.');
}

// Write to YAML string
let yamlString = '';
for (const [key, value] of Object.entries(yamlContent)) {
    // Escape single quotes by doubling them
    const escapedValue = (value || '').replace(/'/g, "''");
    yamlString += `${key}: '${escapedValue}'\n`;
}

// Write env.yaml
fs.writeFileSync(yamlPath, yamlString, 'utf8');
console.log('✅ 배포용 환경변수 템플릿(env.yaml) 임시 생성 완료.');

console.log('🚀 Google Cloud Run 배포 시작...');
console.log('--------------------------------------------------------');

try {
    const command = `gcloud run deploy korean-trip-api --source . --region asia-northeast3 --allow-unauthenticated --env-vars-file env.yaml --memory 512Mi --min-instances 0 --max-instances 3`;

    // Execute command synchronously and pipe output to console
    execSync(command, { stdio: 'inherit', shell: true });
} catch (error) {
    console.error('❌ 배포 중 오류가 발생했습니다.');
} finally {
    console.log('--------------------------------------------------------');
    // Cleanup env.yaml
    if (fs.existsSync(yamlPath)) {
        fs.unlinkSync(yamlPath);
        console.log('🗑️ 임시 env.yaml 파일 삭제 완료.');
    }
}

console.log('🎉 배포 프로세스가 종료되었습니다!');
