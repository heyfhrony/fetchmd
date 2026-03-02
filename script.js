const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const result = document.getElementById('result');
const articleTitle = document.getElementById('articleTitle');
const byline = document.getElementById('byline');
const length = document.getElementById('length');
const preview = document.getElementById('preview');
const markdownCode = document.getElementById('markdownCode');
const copyBtn = document.getElementById('copyBtn');
const listenBtn = document.getElementById('listenBtn');
const container = document.querySelector('.container');
const inputInfo = document.getElementById('inputInfo');

let currentMarkdown = '';
let isSpeaking = false;
let isPaused = false;

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Stop audio when switching away from markdown tab
        if (tabName !== 'markdown' && isSpeaking) {
            stopSpeaking();
        }

        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active pane
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
    });
});

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(currentMarkdown);
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyBtn.textContent = '📋 Copy';
            copyBtn.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
});

// Audio control elements
const simpleAudioControls = document.getElementById('simpleAudioControls');
const stopAudioBtn = document.getElementById('stopAudioBtn');
const pauseResumeBtn = document.getElementById('pauseResumeBtn');
const audioStatusText = document.getElementById('audioStatusText');

// Listen button
listenBtn.addEventListener('click', () => {
    if (isSpeaking) {
        stopSpeaking();
    } else {
        startSpeaking();
    }
});

// Pause/Resume button
pauseResumeBtn.addEventListener('click', () => {
    if (isPaused) {
        resumeSpeaking();
    } else {
        pauseSpeaking();
    }
});

// Stop button
stopAudioBtn.addEventListener('click', () => {
    stopSpeaking();
});

function startSpeaking() {
    if (!currentMarkdown) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(currentMarkdown);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
        isSpeaking = true;
        isPaused = false;
        simpleAudioControls.classList.remove('hidden');
        listenBtn.textContent = '🔊 Listening...';
        listenBtn.classList.add('active');
        audioStatusText.textContent = '🔊 Playing...';
        pauseResumeBtn.textContent = '⏸ Pause';
    };

    utterance.onend = () => {
        stopSpeaking();
    };

    utterance.onerror = (event) => {
        console.error('Speech error:', event);
        stopSpeaking();
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
}

function pauseSpeaking() {
    if (!isSpeaking || isPaused) return;

    window.speechSynthesis.pause();
    isPaused = true;
    audioStatusText.textContent = '⏸ Paused';
    pauseResumeBtn.textContent = '▶ Resume';
}

function resumeSpeaking() {
    if (!isSpeaking || !isPaused) return;

    window.speechSynthesis.resume();
    isPaused = false;
    audioStatusText.textContent = '🔊 Playing...';
    pauseResumeBtn.textContent = '⏸ Pause';
}

function stopSpeaking() {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    isPaused = false;
    simpleAudioControls.classList.add('hidden');
    listenBtn.textContent = '🔊 Listen';
    listenBtn.classList.remove('active');
}

// Fetch button click
fetchBtn.addEventListener('click', fetchContent);

// Enter key in input
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchContent();
    }
});

// Stop speech when page unloads (refresh or close)
window.addEventListener('beforeunload', () => {
    stopSpeaking();
});

// Stop speech when visibility changes (tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isSpeaking) {
        stopSpeaking();
    }
});

async function fetchContent() {
    const url = urlInput.value.trim();

    if (!url) {
        showError('Please enter a URL');
        return;
    }

    // Stop any ongoing speech
    stopSpeaking();

    // Reset UI
    hideError();
    hideResult();
    showLoading();

    try {
        const response = await fetch('/api/fetch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch content');
        }

        displayResult(data);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function displayResult(data) {
    currentMarkdown = data.markdown;

    // Set title
    articleTitle.textContent = data.title || 'Untitled';

    // Set metadata
    byline.textContent = data.byline || '';
    length.textContent = data.length ? `${data.length} characters` : '';

    // Render markdown preview
    preview.innerHTML = marked.parse(data.markdown);

    // Set markdown code
    markdownCode.textContent = data.markdown;

    // Show result
    showResult();

    // Reset to markdown tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector('.tab[data-tab="markdown"]').classList.add('active');
    document.getElementById('markdown').classList.add('active');
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
}

function hideError() {
    error.classList.add('hidden');
}

function showResult() {
    result.classList.remove('hidden');
    container.classList.add('has-results');
}

function hideResult() {
    result.classList.add('hidden');
    container.classList.remove('has-results');
}
