# WordPress to Next.js Blog Migration Guide

This guide will help you migrate your WordPress blog content to this Next.js application. We've provided two different approaches to make the migration as smooth as possible.

## Prerequisites

First, install the required dependencies:

```bash
pnpm install
```

## Method 1: Direct API Migration (Recommended)

This method fetches posts directly from your WordPress site using the REST API. This is the easiest approach if your WordPress site is publicly accessible.

### Steps:

1. **Run the migration script:**
   ```bash
   pnpm run migrate:fetch https://ericdodds.com ./app/blog/posts
   ```

2. **The script will:**
   - Fetch all published posts from your WordPress site
   - Convert HTML content to Markdown
   - Extract categories, tags, and featured images
   - Generate proper frontmatter
   - Save each post as an MDX file

### What gets migrated:
- ✅ Post titles and content
- ✅ Publication dates
- ✅ Categories and tags
- ✅ Featured images
- ✅ Post excerpts/summaries
- ✅ Internal links and images

## Method 2: WordPress Export Migration

If you prefer to export your WordPress content manually or if the API method doesn't work, you can use WordPress's built-in export feature.

### Steps:

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

3. **The script will:**
   - Parse the WordPress export XML
   - Convert HTML content to Markdown
   - Extract metadata (categories, tags, dates)
   - Generate proper frontmatter
   - Save each post as an MDX file

## Post-Migration Steps

After running either migration method:

1. **Review the generated files:**
   - Check that all posts were converted correctly
   - Verify that images and links are working
   - Review the frontmatter for accuracy

2. **Update your blog configuration:**
   - The posts will automatically appear in your blog
   - You may want to update the blog page layout or styling
   - Consider adding pagination if you have many posts

3. **Test your blog:**
   ```bash
   pnpm run dev
   ```
   - Visit `http://localhost:3000/blog` to see your migrated posts
   - Check individual post pages for proper rendering

## Customization Options

### Modifying the Migration Scripts

Both scripts can be customized to:
- Change the frontmatter format
- Modify how images are handled
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

4. **Encoding Issues:**
   - If you see strange characters, check the encoding
   - The scripts handle UTF-8, but some exports may use different encodings

### Getting Help:

If you encounter issues:
1. Check the console output for error messages
2. Verify your WordPress site URL is correct
3. Ensure you have proper permissions to access the site
4. Try the alternative migration method

## Next Steps

After successful migration:
1. Consider setting up redirects from old WordPress URLs
2. Update your sitemap and robots.txt
3. Test SEO and social media sharing
4. Consider adding a search feature for your blog
5. Set up analytics to track your new blog's performance

## Files Created

The migration process creates:
- `scripts/migrate-wordpress.js` - XML export converter
- `scripts/fetch-wordpress-posts.js` - API-based converter
- `MIGRATION.md` - This guide
- Updated `package.json` with required dependencies

Your migrated posts will be saved as `.mdx` files in `app/blog/posts/` with the same structure as your existing posts. 