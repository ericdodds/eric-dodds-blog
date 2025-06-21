# Eric Dodds Weblog

This is my personal website. I ran it on WordPress for years, then finally bit the bullet and migrated it into a super snappy Next.js app on Vercel. 

## Migration from WordPress

I'll write a full blog post about the process, but the short version is that I used Cursor to do the entire migration. What would have taken an eternity was a weekend project, even with some nasty edge cases. 

## If you want to clone my site

I used the [Vercel Portfolio Blog Starter](https://github.com/vercel/examples/tree/main/solutions/blog) template and made some very light modifications to the template: 
- Formatting of the blog post feed list 
    - Specifically, I made the container a bit wider and cleaned up the spacing between the dates and the post titles in the list 
- I added image modal/zoom functionality so that users can view image files at a larger size

Other than that, I was pretty careful not to do anything weird or add any extra dependencies to keep the baseline Next.js app super clean. 

You should be able to clone this repo, follow the original instructions for building the app, and be up and running. 

