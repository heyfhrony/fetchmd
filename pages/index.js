import { useState, useEffect } from 'react';
import Head from 'next/head';
import { marked } from 'marked';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('markdown');
  const [currentMarkdown, setCurrentMarkdown] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Cleanup speech on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    // Stop speech when visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden && isSpeaking) {
        stopSpeaking();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSpeaking]);

  const fetchContent = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    stopSpeaking();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch content');
      }

      setResult(data);
      setCurrentMarkdown(data.markdown);
      setActiveTab('markdown');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      const btn = document.getElementById('copyBtn');
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Copy';
        btn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const startSpeaking = () => {
    if (!currentMarkdown) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentMarkdown);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      stopSpeaking();
    };

    utterance.onerror = () => {
      stopSpeaking();
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeaking = () => {
    if (!isSpeaking || isPaused) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeaking = () => {
    if (!isSpeaking || !isPaused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchContent();
    }
  };

  return (
    <>
      <Head>
        <title>FetchMD - Convert Webpages to Markdown</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={`main-content ${result ? 'has-result' : ''}`}>
        <div className="left-panel">
          <header>
            <h1>FetchMD</h1>
            <p>Convert any webpage to clean Markdown</p>
          </header>

          <div className="input-section">
            <div id="inputInfo" className={result ? 'compact' : ''}>
              <label htmlFor="urlInput">Enter URL</label>
              <p className="guide">Paste any public webpage URL to extract its main content as Markdown</p>
            </div>

            <input
              type="text"
              id="urlInput"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://example.com/article"
              className={result ? 'compact' : ''}
            />

            {error && <div className="error">{error}</div>}

            <button onClick={fetchContent} disabled={loading} className={result ? 'compact' : ''}>
              {loading ? 'Fetching...' : 'Fetch & Convert'}
            </button>
          </div>

          {result && isSpeaking && (
            <div id="simpleAudioControls">
              <div className="audio-status">{isPaused ? '⏸ Paused' : '🔊 Playing...'}</div>
              <div className="audio-buttons">
                <button onClick={isPaused ? resumeSpeaking : pauseSpeaking}>
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button onClick={stopSpeaking}>⏹ Stop</button>
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className="right-panel">
            <div id="result">
              <div className="result-header">
                <h2 id="articleTitle">{result.title || 'Untitled'}</h2>
                {result.byline && <p className="byline">{result.byline}</p>}
                {result.length && <p className="length">{result.length} characters</p>}
              </div>

              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'markdown' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('markdown');
                    if (activeTab !== 'markdown' && isSpeaking) stopSpeaking();
                  }}
                >
                  Markdown
                </button>
                <button
                  className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('preview');
                    if (isSpeaking) stopSpeaking();
                  }}
                >
                  Preview
                </button>
              </div>

              <div className="tab-content">
                <div className={`tab-pane ${activeTab === 'markdown' ? 'active' : ''}`}>
                  <div className="markdown-actions">
                    <button id="copyBtn" onClick={copyToClipboard}>📋 Copy</button>
                    <button onClick={isSpeaking ? stopSpeaking : startSpeaking} className={isSpeaking ? 'active' : ''}>
                      {isSpeaking ? '🔊 Listening...' : '🔊 Listen'}
                    </button>
                  </div>
                  <pre><code id="markdownCode">{currentMarkdown}</code></pre>
                </div>

                <div className={`tab-pane ${activeTab === 'preview' ? 'active' : ''}`}>
                  <div
                    id="preview"
                    className="preview-content"
                    dangerouslySetInnerHTML={{ __html: marked.parse(currentMarkdown) }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fff;
          color: #000;
        }

        .main-content {
          display: flex;
          min-height: 100vh;
          justify-content: center;
          align-items: center;
        }

        .main-content.has-result {
          justify-content: flex-start;
          align-items: stretch;
        }

        .left-panel {
          width: 100%;
          max-width: 500px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .main-content.has-result .left-panel {
          width: 400px;
          max-width: 400px;
          border-right: 1px solid #000;
        }

        header h1 {
          font-size: 32px;
          margin-bottom: 8px;
        }

        header p {
          font-size: 14px;
          opacity: 0.7;
        }

        .input-section {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        #inputInfo {
          transition: all 0.3s ease;
        }

        #inputInfo.compact label {
          font-size: 14px;
        }

        #inputInfo.compact .guide {
          font-size: 11px;
        }

        #inputInfo label {
          font-weight: 600;
          font-size: 16px;
          display: block;
          margin-bottom: 8px;
        }

        .guide {
          font-size: 13px;
          opacity: 0.6;
          line-height: 1.4;
        }

        input[type="text"] {
          padding: 16px;
          border: 2px solid #000;
          font-size: 16px;
          width: 100%;
          transition: all 0.3s ease;
        }

        input[type="text"].compact {
          padding: 12px;
          font-size: 14px;
        }

        input[type="text"]:focus {
          outline: none;
          border-color: #000;
        }

        .error {
          padding: 12px;
          background: #fff;
          border-left: 3px solid #000;
          font-size: 13px;
        }

        button {
          padding: 16px 24px;
          background: #000;
          color: #fff;
          border: none;
          font-size: 16px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        button.compact {
          padding: 12px 20px;
          font-size: 14px;
        }

        button:hover {
          opacity: 0.8;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        #simpleAudioControls {
          padding: 20px;
          border: 1px solid #000;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .audio-status {
          font-size: 14px;
          font-weight: 600;
        }

        .audio-buttons {
          display: flex;
          gap: 10px;
        }

        .audio-buttons button {
          flex: 1;
          padding: 12px;
          font-size: 14px;
        }

        .right-panel {
          flex: 1;
          padding: 40px;
          overflow-y: auto;
          display: block;
        }

        #result {
          max-width: 900px;
        }

        .result-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #000;
        }

        .result-header h2 {
          font-size: 28px;
          margin-bottom: 12px;
        }

        .byline {
          font-size: 14px;
          opacity: 0.7;
          margin-bottom: 8px;
        }

        .length {
          font-size: 12px;
          opacity: 0.5;
        }

        .tabs {
          display: flex;
          gap: 0;
          border-bottom: 2px solid #000;
          margin-bottom: 20px;
        }

        .tab {
          background: none;
          color: #000;
          border: none;
          padding: 12px 24px;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          opacity: 0.5;
        }

        .tab.active {
          border-bottom-color: #000;
          opacity: 1;
          font-weight: 600;
        }

        .tab-content {
          position: relative;
        }

        .tab-pane {
          display: none;
        }

        .tab-pane.active {
          display: block;
        }

        .markdown-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .markdown-actions button {
          padding: 10px 16px;
          font-size: 14px;
        }

        .markdown-actions button.active {
          background: #333;
        }

        .markdown-actions button.copied {
          background: #000;
        }

        pre {
          background: #f5f5f5;
          padding: 20px;
          overflow-x: auto;
          border: 1px solid #000;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        code {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
        }

        .preview-content {
          line-height: 1.8;
          font-size: 16px;
        }

        .preview-content h1 { font-size: 32px; margin: 24px 0 16px; }
        .preview-content h2 { font-size: 28px; margin: 20px 0 12px; }
        .preview-content h3 { font-size: 24px; margin: 16px 0 12px; }
        .preview-content p { margin: 12px 0; }
        .preview-content ul, .preview-content ol { margin: 12px 0; padding-left: 24px; }
        .preview-content li { margin: 8px 0; }
        .preview-content a { color: #000; text-decoration: underline; }
        .preview-content code { background: #f5f5f5; padding: 2px 6px; border: 1px solid #ddd; }
        .preview-content pre { background: #f5f5f5; padding: 16px; border: 1px solid #000; overflow-x: auto; }
        .preview-content img { max-width: 100%; height: auto; }

        .hidden {
          display: none;
        }

        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
          }

          .left-panel {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #000;
          }

          .right-panel {
            padding: 20px;
          }
        }
      `}</style>
    </>
  );
}
