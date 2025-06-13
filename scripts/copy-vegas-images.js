const fs = require('fs');
const path = require('path');

const LOCAL_MEDIA_ROOT = '/Users/ericdodds/Library/CloudStorage/Dropbox/Eric Dodds/17 Digital Assets/02 Blog assets/WordPress content - Eric Dodds Blog/Jetpack_Backup_Jun_13_2025/wp-content/uploads';
const VEGAS_IMAGES_DIR = './public/images/blog/a-few-photos-from-vegas';

// Map of expected filenames to backup filenames
const imageMap = [
  { 
    expected: 'las-vegas-el-cortez-hotel-800x533.jpg',
    backup: '2019/07/e0074-las-vegas-el-cortez-hotel.jpg'
  },
  { 
    expected: 'las-vegas-el-cortez-hotel-casino-gambling-533x800.jpg',
    backup: '2019/07/839df-las-vegas-el-cortez-hotel-casino-gambling.jpg'
  },
  { 
    expected: 'las-vegas-four-queens-hotel-casino-800x533.jpg',
    backup: '2019/07/e3bca-las-vegas-four-queens-hotel-casino.jpg'
  },
  { 
    expected: 'las-vegas-freemont-experience-lights-800x533.jpg',
    backup: '2019/07/15226-las-vegas-freemont-experience-lights.jpg'
  },
  { 
    expected: 'las-vegas-freemont-heel-800x533.jpg',
    backup: '2019/07/2efa1-las-vegas-freemont-heel.jpg'
  },
  { 
    expected: 'las-vegas-freemont-street-neon-800x533.jpg',
    backup: '2019/07/67fa8-las-vegas-freemont-street-neon.jpg'
  },
  { 
    expected: 'las-vegas-lights-800x533.jpg',
    backup: '2019/07/ba0d4-las-vegas-lights.jpg'
  },
  { 
    expected: 'las-vegas-normandie-hotel-elvis-slept-here-800x533.jpg',
    backup: '2019/07/ee821-las-vegas-normandie-hotel-elvis-slept-here.jpg'
  },
  { 
    expected: 'las-vegas-western-hotel-mountains-800x533.jpg',
    backup: '2019/07/b918d-las-vegas-western-hotel-mountains.jpg'
  },
  { 
    expected: 'las-vegas-downtown-panorama1-800x221.jpg',
    backup: '2019/07/5f7c4-las-vegas-downtown-panorama1.jpg'
  }
];

async function copyVegasImages() {
  // Ensure the destination directory exists
  if (!fs.existsSync(VEGAS_IMAGES_DIR)) {
    fs.mkdirSync(VEGAS_IMAGES_DIR, { recursive: true });
    console.log(`📁 Created directory: ${VEGAS_IMAGES_DIR}`);
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  console.log('🔄 Copying Vegas images from backup...\n');
  
  for (const img of imageMap) {
    const sourcePath = path.join(LOCAL_MEDIA_ROOT, img.backup);
    const destPath = path.join(VEGAS_IMAGES_DIR, img.expected);
    
    try {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied: ${img.expected}`);
        successCount++;
      } else {
        console.log(`❌ Source not found: ${sourcePath}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ Error copying ${img.expected}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary: ${successCount} copied, ${errorCount} failed`);
  
  if (successCount === imageMap.length) {
    console.log('\n🎉 All Vegas images copied successfully!');
  } else {
    console.log('\n⚠️  Some images failed to copy. Check the errors above.');
  }
}

copyVegasImages(); 