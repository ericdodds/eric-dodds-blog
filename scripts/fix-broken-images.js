const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const xml2js = require('xml2js');

const postsDir = './app/blog/posts';
const publicImagesDir = './public/images';
const LOCAL_MEDIA_ROOT = '/Users/ericdodds/Library/CloudStorage/Dropbox/Eric Dodds/17 Digital Assets/02 Blog assets/WordPress content - Eric Dodds Blog/Jetpack_Backup_Jun_13_2025/wp-content/uploads';
const MEDIA_XML_PATH = '/Users/ericdodds/Library/CloudStorage/Dropbox/Eric Dodds/17 Digital Assets/02 Blog assets/WordPress content - Eric Dodds Blog/Eric_Dodds_WordPress_media_June_13_2025.xml';

// Build media map from XML
function buildMediaMap() {
  const mediaMap = {};
  
  if (fs.existsSync(MEDIA_XML_PATH)) {
    const xmlContent = fs.readFileSync(MEDIA_XML_PATH, 'utf-8');
    xml2js.parseString(xmlContent, (err, result) => {
      if (err) {
        console.warn('Error parsing media XML:', err);
        return;
      }
      
      const items = result.rss.channel[0].item || [];
      items.forEach(item => {
        if (item['wp:attachment_url'] && item['wp:attachment_url'][0]) {
          const url = item['wp:attachment_url'][0];
          const localPath = path.join(LOCAL_MEDIA_ROOT, item['wp:attachment_url'][0].split('/wp-content/uploads/')[1]);
          mediaMap[url] = localPath;
        }
      });
    });
  }
  
  return mediaMap;
}

function findFileByFilename(filename, rootDir) {
  try {
    const result = execSync(`find "${rootDir}" -type f -name "${filename}"`, { encoding: 'utf-8' });
    const files = result.split('\n').filter(Boolean);
    return files.length > 0 ? files[0] : null;
  } catch {
    return null;
  }
}

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

function checkBrokenImagesInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imageRegex = /<Image src="([^"]+)"[^>]*>/g;
  const brokenImages = [];
  
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    const imageSrc = match[1];
    const imagePath = path.join(publicImagesDir, imageSrc.replace(/^\/images\//, ''));
    
    if (!fs.existsSync(imagePath)) {
      brokenImages.push({
        src: imageSrc,
        path: imagePath,
        filename: path.basename(imageSrc)
      });
    }
  }
  
  return brokenImages;
}

async function fixBrokenImages() {
  const files = fs.readdirSync(postsDir);
  const mdxFiles = files.filter(file => file.endsWith('.mdx'));
  
  console.log(`Checking ${mdxFiles.length} MDX files for broken images...\n`);
  
  const mediaMap = buildMediaMap();
  console.log(`Built media map with ${Object.keys(mediaMap).length} entries\n`);
  
  const foundImages = [];
  const missingImages = [];
  
  // First pass: identify all broken images
  for (const file of mdxFiles) {
    const filePath = path.join(postsDir, file);
    const brokenImages = checkBrokenImagesInFile(filePath);
    
    for (const img of brokenImages) {
      // Try to find in media map first
      const mediaMapEntry = Object.keys(mediaMap).find(key => key.includes(img.filename));
      let localFile = null;
      
      if (mediaMapEntry && fs.existsSync(mediaMap[mediaMapEntry])) {
        localFile = mediaMap[mediaMapEntry];
      } else {
        // Fallback to filename search
        localFile = findFileByFilename(img.filename, LOCAL_MEDIA_ROOT);
      }
      
      if (localFile) {
        foundImages.push({
          post: file,
          src: img.src,
          localPath: localFile,
          destPath: img.path,
          filename: img.filename
        });
      } else {
        missingImages.push({
          post: file,
          src: img.src,
          destPath: img.path,
          filename: img.filename
        });
      }
    }
  }
  
  console.log(`Found ${foundImages.length} images in local backup to copy`);
  console.log(`Found ${missingImages.length} images to attempt downloading\n`);
  
  // Copy found images
  let copiedCount = 0;
  for (const img of foundImages) {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(img.destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.copyFileSync(img.localPath, img.destPath);
      console.log(`✅ Copied: ${img.filename}`);
      copiedCount++;
    } catch (error) {
      console.log(`❌ Failed to copy ${img.filename}: ${error.message}`);
    }
  }
  
  console.log(`\nCopied ${copiedCount} images from local backup\n`);
  
  // Try to download missing images
  console.log('Attempting to download missing images...\n');
  
  let downloadedCount = 0;
  for (const img of missingImages) {
    try {
      // Try to construct the original URL from the filename
      // For Flickr images, try common patterns
      let downloadUrl = null;
      
      if (img.filename.includes('_z.jpg') && img.filename.match(/^\d+_/)) {
        // Flickr image pattern: 12067332324_df3aa3a0dd_z.jpg
        const flickrId = img.filename.split('_')[0];
        downloadUrl = `https://farm4.staticflickr.com/3782/${flickrId}_${img.filename.split('_')[1]}_z.jpg`;
      } else if (img.filename.startsWith('wpid-')) {
        // WordPress ID pattern: wpid-53822db3d376c5.72544360.jpg
        downloadUrl = `https://ericdodds.com/wp-content/uploads/2019/07/${img.filename}`;
      } else {
        // Try direct WordPress URL
        downloadUrl = `https://ericdodds.com/wp-content/uploads/2019/07/${img.filename}`;
      }
      
      if (downloadUrl) {
        // Ensure destination directory exists
        const destDir = path.dirname(img.destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        await downloadImageWithRedirects(downloadUrl, img.destPath);
        console.log(`✅ Downloaded: ${img.filename} from ${downloadUrl}`);
        downloadedCount++;
      } else {
        console.log(`❌ No download URL found for: ${img.filename}`);
      }
    } catch (error) {
      console.log(`❌ Failed to download ${img.filename}: ${error.message}`);
    }
  }
  
  console.log(`\nDownloaded ${downloadedCount} images from web`);
  console.log(`\n📊 Summary: ${copiedCount} copied, ${downloadedCount} downloaded`);
  
  // Final check
  const finalBrokenImages = [];
  for (const file of mdxFiles) {
    const filePath = path.join(postsDir, file);
    const brokenImages = checkBrokenImagesInFile(filePath);
    finalBrokenImages.push(...brokenImages.map(img => ({ post: file, src: img.src })));
  }
  
  if (finalBrokenImages.length > 0) {
    console.log(`\n❌ Still have ${finalBrokenImages.length} broken images:`);
    finalBrokenImages.forEach(img => {
      console.log(`   ${img.post}: ${img.src}`);
    });
  } else {
    console.log(`\n🎉 All images fixed!`);
  }
}

fixBrokenImages(); 