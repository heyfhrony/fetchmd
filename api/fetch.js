const axios = require('axios');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');

module.exports = async (req, res) => {
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

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FetchMD/1.0)' },
      timeout: 15000,
      maxRedirects: 5
    });

    const dom = new JSDOM(response.data, { url });
    const doc = dom.window.document;

    let htmlContent = '';
    let title = '';
    let byline = null;
    let excerpt = null;

    // Try Readability first
    try {
      const reader = new Readability(doc.cloneNode(true), {
        charThreshold: 25,
        keepClasses: true
      });
      const article = reader.parse();

      if (article) {
        htmlContent = article.content;
        title = article.title;
        byline = article.byline;
        excerpt = article.excerpt;
      }
    } catch (e) {
      console.error('Readability failed:', e);
    }

    // Fallback to simple extraction
    if (!htmlContent) {
      const article = doc.querySelector('article, main, [role="main"], .content, .post-content, .entry-content');
      if (article) {
        htmlContent = article.innerHTML;
      } else {
        htmlContent = doc.body.innerHTML;
      }
    }

    // Get title if not found
    if (!title) {
      const titleEl = doc.querySelector('title, h1');
      title = titleEl ? titleEl.textContent.trim() : 'Untitled';
    }

    // Convert to markdown
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    const markdown = turndown.turndown(htmlContent);

    res.status(200).json({
      title: title,
      byline: byline,
      excerpt: excerpt,
      markdown: markdown,
      length: markdown.length,
      url: url
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch content',
      details: error.message
    });
  }
};
