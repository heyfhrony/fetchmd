# FetchMD

A web application that fetches the main content of any public webpage and displays it as clean Markdown.

## Features

- 🌐 Fetch content from any public URL
- 📄 Extract main article content using Mozilla's Readability
- ✨ Convert HTML to clean Markdown
- 👀 Preview rendered Markdown
- 📋 Copy Markdown to clipboard
- 🎨 Clean, modern UI

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. Enter a URL of a public webpage (e.g., a blog post, article, or documentation page)
2. Click "Fetch & Convert" or press Enter
3. View the extracted content in three ways:
   - **Preview**: Rendered Markdown
   - **Markdown**: Raw Markdown source (with copy button)
   - **Raw HTML**: Original Markdown text

## Technologies

- **Backend**: Node.js + Express
- **Content Extraction**: @mozilla/readability
- **HTML Parsing**: jsdom
- **HTML to Markdown**: Turndown
- **Markdown Preview**: marked.js
- **Frontend**: Vanilla JavaScript

## API Endpoint

### POST `/api/fetch`

Fetches and converts a webpage to Markdown.

**Request Body:**
```json
{
  "url": "https://example.com/article"
}
```

**Response:**
```json
{
  "title": "Article Title",
  "byline": "Author Name",
  "excerpt": "Brief excerpt...",
  "markdown": "# Article Title\n\n...",
  "length": 1234,
  "url": "https://example.com/article"
}
```

## Notes

- Only works with publicly accessible webpages
- Some websites may block requests or have complex JavaScript-rendered content
- Best results with articles, blog posts, and documentation pages

## License

MIT
