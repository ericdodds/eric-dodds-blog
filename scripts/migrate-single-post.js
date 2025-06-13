const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const TurndownService = require('turndown');
const https = require('https');
const http = require('http');

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
  
  // Handle citepro footnotes specifically
  const citeproFootnotes = [];
  let footnoteCounter = 1;
  
  processedContent = processedContent.replace(/\[citepro\](.*?)\[\/citepro\]/g, (match, footnoteText) => {
    // Store the footnote content and return a reference
    citeproFootnotes.push(`[^${footnoteCounter}]: ${footnoteText.trim()}`);
    const footnoteRef = `[^${footnoteCounter}]`;
    footnoteCounter++;
    return footnoteRef;
  });
  
  // Add the footnotes at the end of the content
  if (citeproFootnotes.length > 0) {
    processedContent += '\n\n' + citeproFootnotes.map(f => f.trim()).join('\n\n') + '\n\n';
  }
  
  // Handle WordPress shortcodes that might not be converted properly
  processedContent = processedContent.replace(/\[([^\]]+)\]/g, (match, shortcode) => {
    // Convert common shortcodes to markdown or remove them
    if (shortcode.startsWith('footnote')) {
      return `[^${shortcode.replace('footnote', '')}]`;
    }
    if (shortcode.startsWith('caption')) {
      return ''; // Remove caption shortcodes
    }
    return match; // Keep other shortcodes as-is
  });
  
  // Handle WordPress gallery shortcodes
  processedContent = processedContent.replace(/\[gallery[^\]]*\]/g, '');
  
  // Handle WordPress embed shortcodes
  processedContent = processedContent.replace(/\[embed\](.*?)\[\/embed\]/g, '$1');
  
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

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    mod.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
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
      content = processWordPressContent(content);
      let markdownContent = turndownService.turndown(content);
      markdownContent = markdownContent.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
      markdownContent = markdownContent.replace(/(\[\^\d+\]:[^\n]*)(?=\s*\[\^\d+\]:)/g, '$1\n\n');
      // Remove WordPress-style image links that wrap images
      // This converts [![alt](url)](link) to ![alt](url)
      markdownContent = markdownContent.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\([^)]+\)/g, '![$1]($2)');
      // --- IMAGE HANDLING ---
      const imageFolder = `public/images/blog/${sanitizeFilename(title)}`;
      if (!fs.existsSync(imageFolder)) {
        fs.mkdirSync(imageFolder, { recursive: true });
      }
      const imageRegex = /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g;
      let imageMatches = [...markdownContent.matchAll(imageRegex)];
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
            await downloadImage(url, localImageFullPath);
          } catch (e) {
            console.error(`Failed to download image: ${url}`, e);
          }
        }
        const dimensions = getImageDimensions(localImageFullPath);
        const imageTag = `<Image src=\"${localImagePath}\" alt=\"${alt.replace(/"/g, '&quot;')}\" width={${dimensions.width}} height={${dimensions.height}} />`;
        const mdPattern = new RegExp(`!\\[${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
        markdownContent = markdownContent.replace(mdPattern, imageTag);
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