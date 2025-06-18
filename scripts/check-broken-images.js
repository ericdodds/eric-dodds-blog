const fs = require('fs');
const path = require('path');

const postsDir = './app/blog/posts';
const publicImagesDir = './public/images';

function checkBrokenImagesInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imageRegex = /<Image src="([^"]+)"[^>]*>/g;
  const brokenImages = [];
  
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    const imageSrc = match[1];
    // Convert /images/blog/... to ./public/images/...
    const imagePath = path.join(publicImagesDir, imageSrc.replace(/^\/images\//, ''));
    
    if (!fs.existsSync(imagePath)) {
      brokenImages.push({
        src: imageSrc,
        path: imagePath
      });
    }
  }
  
  return brokenImages;
}

function checkAllPosts() {
  const files = fs.readdirSync(postsDir);
  const mdxFiles = files.filter(file => file.endsWith('.mdx'));
  
  console.log(`Checking ${mdxFiles.length} MDX files for broken images...\n`);
  
  const postsWithBrokenImages = [];
  
  for (const file of mdxFiles) {
    const filePath = path.join(postsDir, file);
    const brokenImages = checkBrokenImagesInFile(filePath);
    
    if (brokenImages.length > 0) {
      postsWithBrokenImages.push({
        post: file,
        brokenImages: brokenImages
      });
    }
  }
  
  if (postsWithBrokenImages.length === 0) {
    console.log('✅ No broken images found!');
    return;
  }
  
  console.log(`❌ Found ${postsWithBrokenImages.length} posts with broken images:\n`);
  
  postsWithBrokenImages.forEach(({ post, brokenImages }) => {
    console.log(`📄 ${post}:`);
    brokenImages.forEach(img => {
      console.log(`   ❌ ${img.src}`);
    });
    console.log('');
  });
  
  // Summary
  const totalBrokenImages = postsWithBrokenImages.reduce((sum, { brokenImages }) => sum + brokenImages.length, 0);
  console.log(`📊 Summary: ${totalBrokenImages} broken images across ${postsWithBrokenImages.length} posts`);
}

checkAllPosts(); 