const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const TurndownService = require('turndown');

// Configure turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
  strongDelimiter: '**'
});

// Add custom rules for better conversion
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

function convertWordPressToMDX(wordpressXmlPath, outputDir) {
  // Read WordPress export XML
  const xmlContent = fs.readFileSync(wordpressXmlPath, 'utf-8');
  
  // Parse XML
  xml2js.parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Error parsing XML:', err);
      return;
    }

    const posts = result.rss.channel[0].item || [];
    console.log(`Found ${posts.length} posts to convert`);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const post of posts) {
      if (post['wp:status'] && post['wp:status'][0] !== 'publish') {
        continue;
      }
      if (!post['wp:post_type'] || post['wp:post_type'][0] !== 'post') {
        continue;
      }

      const title = post.title[0];
      let content = post['content:encoded'] ? post['content:encoded'][0] : '';
      const pubDate = post.pubDate ? post.pubDate[0] : new Date().toISOString();
      const categories = post.category ? post.category.map(cat => cat._) : [];
      const tags = post['wp:post_tag'] ? post['wp:post_tag'].map(tag => tag._) : [];

      // Pre-process content for WordPress-specific elements
      content = processWordPressContent(content);

      // Convert HTML content to Markdown
      const markdownContent = turndownService.turndown(content);
      
      // Create frontmatter
      const frontmatter = {
        title: title,
        publishedAt: formatDate(pubDate),
        summary: extractExcerpt(content),
        categories: categories,
        tags: tags
      };

      // Generate filename
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

      // Write MDX file
      const filePath = path.join(outputDir, `${filename}.mdx`);
      fs.writeFileSync(filePath, mdxContent);
      console.log(`Created: ${filename}.mdx`);
    }

    console.log(`\nMigration complete! ${posts.length} posts converted to MDX format.`);
    console.log(`Files saved to: ${outputDir}`);
  });
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node migrate-wordpress.js <wordpress-export.xml> <output-directory>');
    console.log('Example: node migrate-wordpress.js ./wordpress-export.xml ./app/blog/posts');
    process.exit(1);
  }

  const [xmlPath, outputPath] = args;
  
  if (!fs.existsSync(xmlPath)) {
    console.error(`Error: WordPress export file not found: ${xmlPath}`);
    process.exit(1);
  }

  convertWordPressToMDX(xmlPath, outputPath);
}

module.exports = { convertWordPressToMDX }; 