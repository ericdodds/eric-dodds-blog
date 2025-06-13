const fs = require('fs');
const path = require('path');

const postsDir = './app/blog/posts';

function cleanSpamFromFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Remove spam links
  content = content.replace(/\[online casino\]\(http:\/\/www\.cillap\.com\/\)/g, '');
  content = content.replace(/\[casino online\]\(http:\/\/www\.cillap\.com\/\)/g, '');
  content = content.replace(/\[casino online\]\(http:\/\/www\.svenskkasinon\.com\/\)/g, '');

  // Remove malformed HTML links that contain spam
  content = content.replace(/<a[^>]*\[[^\]]*\]\([^)]+\)[^>]*>/gi, '');
  content = content.replace(/<a[^>]*title="[^"]*\[[^\]]*\]\([^)]+\)[^"]*"[^>]*>/gi, '');

  // Only write if changed
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

function cleanAllPosts() {
  const files = fs.readdirSync(postsDir);
  const mdxFiles = files.filter(file => file.endsWith('.mdx'));

  console.log(`Checking ${mdxFiles.length} MDX files for spam/malformed links...`);
  const updated = [];

  for (const file of mdxFiles) {
    const filePath = path.join(postsDir, file);
    if (cleanSpamFromFile(filePath)) {
      updated.push(file);
    }
  }

  if (updated.length > 0) {
    console.log('\nUpdated posts:');
    updated.forEach(f => console.log(f));
  } else {
    console.log('No posts needed cleaning.');
  }
  console.log('\nSelective spam/malformed link cleanup complete!');
}

cleanAllPosts(); 