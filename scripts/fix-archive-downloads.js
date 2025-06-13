const fs = require('fs');
const path = require('path');

const publicImagesDir = './public/images';

function downloadImageWithRedirects(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function request(u) {
      const isHttps = u.startsWith('https');
      const mod = isHttps ? require('https') : require('http');
      mod.get(u, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && maxRedirects > 0) {
          request(response.headers.location.startsWith('http') ? response.headers.location : new URL(response.headers.location, u).toString());
        } else if (response.statusCode === 200) {
          const file = fs.createWriteStream(dest);
          response.pipe(file);
          file.on('finish', () => file.close(resolve));
        } else {
          reject(new Error(`Failed to get '${u}' (${response.statusCode})`));
        }
      }).on('error', err => {
        fs.unlink(dest, () => reject(err));
      });
    }
    request(url);
  });
}

function isHtmlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html');
  } catch {
    return false;
  }
}

async function fixArchiveDownloads() {
  const vegasDir = path.join(publicImagesDir, 'blog', 'a-few-photos-from-vegas');
  
  if (!fs.existsSync(vegasDir)) {
    console.log('Vegas directory not found');
    return;
  }
  
  const files = fs.readdirSync(vegasDir);
  const corruptedFiles = [];
  
  // Check for HTML files with .jpg extensions
  for (const file of files) {
    const filePath = path.join(vegasDir, file);
    if (isHtmlFile(filePath)) {
      corruptedFiles.push(file);
    }
  }
  
  console.log(`Found ${corruptedFiles.length} corrupted HTML files to fix:\n`);
  corruptedFiles.forEach(f => console.log(`  - ${f}`));
  
  // Remove corrupted files
  for (const file of corruptedFiles) {
    const filePath = path.join(vegasDir, file);
    fs.unlinkSync(filePath);
    console.log(`🗑️  Removed: ${file}`);
  }
  
  console.log('\nAttempting to download actual images...\n');
  
  // Try to download the actual images using different methods
  const imageUrls = [
    { filename: 'las-vegas-el-cortez-hotel-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-el-cortez-hotel-800x533.jpg' },
    { filename: 'las-vegas-el-cortez-hotel-casino-gambling-533x800.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-el-cortez-hotel-casino-gambling-533x800.jpg' },
    { filename: 'las-vegas-four-queens-hotel-casino-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-four-queens-hotel-casino-800x533.jpg' },
    { filename: 'las-vegas-freemont-experience-lights-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-freemont-experience-lights-800x533.jpg' },
    { filename: 'las-vegas-freemont-heel-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-freemont-heel-800x533.jpg' },
    { filename: 'las-vegas-freemont-street-neon-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-freemont-street-neon-800x533.jpg' },
    { filename: 'las-vegas-lights-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-lights-800x533.jpg' },
    { filename: 'las-vegas-normandie-hotel-elvis-slept-here-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-normandie-hotel-elvis-slept-here-800x533.jpg' },
    { filename: 'las-vegas-western-hotel-mountains-800x533.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-western-hotel-mountains-800x533.jpg' },
    { filename: 'las-vegas-downtown-panorama1-800x221.jpg', url: 'https://ericdodds.com/wp-content/uploads/2014/05/las-vegas-downtown-panorama1-800x221.jpg' }
  ];
  
  let successCount = 0;
  
  for (const img of imageUrls) {
    const destPath = path.join(vegasDir, img.filename);
    
    try {
      await downloadImageWithRedirects(img.url, destPath);
      console.log(`✅ Downloaded: ${img.filename}`);
      successCount++;
    } catch (error) {
      console.log(`❌ Failed to download ${img.filename}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Summary: ${successCount}/${imageUrls.length} images downloaded successfully`);
  
  if (successCount < imageUrls.length) {
    console.log('\n❌ Some images still missing. You may need to remove them from the post or find alternative sources.');
  } else {
    console.log('\n🎉 All Vegas images fixed!');
  }
}

fixArchiveDownloads(); 