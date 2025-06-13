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

    posts.forEach((post, index) => {
      // Only process published posts
      if (post['wp:status'] && post['wp:status'][0] !== 'publish') {
        return;
      }

      const title = post.title[0];
      const content = post['content:encoded'] ? post['content:encoded'][0] : '';
      const pubDate = post.pubDate ? post.pubDate[0] : new Date().toISOString();
      const categories = post.category ? post.category.map(cat => cat._) : [];
      const tags = post['wp:post_tag'] ? post['wp:post_tag'].map(tag => tag._) : [];

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
    });

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