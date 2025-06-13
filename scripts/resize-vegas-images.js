const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const LOCAL_MEDIA_ROOT = '/Users/ericdodds/Library/CloudStorage/Dropbox/Eric Dodds/17 Digital Assets/02 Blog assets/WordPress content - Eric Dodds Blog/Jetpack_Backup_Jun_13_2025/wp-content/uploads/2019/07';
const VEGAS_IMAGES_DIR = './public/images/blog/a-few-photos-from-vegas';

const imagesToResize = [
  {
    source: path.join(LOCAL_MEDIA_ROOT, 'b918d-las-vegas-western-hotel-mountains.jpg'),
    dest: path.join(VEGAS_IMAGES_DIR, 'las-vegas-western-hotel-mountains-800x533.jpg'),
    width: 800,
    height: 533
  },
  {
    source: path.join(LOCAL_MEDIA_ROOT, '5f7c4-las-vegas-downtown-panorama1.jpg'),
    dest: path.join(VEGAS_IMAGES_DIR, 'las-vegas-downtown-panorama1-800x221.jpg'),
    width: 800,
    height: 221
  }
];

async function resizeImages() {
  for (const img of imagesToResize) {
    if (!fs.existsSync(img.source)) {
      console.log(`❌ Source not found: ${img.source}`);
      continue;
    }
    try {
      await sharp(img.source)
        .resize(img.width, img.height)
        .toFile(img.dest);
      console.log(`✅ Resized and saved: ${img.dest}`);
    } catch (error) {
      console.log(`❌ Error resizing ${img.source}: ${error.message}`);
    }
  }
}

resizeImages(); 