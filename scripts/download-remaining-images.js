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

function generateDownloadUrls(filename) {
  const urls = [];
  
  // Pattern 1: Direct WordPress URL with 2019/07
  urls.push(`https://ericdodds.com/wp-content/uploads/2019/07/${filename}`);
  
  // Pattern 2: Direct WordPress URL with 2014/06 (for the French farm breakfast)
  if (filename.includes('2014-06-09')) {
    urls.push(`https://ericdodds.com/wp-content/uploads/2014/06/${filename}`);
  }
  
  // Pattern 3: Try different year/month combinations
  const yearMonthPatterns = [
    '2019/07', '2019/06', '2019/05', '2019/04', '2019/03', '2019/02', '2019/01',
    '2018/12', '2018/11', '2018/10', '2018/09', '2018/08', '2018/07', '2018/06',
    '2017/12', '2017/11', '2017/10', '2017/09', '2017/08', '2017/07', '2017/06',
    '2016/12', '2016/11', '2016/10', '2016/09', '2016/08', '2016/07', '2016/06',
    '2015/12', '2015/11', '2015/10', '2015/09', '2015/08', '2015/07', '2015/06',
    '2014/12', '2014/11', '2014/10', '2014/09', '2014/08', '2014/07', '2014/06',
    '2013/12', '2013/11', '2013/10', '2013/09', '2013/08', '2013/07', '2013/06',
    '2012/12', '2012/11', '2012/10', '2012/09', '2012/08', '2012/07', '2012/06'
  ];
  
  for (const yearMonth of yearMonthPatterns) {
    urls.push(`https://ericdodds.com/wp-content/uploads/${yearMonth}/${filename}`);
  }
  
  // Pattern 4: Try with different Flickr farm servers
  if (filename.includes('_z.jpg') && filename.match(/^\d+_/)) {
    const parts = filename.split('_');
    const flickrId = parts[0];
    const secret = parts[1];
    
    // Try different Flickr farm servers
    const farmServers = ['farm1', 'farm2', 'farm3', 'farm4', 'farm5', 'farm6', 'farm7', 'farm8', 'farm9'];
    for (const farm of farmServers) {
      urls.push(`https://${farm}.staticflickr.com/3782/${flickrId}_${secret}_z.jpg`);
      urls.push(`https://${farm}.staticflickr.com/3783/${flickrId}_${secret}_z.jpg`);
      urls.push(`https://${farm}.staticflickr.com/3784/${flickrId}_${secret}_z.jpg`);
      urls.push(`https://${farm}.staticflickr.com/3785/${flickrId}_${secret}_z.jpg`);
      urls.push(`https://${farm}.staticflickr.com/3786/${flickrId}_${secret}_z.jpg`);
      urls.push(`https://${farm}.staticflickr.com/3787/${flickrId}_${secret}_z.jpg`);
      urls.push(`https://${farm}.staticflickr.com/3788/${flickrId}_${secret}_z.jpg`);
      urls.push(`https://${farm}.staticflickr.com/3789/${flickrId}_${secret}_z.jpg`);
    }
  }
  
  // Pattern 5: Try archive.org wayback machine
  urls.push(`https://web.archive.org/web/20200101000000*/https://ericdodds.com/wp-content/uploads/2019/07/${filename}`);
  
  // Pattern 6: Try with different domain variations
  const domains = ['ericdodds.com', 'www.ericdodds.com'];
  for (const domain of domains) {
    urls.push(`https://${domain}/wp-content/uploads/2019/07/${filename}`);
  }
  
  return urls;
}

async function downloadRemainingImages() {
  const remainingImages = [
    // Vegas photos
    { filename: 'las-vegas-el-cortez-hotel-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-el-cortez-hotel-casino-gambling-533x800.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-four-queens-hotel-casino-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-freemont-experience-lights-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-freemont-heel-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-freemont-street-neon-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-lights-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-normandie-hotel-elvis-slept-here-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-western-hotel-mountains-800x533.jpg', post: 'a-few-photos-from-vegas.mdx' },
    { filename: 'las-vegas-downtown-panorama1-800x221.jpg', post: 'a-few-photos-from-vegas.mdx' },
    
    // Other images
    { filename: 'wpid-533a3e5a1a03d8.777010151-1024x768.jpg', post: 'midnight-oil-and-owning-a-company.mdx' },
    { filename: '2014-06-09-00.33.07-1024x768.jpg', post: 'quick-takes-french-farm-breakfast.mdx' }
  ];
  
  console.log(`Attempting to download ${remainingImages.length} remaining images...\n`);
  
  let successCount = 0;
  
  for (const img of remainingImages) {
    const destPath = path.join(publicImagesDir, 'blog', img.post.replace('.mdx', ''), img.filename);
    const destDir = path.dirname(destPath);
    
    // Ensure destination directory exists
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    const urls = generateDownloadUrls(img.filename);
    let downloaded = false;
    
    console.log(`Trying to download: ${img.filename}`);
    
    for (let i = 0; i < urls.length && !downloaded; i++) {
      try {
        await downloadImageWithRedirects(urls[i], destPath);
        console.log(`✅ Downloaded: ${img.filename} from ${urls[i]}`);
        downloaded = true;
        successCount++;
        break;
      } catch (error) {
        // Continue to next URL
        if (i === urls.length - 1) {
          console.log(`❌ Failed to download ${img.filename} after trying ${urls.length} URLs`);
        }
      }
    }
  }
  
  console.log(`\n📊 Summary: ${successCount}/${remainingImages.length} images downloaded successfully`);
  
  if (successCount < remainingImages.length) {
    console.log(`\n❌ Still have ${remainingImages.length - successCount} images that couldn't be downloaded`);
  } else {
    console.log(`\n🎉 All remaining images downloaded successfully!`);
  }
}

downloadRemainingImages(); 