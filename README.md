# Eric Dodds Weblog

This is my personal website. It hosts my blog posts, tells readers a bit about me and have a contact form for people who want to reach out. 

## Migration from WordPress

I the site on WordPress for years, then finally bit the bullet and migrated it into a super snappy Next.js app on Vercel. 

I [wrote a blog post](https://www.ericdodds.com/blog/migrating-my-wordpress-blog-to-nextjs-and-vercel?utm_source=github-blog-repo) about the migration. 

## If you want to clone my site

I used the [Vercel Portfolio Blog Starter](https://github.com/vercel/examples/tree/main/solutions/blog) template and made modifications in style and functionality. I was careful to not do anything weird to keep the baseline Next.js app clean (including removal of the code and scripts used for the WordPress migration). 

You should be able to clone this repo and get the app running pretty easily. 

---

## Summary of Changes from Vercel Blog Starter

### 🖱️ **UI/UX Enhancements**

#### **Image Modal Functionality**
- **Added**: `app/components/ImageModal.tsx` - A modal component for displaying images in full-screen view
- **Added**: `app/components/ImageModalEnhancer.tsx` - Wrapper component that adds click-to-zoom functionality to all images in blog posts
- **Integration**: Images in blog posts now have a zoom-in cursor and can be clicked to view in a modal overlay
- **Features**: ESC key support, click outside to close, responsive design

#### **Blog Post List Styling**
- **Modified**: `app/components/posts.tsx` - Enhanced the blog post feed
- **Changes**: 
  - Added `limit` prop support for displaying only recent posts on homepage
  - Improved spacing and layout between dates and titles
  - Better responsive design with flexbox layout

#### **Blockquote Styling**
- **Modified**: `app/global.css` - Enhanced blockquote appearance
- **Changes**: Added consistent padding, background color, and border styling for better visual hierarchy

### 📄 **New Pages & Content**

#### **About Page**
- **Added**: `app/about/page.tsx` - Complete personal bio page with professional background, writing experience, and personal information

#### **Contact Page**
- **Added**: `app/contact/page.tsx` - Contact form integrated with Basin (usebasin.com)
- **Features**: 
  - Name, email, and message fields
  - Form validation
  - Responsive design matching site theme
  - Integration with external form handling service

#### **Navigation Updates**
- **Modified**: `app/components/nav.tsx` - Added "about" and "contact" links to main navigation

### 🔧 **Technical Enhancements**

#### **Custom Components**
- **Added**: `app/components/YouTube.tsx` - YouTube video embed component with responsive design
- **Features**: 16:9 aspect ratio, responsive sizing, proper `iframe` attributes

#### **SEO & Metadata**
- **Modified**: `app/layout.tsx` - Updated metadata with custom site information
- **Added**: Custom favicon and icon set in `app/icons/` directory
- **Modified**: `app/sitemap.ts` - Updated base URL to `https://ericdodds.com`
- **Modified**: `app/og/route.tsx` - Updated default title for Open Graph images

#### **Content Management**
- **Modified**: `app/blog/utils.ts` - Enhanced post filtering to handle draft and published states
- **Added**: Support for footnotes and advanced markdown features

### 📦 **Dependencies & Configuration**

#### **Added Dependencies**
- `@vercel/analytics` - Site analytics
- `@vercel/speed-insights` - Performance monitoring
- `next-mdx-remote` - MDX content processing
- `remark-footnotes` - Footnote support
- `remark-gfm` - GitHub Flavored Markdown
- `sugar-high` - Syntax highlighting

#### **Migration Scripts** (now removed)
- WordPress content migration tools
- Link fixing utilities
- Content analysis scripts

### 🎨 **Styling & Design**

#### **CSS Enhancements**
- **Modified**: `app/global.css` - Enhanced typography and spacing
- **Added**: Custom blockquote styling
- **Added**: Improved image spacing and layout
- **Added**: Better link styling and hover effects

### 📊 **Analytics & Performance**

#### **Performance Monitoring**
- **Added**: Vercel Analytics integration
- **Added**: Speed Insights for performance tracking

### 🔗 **External Integrations**

#### **Form Handling**
- **Integrated**: Basin (usebasin.com) for contact form submissions
- **Features**: Spam protection, email notifications, form analytics

