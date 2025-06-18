const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const TurndownService = require('turndown');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Configure turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
  strongDelimiter: '**'
});

// Add custom rules for better conversion (same as in the main migration script)
turndownService.addRule('wordpressImages', {
  filter: 'img',
  replacement: function (content, node) {
    const src = node.getAttribute('src') || '';
    const alt = node.getAttribute('alt') || '';
    return `![${alt}](${src})`;
  }
});

turndownService.addRule('wordpressLinks', {
  filter: 'a',
  replacement: function (content, node) {
    const href = node.getAttribute('href') || '';
    return `[${content}](${href})`;
  }
});

// Handle WordPress footnotes (common plugin output)
turndownService.addRule('wordpressFootnotes', {
  filter: function (node) {
    return node.nodeName === 'SUP' && node.className && 
           (node.className.includes('footnote') || node.className.includes('footnotes'));
  },
  replacement: function (content, node) {
    // Extract footnote number or reference
    const footnoteRef = node.textContent || content;
    return `[^${footnoteRef}]`;
  }
});

// Handle footnote content blocks
turndownService.addRule('footnoteContent', {
  filter: function (node) {
    return node.nodeName === 'DIV' && node.className && 
           (node.className.includes('footnotes') || node.className.includes('footnote-content'));
  },
  replacement: function (content, node) {
    // Convert footnote content to markdown footnotes
    const footnotes = [];
    const footnoteElements = node.querySelectorAll('li[id*="footnote"], div[id*="footnote"]');
    
    footnoteElements.forEach((footnote, index) => {
      const id = footnote.getAttribute('id') || `footnote-${index + 1}`;
      const footnoteNumber = id.replace(/[^0-9]/g, '') || (index + 1);
      const footnoteText = footnote.textContent.trim();
      footnotes.push(`[^${footnoteNumber}]: ${footnoteText}`);
    });
    
    return footnotes.length > 0 ? `\n\n${footnotes.join('\n')}` : '';
  }
});

// Handle other common WordPress plugin outputs
turndownService.addRule('wordpressShortcodes', {
  filter: function (node) {
    return node.nodeName === 'DIV' && node.className && 
           (node.className.includes('shortcode') || node.className.includes('plugin-output'));
  },
  replacement: function (content, node) {
    // Convert shortcode divs to markdown or preserve as HTML comment
    return `\n<!-- WordPress shortcode: ${node.className} -->\n${content}\n`;
  }
});

// Handle blockquotes and pullquotes
turndownService.addRule('wordpressBlockquotes', {
  filter: function (node) {
    return node.nodeName === 'BLOCKQUOTE' || 
           (node.nodeName === 'DIV' && node.className && 
            (node.className.includes('pullquote') || node.className.includes('quote')));
  },
  replacement: function (content, node) {
    const cite = node.querySelector('cite');
    const citeText = cite ? cite.textContent : '';
    const cleanContent = content.replace(/<cite>.*?<\/cite>/g, '').trim();
    return citeText ? `> ${cleanContent}\n> \n> — ${citeText}` : `> ${cleanContent}`;
  }
});

// Handle tables from plugins
turndownService.addRule('wordpressTables', {
  filter: 'table',
  replacement: function (content, node) {
    // Preserve table structure for markdown conversion
    return `\n${content}\n`;
  }
});

// Handle code blocks and syntax highlighting
turndownService.addRule('wordpressCodeBlocks', {
  filter: function (node) {
    return node.nodeName === 'PRE' || 
           (node.nodeName === 'DIV' && node.className && 
            (node.className.includes('syntax') || node.className.includes('highlight')));
  },
  replacement: function (content, node) {
    const codeElement = node.querySelector('code');
    const language = codeElement ? codeElement.className.replace('language-', '') : '';
    const codeContent = codeElement ? codeElement.textContent : content;
    return language ? `\`\`\`${language}\n${codeContent}\n\`\`\`` : `\`\`\`\n${codeContent}\n\`\`\``;
  }
});

// Handle custom styling and formatting
turndownService.addRule('wordpressCustomFormatting', {
  filter: function (node) {
    return node.nodeName === 'SPAN' && node.className && 
           (node.className.includes('highlight') || node.className.includes('emphasis'));
  },
  replacement: function (content, node) {
    // Convert custom formatting to markdown
    if (node.className.includes('highlight')) {
      return `**${content}**`;
    }
    if (node.className.includes('emphasis')) {
      return `*${content}*`;
    }
    return content;
  }
});

// For Markdown/paragraph fix, ensure Turndown is configured to add line breaks for <p>, <br>, and block elements.
turndownService.addRule('paragraphLineBreaks', {
  filter: ['p', 'br'],
  replacement: function (content, node) {
    return '\n\n' + content + '\n\n';
  }
});

function sanitizeFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function extractExcerpt(content, maxLength = 200) {
  // Remove HTML tags and get plain text
  const plainText = content.replace(/<[^>]*>/g, '');
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substring(0, maxLength).trim() + '...';
}

function processWordPressContent(content) {
  // Pre-process content to handle WordPress-specific elements
  let processedContent = content;

  // Clean up malformed HTML links and remove spam content
  processedContent = processedContent.replace(/<a[^>]*\[.*?\]\([^)]*\)[^>]*>/gi, '');
  processedContent = processedContent.replace(/<a[^>]*title="[^"]*\[.*?\]\([^)]*\)[^"]*"[^>]*>/gi, '');
  
  // Remove any remaining unclosed <a> tags that might contain spam
  processedContent = processedContent.replace(/<a[^>]*\[.*?\]\([^)]*\)[^>]*>/gi, '');
  
  // Handle citepro footnotes specifically
  const citeproFootnotes = [];
  let footnoteCounter = 1;
  processedContent = processedContent.replace(/\[citepro\](.*?)\[\/citepro\]/g, (match, footnoteText) => {
    citeproFootnotes.push(`[^${footnoteCounter}]: ${footnoteText.trim()}`);
    const footnoteRef = `[^${footnoteCounter}]`;
    footnoteCounter++;
    return footnoteRef;
  });
  // Add the footnotes at the end of the content
  if (citeproFootnotes.length > 0) {
    processedContent += '\n\n' + citeproFootnotes.map(f => f.trim()).join('\n\n');
  }

  // Remove WordPress shortcodes
  processedContent = processedContent.replace(/\[gallery[^\]]*\]/g, '');
  processedContent = processedContent.replace(/\[caption[^\]]*\](.*?)\[\/caption\]/g, '$1');
  processedContent = processedContent.replace(/\[embed[^\]]*\](.*?)\[\/embed\]/g, '$1');
  processedContent = processedContent.replace(/\[footnote[^\]]*\](.*?)\[\/footnote\]/g, '$1');
  processedContent = processedContent.replace(/\[citepro\](.*?)\[\/citepro\]/g, '$1');

  // Remove other common shortcodes
  processedContent = processedContent.replace(/\[[^\]]+\]/g, '');

  // Clean up any remaining HTML entities
  processedContent = processedContent.replace(/&nbsp;/g, ' ');
  processedContent = processedContent.replace(/&amp;/g, '&');
  processedContent = processedContent.replace(/&lt;/g, '<');
  processedContent = processedContent.replace(/&gt;/g, '>');
  processedContent = processedContent.replace(/&quot;/g, '"');

  return processedContent;
}

function listPosts(wordpressXmlPath) {
  // Read WordPress export XML
  const xmlContent = fs.readFileSync(wordpressXmlPath, 'utf-8');
  
  // Parse XML
  xml2js.parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Error parsing XML:', err);
      return;
    }

    const posts = result.rss.channel[0].item || [];
    console.log(`Found ${posts.length} posts in the export file:\n`);

    posts.forEach((post, index) => {
      if (post['wp:status'] && post['wp:status'][0] !== 'publish') {
        return;
      }

      const title = post.title[0];
      const pubDate = post.pubDate ? post.pubDate[0] : 'Unknown date';
      const content = post['content:encoded'] ? post['content:encoded'][0] : '';
      
      // Check for footnotes and images
      const hasFootnotes = content.includes('footnote') || content.includes('footnotes');
      const hasImages = content.includes('<img') || content.includes('src=');
      
      console.log(`${index + 1}. "${title}"`);
      console.log(`   Date: ${pubDate}`);
      console.log(`   Has footnotes: ${hasFootnotes ? 'Yes' : 'No'}`);
      console.log(`   Has images: ${hasImages ? 'Yes' : 'No'}`);
      console.log('');
    });
  });
}

const LOCAL_MEDIA_ROOT = '/Users/ericdodds/Library/CloudStorage/Dropbox/Eric Dodds/17 Digital Assets/02 Blog assets/WordPress content - Eric Dodds Blog/Jetpack_Backup_Jun_13_2025/wp-content/uploads';

const MEDIA_XML_PATH = '/Users/ericdodds/Library/CloudStorage/Dropbox/Eric Dodds/17 Digital Assets/02 Blog assets/WordPress content - Eric Dodds Blog/Eric_Dodds_WordPress_media_June_13_2025.xml';
let mediaMap = {};
function buildMediaMap() {
  const xmlContent = fs.readFileSync(MEDIA_XML_PATH, 'utf-8');
  xml2js.parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Error parsing media XML:', err);
      return;
    }
    const items = result.rss.channel[0].item || [];
    items.forEach(item => {
      const guid = item.guid && item.guid[0] ? item.guid[0]._ || item.guid[0] : null;
      const attachmentUrl = item['wp:attachment_url'] ? item['wp:attachment_url'][0] : null;
      let filePath = null;
      if (item['wp:attachment_url'] && item['wp:attachment_url'][0]) {
        const url = item['wp:attachment_url'][0];
        const match = url.match(/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^?\s]+)(?:\?|$)/);
        if (match) {
          filePath = path.join(LOCAL_MEDIA_ROOT, match[1], match[2], match[3]);
        }
      }
      if (guid && filePath) mediaMap[guid] = filePath;
      if (attachmentUrl && filePath) mediaMap[attachmentUrl] = filePath;
    });
  });
}
buildMediaMap();

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

async function hybridCopyOrDownloadImage(url, dest) {
  // 1. Try media map (exact match)
  const found = Object.keys(mediaMap).find(key => url.includes(key));
  if (found && fs.existsSync(mediaMap[found])) {
    fs.copyFileSync(mediaMap[found], dest);
    return;
  }
  // 2. Try filename match anywhere in backup
  const filename = url.split('/').pop().split('?')[0];
  const localFile = findFileByFilename(filename, LOCAL_MEDIA_ROOT);
  if (localFile && fs.existsSync(localFile)) {
    fs.copyFileSync(localFile, dest);
    return;
  }
  // 3. Download from URL (with redirect support)
  try {
    await downloadImageWithRedirects(url, dest);
    return;
  } catch (e) {
    console.warn(`Failed to download image (even with redirects): ${url}`);
  }
  // 4. Log as missing
  console.warn(`Image missing: ${url}`);
}

// Simple function to get image dimensions (you may need to install 'image-size' package for better results)
function getImageDimensions(imagePath) {
  try {
    // For now, return reasonable defaults based on filename
    // In a production environment, you'd want to use a library like 'image-size'
    const filename = path.basename(imagePath);
    if (filename.includes('1024x')) {
      const match = filename.match(/(\d+)x(\d+)/);
      if (match) {
        return { width: parseInt(match[1]), height: parseInt(match[2]) };
      }
    }
    // Default dimensions for images without clear size in filename
    return { width: 800, height: 600 };
  } catch (error) {
    console.warn(`Could not determine dimensions for ${imagePath}:`, error.message);
    return { width: 800, height: 600 };
  }
}

async function migrateSinglePost(wordpressXmlPath, postIndex, outputDir) {
  // Read WordPress export XML
  const xmlContent = fs.readFileSync(wordpressXmlPath, 'utf-8');
  
  // Parse XML
  xml2js.parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Error parsing XML:', err);
      return;
    }

    (async () => {
      const posts = result.rss.channel[0].item || [];
      if (postIndex < 1 || postIndex > posts.length) {
        console.error(`Invalid post index. Please choose a number between 1 and ${posts.length}`);
        return;
      }
      const post = posts[postIndex - 1];
      if (post['wp:status'] && post['wp:status'][0] !== 'publish') {
        console.error('Selected post is not published. Please choose a published post.');
        return;
      }
      const title = post.title[0];
      let content = post['content:encoded'] ? post['content:encoded'][0] : '';
      const pubDate = post.pubDate ? post.pubDate[0] : new Date().toISOString();
      const categories = post.category ? post.category.map(cat => cat._) : [];
      const tags = post['wp:post_tag'] ? post['wp:post_tag'].map(tag => tag._) : [];
      console.log(`Migrating post: "${title}"`);
      console.log(`Original content length: ${content.length} characters`);
      const hasFootnotes = content.includes('footnote') || content.includes('footnotes');
      const hasImages = content.includes('<img') || content.includes('src=');
      console.log(`Contains footnotes: ${hasFootnotes ? 'Yes' : 'No'}`);
      console.log(`Contains images: ${hasImages ? 'Yes' : 'No'}`);
      // --- PROCESS FOOTNOTES AND SHORTCODES FIRST ---
      let processedContent = processWordPressContent(content);
      // --- PRE-PROCESS: Wrap paragraphs in <p> tags ---
      let htmlContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      htmlContent = htmlContent.split(/\n{2,}/).map(p => `<p>${p.trim()}</p>`).join('\n');
      let markdownContent = turndownService.turndown(htmlContent);
      markdownContent = markdownContent.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
      markdownContent = markdownContent.replace(/(\[\^\d+\]:[^\n]*)(?=\s*\[\^\d+\]:)/g, '$1\n\n');
      // Remove WordPress-style image links that wrap images
      markdownContent = markdownContent.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\([^)]+\)/g, '![$1]($2)');
      // --- POST-PROCESS: Ensure blank lines between paragraphs ---
      markdownContent = markdownContent.split('\n').reduce((acc, line, idx, arr) => {
        acc.push(line);
        const nextLine = arr[idx + 1] || '';
        if (
          line.trim() !== '' &&
          !line.startsWith('#') &&
          !line.startsWith('>') &&
          !line.startsWith('- ') &&
          !line.startsWith('* ') &&
          !line.startsWith('1.') &&
          !line.startsWith('```') &&
          nextLine.trim() !== '' &&
          !nextLine.startsWith('#') &&
          !nextLine.startsWith('>') &&
          !nextLine.startsWith('- ') &&
          !nextLine.startsWith('* ') &&
          !nextLine.startsWith('1.') &&
          !nextLine.startsWith('```')
        ) {
          acc.push('');
        }
        return acc;
      }, []).join('\n');
      // --- IMAGE HANDLING ---
      const imageFolder = `public/images/blog/${sanitizeFilename(title)}`;
      const imageRegex = /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g;
      let imageMatches = [...markdownContent.matchAll(imageRegex)];
      if (imageMatches.length > 0) {
        if (!fs.existsSync(imageFolder)) {
          fs.mkdirSync(imageFolder, { recursive: true });
        }
        for (const match of imageMatches) {
          const alt = match[1] || '';
          const url = match[2];
          const urlParts = url.split('/');
          const filenamePart = urlParts[urlParts.length - 1].split('?')[0];
          const localImagePath = `/images/blog/${sanitizeFilename(title)}/${filenamePart}`;
          const localImageFullPath = `${imageFolder}/${filenamePart}`;
          if (!fs.existsSync(localImageFullPath)) {
            try {
              console.log(`Downloading image: ${url} -> ${localImageFullPath}`);
              await hybridCopyOrDownloadImage(url, localImageFullPath);
            } catch (e) {
              console.error(`Failed to download image: ${url}`, e);
            }
          }
          const dimensions = getImageDimensions(localImageFullPath);
          const imageTag = `<Image src=\"${localImagePath}\" alt=\"${alt.replace(/"/g, '&quot;')}\" width={${dimensions.width}} height={${dimensions.height}} />`;
          const mdPattern = new RegExp(`!\\[${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
          markdownContent = markdownContent.replace(mdPattern, imageTag);
        }
      }
      // Replace YouTube URLs with <YouTube id="..." />
      markdownContent = markdownContent.replace(/https?:\/\/youtu\.be\/([\w-]{11})(\S*)/g, '<YouTube id="$1" />');
      markdownContent = markdownContent.replace(/https?:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})(?:[&?][^\s]*)*/g, '<YouTube id="$1" />');
      console.log(`Converted content length: ${markdownContent.length} characters`);
      const hasConvertedFootnotes = markdownContent.includes('[^') && markdownContent.includes(']:');
      const hasConvertedImages = markdownContent.includes('![');
      console.log(`Converted footnotes: ${hasConvertedFootnotes ? 'Yes' : 'No'}`);
      console.log(`Converted images: ${hasConvertedImages ? 'Yes' : 'No'}`);
      const frontmatter = {
        title: title,
        publishedAt: formatDate(pubDate),
        summary: extractExcerpt(content),
        categories: categories,
        tags: tags
      };
      const filename = sanitizeFilename(title);
      const mdxContent = `---
title: '${title}'
publishedAt: '${frontmatter.publishedAt}'
summary: '${frontmatter.summary}'
${categories.length > 0 ? `categories: [${categories.map(cat => `'${cat}'`).join(', ')}]` : ''}
${tags.length > 0 ? `tags: [${tags.map(tag => `'${tag}'`).join(', ')}]` : ''}
---

${markdownContent}
`;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const filePath = path.join(outputDir, `${filename}.mdx`);
      fs.writeFileSync(filePath, mdxContent);
      console.log(`\n✅ Created: ${filename}.mdx`);
      console.log(`📁 Saved to: ${filePath}`);
      console.log('\n📄 Content Preview (first 500 characters):');
      console.log('---');
      console.log(markdownContent.substring(0, 500) + (markdownContent.length > 500 ? '...' : ''));
      console.log('---');
    })();
  });
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  List posts: node migrate-single-post.js <wordpress-export.xml>');
    console.log('  Migrate post: node migrate-single-post.js <wordpress-export.xml> <post-index> <output-directory>');
    console.log('');
    console.log('Examples:');
    console.log('  node migrate-single-post.js ./wordpress-export.xml');
    console.log('  node migrate-single-post.js ./wordpress-export.xml 1 ./app/blog/posts');
    process.exit(1);
  }

  const [xmlPath, postIndex, outputPath] = args;
  
  if (!fs.existsSync(xmlPath)) {
    console.error(`Error: WordPress export file not found: ${xmlPath}`);
    process.exit(1);
  }

  if (args.length === 1) {
    // List posts
    listPosts(xmlPath);
  } else if (args.length === 3) {
    // Migrate single post
    const index = parseInt(postIndex);
    if (isNaN(index)) {
      console.error('Error: Post index must be a number');
      process.exit(1);
    }
    (async () => {
      await migrateSinglePost(xmlPath, index, outputPath);
    })();
  } else {
    console.error('Error: Invalid number of arguments');
    process.exit(1);
  }
}

module.exports = { listPosts, migrateSinglePost }; 