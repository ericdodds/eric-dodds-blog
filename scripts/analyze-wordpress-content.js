const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

function analyzeWordPressContent(wordpressXmlPath) {
  // Read WordPress export XML
  const xmlContent = fs.readFileSync(wordpressXmlPath, 'utf-8');
  
  // Parse XML
  xml2js.parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Error parsing XML:', err);
      return;
    }

    const posts = result.rss.channel[0].item || [];
    console.log(`Analyzing ${posts.length} posts for WordPress plugins and custom content...\n`);

    const pluginPatterns = {
      footnotes: {
        patterns: [
          /<sup[^>]*class="[^"]*footnote[^"]*"[^>]*>/gi,
          /<div[^>]*class="[^"]*footnotes[^"]*"[^>]*>/gi,
          /\[footnote[^\]]*\]/gi
        ],
        count: 0,
        examples: []
      },
      shortcodes: {
        patterns: [
          /\[[^\]]+\]/g,
          /<div[^>]*class="[^"]*shortcode[^"]*"[^>]*>/gi
        ],
        count: 0,
        examples: []
      },
      customClasses: {
        patterns: [
          /class="[^"]*"/gi
        ],
        count: 0,
        examples: []
      },
      tables: {
        patterns: [
          /<table[^>]*>/gi,
          /<tr[^>]*>/gi,
          /<td[^>]*>/gi
        ],
        count: 0,
        examples: []
      },
      codeBlocks: {
        patterns: [
          /<pre[^>]*>/gi,
          /<code[^>]*>/gi,
          /class="[^"]*syntax[^"]*"/gi,
          /class="[^"]*highlight[^"]*"/gi
        ],
        count: 0,
        examples: []
      },
      blockquotes: {
        patterns: [
          /<blockquote[^>]*>/gi,
          /class="[^"]*pullquote[^"]*"/gi,
          /class="[^"]*quote[^"]*"/gi
        ],
        count: 0,
        examples: []
      }
    };

    posts.forEach((post, index) => {
      if (post['wp:status'] && post['wp:status'][0] !== 'publish') {
        return;
      }

      const content = post['content:encoded'] ? post['content:encoded'][0] : '';
      const title = post.title[0];

      console.log(`\n--- Analyzing Post ${index + 1}: "${title}" ---`);

      // Check for each plugin pattern
      Object.keys(pluginPatterns).forEach(pluginType => {
        const plugin = pluginPatterns[pluginType];
        
        plugin.patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            plugin.count += matches.length;
            
            // Store unique examples
            matches.forEach(match => {
              if (!plugin.examples.includes(match) && plugin.examples.length < 5) {
                plugin.examples.push(match);
              }
            });
          }
        });
      });

      // Look for specific WordPress plugin indicators
      const pluginIndicators = [
        { name: 'Footnotes Plugin', pattern: /footnote|footnotes/gi },
        { name: 'Syntax Highlighter', pattern: /syntax|highlight|prism/gi },
        { name: 'Table Plugin', pattern: /tablepress|wp-table/gi },
        { name: 'Gallery Plugin', pattern: /gallery|slideshow/gi },
        { name: 'Shortcode Plugin', pattern: /shortcode|shortcodes/gi },
        { name: 'Custom Styling', pattern: /custom|style|format/gi }
      ];

      pluginIndicators.forEach(indicator => {
        const matches = content.match(indicator.pattern);
        if (matches && matches.length > 0) {
          console.log(`  Found ${indicator.name}: ${matches.length} instances`);
        }
      });

      // Look for custom HTML structures
      const customStructures = content.match(/<[^>]*class="[^"]*"[^>]*>/g);
      if (customStructures) {
        const uniqueClasses = new Set();
        customStructures.forEach(structure => {
          const classMatch = structure.match(/class="([^"]*)"/);
          if (classMatch) {
            classMatch[1].split(' ').forEach(className => {
              if (className && !className.match(/^(wp-|align|size|attachment)/)) {
                uniqueClasses.add(className);
              }
            });
          }
        });
        
        if (uniqueClasses.size > 0) {
          console.log(`  Custom CSS classes found: ${Array.from(uniqueClasses).join(', ')}`);
        }
      }
    });

    // Summary report
    console.log('\n\n=== MIGRATION ANALYSIS SUMMARY ===');
    console.log(`Total posts analyzed: ${posts.length}`);
    
    Object.keys(pluginPatterns).forEach(pluginType => {
      const plugin = pluginPatterns[pluginType];
      if (plugin.count > 0) {
        console.log(`\n${pluginType.toUpperCase()}:`);
        console.log(`  Total instances: ${plugin.count}`);
        console.log(`  Examples: ${plugin.examples.join(', ')}`);
      }
    });

    console.log('\n=== RECOMMENDATIONS ===');
    
    if (pluginPatterns.footnotes.count > 0) {
      console.log('✓ Footnote plugin detected - migration script includes footnote handling');
    }
    
    if (pluginPatterns.shortcodes.count > 0) {
      console.log('✓ Shortcodes detected - review and manually convert if needed');
    }
    
    if (pluginPatterns.tables.count > 0) {
      console.log('✓ Tables detected - migration script preserves table structure');
    }
    
    if (pluginPatterns.codeBlocks.count > 0) {
      console.log('✓ Code blocks detected - migration script handles syntax highlighting');
    }

    console.log('\n=== NEXT STEPS ===');
    console.log('1. Run the migration script to convert your content');
    console.log('2. Review the generated MDX files for accuracy');
    console.log('3. Manually adjust any complex plugin outputs that need special handling');
    console.log('4. Test the blog to ensure all content displays correctly');
  });
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node analyze-wordpress-content.js <wordpress-export.xml>');
    console.log('Example: node analyze-wordpress-content.js ./wordpress-export.xml');
    process.exit(1);
  }

  const [xmlPath] = args;
  
  if (!fs.existsSync(xmlPath)) {
    console.error(`Error: WordPress export file not found: ${xmlPath}`);
    process.exit(1);
  }

  analyzeWordPressContent(xmlPath);
}

module.exports = { analyzeWordPressContent }; 