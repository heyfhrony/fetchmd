const axios = require('axios');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  bulletListMarker: '-',
  preformattedCode: true
});

// Add custom rules to preserve more content
turndownService.addRule('preserveImages', {
  filter: 'img',
  replacement: function(content, node) {
    const alt = node.alt || '';
    const src = node.src || '';
    const title = node.title || '';
    return src ? `![${alt}](${src}${title ? ` "${title}"` : ''})` : '';
  }
});

// Preserve div content that might have important text
turndownService.addRule('preserveDivs', {
  filter: function(node) {
    return node.nodeName === 'DIV' && node.textContent.trim().length > 0;
  },
  replacement: function(content) {
    return content + '\n\n';
  }
});

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    let validUrl;
    try {
      validUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FetchMD/1.0)'
      },
      timeout: 10000
    });

    // Parse with JSDOM
    const dom = new JSDOM(response.data, { url });
    const doc = dom.window.document;

    // Strategy 1: Try common article selectors first
    const articleSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.content',
      '.post-body',
      '#content',
      '.main-content'
    ];

    let htmlContent = null;
    let title = null;
    let byline = null;
    let excerpt = null;
    let textLength = 0;

    // Try to find the main content using CSS selectors
    for (const selector of articleSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const text = element.textContent || '';
        if (text.trim().length > textLength) {
          htmlContent = element.innerHTML;
          textLength = text.trim().length;
        }
      }
    }

    // Special handling for Elementor and other page builders
    const contentBlockSelectors = [
      '.elementor-widget-text-editor .elementor-widget-container',
      '.blog-body-text',
      '.wp-block-post-content > *',
      '.entry-content > *'
    ];

    for (const selector of contentBlockSelectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        let combinedHtml = '';
        let combinedText = '';

        elements.forEach(el => {
          const elHtml = el.innerHTML || '';
          const elText = el.textContent || '';

          if (elText.trim().length > 20) {
            combinedHtml += elHtml + '\n\n';
            combinedText += elText;
          }
        });

        if (combinedText.trim().length > textLength) {
          htmlContent = combinedHtml;
          textLength = combinedText.trim().length;
        }
      }
    }

    // Strategy 2: Use Readability as fallback
    try {
      const documentClone = doc.cloneNode(true);
      const reader = new Readability(documentClone, {
        charThreshold: 25,
        keepClasses: true,
        nbTopCandidates: 10
      });
      const article = reader.parse();

      if (article) {
        title = article.title;
        byline = article.byline;
        excerpt = article.excerpt;

        const readabilityLength = (article.textContent || '').trim().length;
        if (readabilityLength > textLength || !htmlContent) {
          htmlContent = article.content;
          textLength = readabilityLength;
        }
      }
    } catch (e) {
      console.error('Readability parsing failed:', e.message);
    }

    // Fallback
    if (!htmlContent) {
      const body = doc.querySelector('body');
      if (body) {
        htmlContent = body.innerHTML;
      } else {
        return res.status(400).json({
          error: 'Could not extract readable content from this page'
        });
      }
    }

    // Get title if not found
    if (!title) {
      const titleElement = doc.querySelector('title, h1');
      if (titleElement) {
        title = titleElement.textContent.trim();
      }
    }

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(htmlContent);

    res.json({
      title: title,
      byline: byline,
      excerpt: excerpt,
      markdown: markdown,
      length: textLength,
      url: url
    });

  } catch (error) {
    console.error('Error fetching URL:', error.message);

    if (error.code === 'ENOTFOUND') {
      return res.status(404).json({ error: 'URL not found' });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({ error: 'Request timeout' });
    }

    res.status(500).json({
      error: 'Failed to fetch content',
      details: error.message
    });
  }
};
