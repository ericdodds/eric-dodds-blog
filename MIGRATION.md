# WordPress to Next.js Blog Migration Guide

This guide will help you migrate your WordPress blog content to this Next.js application. We've provided multiple approaches to make the migration as smooth as possible, with special handling for WordPress plugins like footnote generators.

## Prerequisites

First, install the required dependencies:

```bash
pnpm install
```

## Step 1: Analyze Your WordPress Content (Recommended)

Before migrating, analyze your WordPress content to understand what plugins and custom formatting you're using:

```bash
# If you have a WordPress export file
pnpm run migrate:analyze ./wordpress-export.xml

# Or analyze content directly from your site (if accessible)
curl -o wordpress-export.xml https://ericdodds.com/wp-export.php
pnpm run migrate:analyze ./wordpress-export.xml
```

This analysis will:
- ✅ Detect footnote plugins and their HTML structure
- ✅ Identify custom shortcodes and plugin outputs
- ✅ Find tables, code blocks, and custom formatting
- ✅ Provide recommendations for migration
- ✅ Show examples of plugin-specific content

## Step 2: Choose Your Migration Method

### Method 1: Direct API Migration (Recommended)

This method fetches posts directly from your WordPress site using the REST API. This is the easiest approach if your WordPress site is publicly accessible.

#### Steps:

1. **Run the migration script:**
   ```bash
   pnpm run migrate:fetch https://ericdodds.com ./app/blog/posts
   ```

2. **The script will:**
   - Fetch all published posts from your WordPress site
   - Convert HTML content to Markdown
   - Handle WordPress plugins (including footnotes)
   - Extract categories, tags, and featured images
   - Generate proper frontmatter
   - Save each post as an MDX file

### Method 2: WordPress Export Migration

If you prefer to export your WordPress content manually or if the API method doesn't work, you can use WordPress's built-in export feature.

#### Steps:

1. **Export from WordPress:**
   - Go to your WordPress admin dashboard
   - Navigate to **Tools > Export**
   - Select "All content" or "Posts only"
   - Click "Download Export File"
   - Save the XML file (e.g., `wordpress-export.xml`)

2. **Run the migration script:**
   ```bash
   pnpm run migrate:wordpress ./wordpress-export.xml ./app/blog/posts
   ```

## WordPress Plugin Handling

The migration scripts include special handling for common WordPress plugins:

### Footnotes Plugin
- ✅ Converts `<sup class="footnote">` to markdown footnotes `[^1]`
- ✅ Extracts footnote content and formats as `[^1]: footnote text`
- ✅ Handles both inline and block footnote structures

### Syntax Highlighting
- ✅ Preserves code blocks with language detection
- ✅ Converts `<pre><code class="language-javascript">` to markdown code blocks
- ✅ Maintains syntax highlighting classes

### Tables
- ✅ Preserves table structure for markdown conversion
- ✅ Handles complex table layouts from table plugins

### Custom Shortcodes
- ✅ Converts common shortcodes to markdown equivalents
- ✅ Preserves complex shortcodes as HTML comments for manual review
- ✅ Handles gallery, embed, and caption shortcodes

### Blockquotes and Pullquotes
- ✅ Converts blockquotes with proper attribution
- ✅ Handles custom quote styling and citations

## Post-Migration Steps

After running either migration method:

1. **Review the generated files:**
   - Check that all posts were converted correctly
   - Verify that footnotes are properly formatted
   - Ensure images and links are working
   - Review the frontmatter for accuracy

2. **Test footnote rendering:**
   - Footnotes should appear as `[^1]` in the text
   - Footnote definitions should be at the bottom of each post
   - Test that footnote links work correctly

3. **Update your blog configuration:**
   - The posts will automatically appear in your blog
   - You may want to update the blog page layout or styling
   - Consider adding pagination if you have many posts

4. **Test your blog:**
   ```bash
   pnpm run dev
   ```
   - Visit `http://localhost:3000/blog` to see your migrated posts
   - Check individual post pages for proper rendering
   - Verify that footnotes display correctly

## Customization Options

### Modifying the Migration Scripts

Both scripts can be customized to:
- Change the frontmatter format
- Modify how footnotes are handled
- Adjust the excerpt length
- Add custom metadata fields

### Adding Custom Frontmatter

You can extend the frontmatter by modifying the scripts. For example, to add an `author` field:

```javascript
// In the migration script
const mdxContent = `---
title: '${title}'
publishedAt: '${publishedAt}'
summary: '${summary}'
author: 'Eric Dodds'
categories: [${categories}]
tags: [${tags}]
---
`;
```

### Handling Special Content

If your WordPress posts contain:
- **Custom shortcodes**: You may need to manually convert these
- **Embedded videos**: Links will be preserved, but you might want to use MDX components
- **Custom fields**: Add them to the frontmatter extraction logic
- **Complex footnotes**: Review and adjust the footnote conversion rules

## Troubleshooting

### Common Issues:

1. **API Access Denied:**
   - Some WordPress sites may block API access
   - Use Method 2 (export) instead

2. **Missing Images:**
   - Check that image URLs are accessible
   - Consider downloading and hosting images locally

3. **Broken Links:**
   - Internal WordPress links may need updating
   - Review and fix any broken references

4. **Footnotes Not Converting:**
   - Check the analysis output for footnote patterns
   - Verify that your footnote plugin uses standard HTML structure
   - Manually adjust footnote conversion if needed

5. **Encoding Issues:**
   - If you see strange characters, check the encoding
   - The scripts handle UTF-8, but some exports may use different encodings

### Getting Help:

If you encounter issues:
1. Run the analysis script first to understand your content structure
2. Check the console output for error messages
3. Verify your WordPress site URL is correct
4. Ensure you have proper permissions to access the site
5. Try the alternative migration method

## Next Steps

After successful migration:
1. Consider setting up redirects from old WordPress URLs
2. Update your sitemap and robots.txt
3. Test SEO and social media sharing
4. Consider adding a search feature for your blog
5. Set up analytics to track your new blog's performance

## Files Created

The migration process creates:
- `scripts/migrate-wordpress.js` - XML export converter with plugin handling
- `scripts/fetch-wordpress-posts.js` - API-based converter with plugin handling
- `scripts/analyze-wordpress-content.js` - Content analysis tool
- `MIGRATION.md` - This guide
- Updated `package.json` with required dependencies

Your migrated posts will be saved as `.mdx` files in `app/blog/posts/` with the same structure as your existing posts, including proper footnote formatting. 