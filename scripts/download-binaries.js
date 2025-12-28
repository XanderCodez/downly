const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const BINARY_URLS = {
  'win': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
  'linux': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
  'mac': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos' // Optional, if we want to update mac too
};

const RESOURCES_DIR = path.join(__dirname, '../resources/yt-dlp');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

const main = async () => {
  console.log('📦 Preparing to download yt-dlp binaries...');

  for (const [platform, url] of Object.entries(BINARY_URLS)) {
    const platformDir = path.join(RESOURCES_DIR, platform);
    ensureDir(platformDir);

    const fileName = platform === 'win' ? 'yt-dlp.exe' : 'yt-dlp';
    const dest = path.join(platformDir, fileName);

    if (fs.existsSync(dest)) {
      console.log(`✅ [${platform}] Binary already exists: ${dest}`);
      // Optional: Could verify version or force overwrite
    } else {
      console.log(`⬇️  [${platform}] Downloading from ${url}...`);
      try {
        await downloadFile(url, dest);
        console.log(`✅ [${platform}] Download complete.`);
      } catch (e) {
        console.error(`❌ [${platform}] Failed to download:`, e.message);
      }
    }

    // chmod +x for unix
    if (platform !== 'win') {
      try {
        fs.chmodSync(dest, '755');
        console.log(`🔒 [${platform}] Set executable permissions.`);
      } catch (e) {
        // ignore if file doesn't exist from failed download
      }
    }
  }

  console.log('\n✨ All binaries checked/downloaded.');
  console.log('   Locations:');
  console.log(`   - Windows: resources/yt-dlp/win/yt-dlp.exe`);
  console.log(`   - Linux:   resources/yt-dlp/linux/yt-dlp`);
  console.log(`   - Mac:     resources/yt-dlp/mac/yt-dlp`);
};

main();
