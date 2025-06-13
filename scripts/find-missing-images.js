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

function findMissingImages() {
  const files = fs.readdirSync(postsDir);
  const mdxFiles = files.filter(file => file.endsWith('.mdx'));
  
  console.log(`Checking ${mdxFiles.length} MDX files for missing images...\n`);
  
  const mediaMap = buildMediaMap();
  console.log(`Built media map with ${Object.keys(mediaMap).length} entries\n`);
  
  const foundImages = [];
  const notFoundImages = [];
  
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
          filename: img.filename
        });
      } else {
        notFoundImages.push({
          post: file,
          src: img.src,
          filename: img.filename
        });
      }
    }
  }
  
  if (foundImages.length > 0) {
    console.log(`✅ Found ${foundImages.length} missing images in local backup:\n`);
    foundImages.forEach(img => {
      console.log(`📄 ${img.post}:`);
      console.log(`   ✅ ${img.src}`);
      console.log(`   📁 ${img.localPath}\n`);
    });
  }
  
  if (notFoundImages.length > 0) {
    console.log(`❌ ${notFoundImages.length} images not found in local backup:\n`);
    notFoundImages.forEach(img => {
      console.log(`📄 ${img.post}:`);
      console.log(`   ❌ ${img.src}\n`);
    });
  }
  
  console.log(`📊 Summary: ${foundImages.length} found, ${notFoundImages.length} not found`);
  
  return { foundImages, notFoundImages };
}

findMissingImages(); 