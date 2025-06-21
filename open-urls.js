const fs = require('fs');
const { exec } = require('child_process');

// Read the URLs from the file
const urls = fs.readFileSync('cleaned-urls.txt', 'utf8')
  .split('\n')
  .filter(url => url.trim() !== ''); // Remove empty lines

console.log(`Found ${urls.length} URLs to open`);

// Function to open URL in Chrome
function openUrl(url) {
  const command = process.platform === 'darwin' 
    ? `open -a "Google Chrome" "${url}"`  // macOS - open in Chrome
    : process.platform === 'win32' 
    ? `start chrome "${url}"` // Windows - open in Chrome
    : `google-chrome "${url}"`; // Linux - open in Chrome

  exec(command, (error) => {
    if (error) {
      console.error(`Error opening ${url}:`, error.message);
    } else {
      console.log(`Opened in Chrome: ${url}`);
    }
  });
}

// Open URLs with a small delay between each to avoid overwhelming the browser
urls.forEach((url, index) => {
  setTimeout(() => {
    openUrl(url);
  }, index * 500); // 500ms delay between each URL
});

console.log('Starting to open URLs in Chrome...'); 