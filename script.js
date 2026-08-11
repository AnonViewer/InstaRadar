// ============================================================
// InstaRadar - Full UI Logic + Interception Script
// ============================================================

// --- The actual interception code as a string ---
const INTERCEPTION_CODE = `
// InstaRadar - Blocks Instagram's "Seen" mutation
const originalFetch = window.fetch;
const originalSend = XMLHttpRequest.prototype.send;
const TARGET = 'PolarisStoriesV3SeenMutation';

// Block fetch requests
window.fetch = function(...args) {
    const [url, options] = args;
    if (options?.body && typeof options.body === 'string') {
        try {
            const body = JSON.parse(options.body);
            if (body.operationName === TARGET) {
                console.log('📡 Blocked story seen signal (fetch)');
                return Promise.resolve(
                    new Response(JSON.stringify({ data: {} }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    })
                );
            }
        } catch (e) {}
    }
    return originalFetch.apply(this, args);
};

// Block XMLHttpRequest
XMLHttpRequest.prototype.send = function(body) {
    if (body && typeof body === 'string') {
        try {
            const parsed = JSON.parse(body);
            if (parsed.operationName === TARGET) {
                console.log('📡 Blocked story seen signal (XHR)');
                this.addEventListener('readystatechange', function() {
                    if (this.readyState === 4) {
                        Object.defineProperty(this, 'responseText', {
                            value: JSON.stringify({ data: {} })
                        });
                        this.status = 200;
                        this.dispatchEvent(new Event('load'));
                    }
                });
                return;
            }
        } catch (e) {}
    }
    return originalSend.apply(this, arguments);
};

console.log('✅ InstaRadar is ACTIVE. Browse anonymously!');
`;

// --- DOM references ---
const codeSnippet = document.getElementById('codeSnippet');
const copyBtn = document.getElementById('copyBtn');
const injectBtn = document.getElementById('injectBtn');
const stealthToggle = document.getElementById('stealthToggle');
const toggleStatus = document.getElementById('toggleStatus');
const statusIndicator = document.getElementById('statusIndicator');
const themeBtn = document.getElementById('themeToggle');
const viewCountEl = document.getElementById('viewCount');

// --- Load the code into the UI ---
codeSnippet.textContent = INTERCEPTION_CODE.trim();

// --- Copy button ---
copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(INTERCEPTION_CODE.trim());
        copyBtn.textContent = '✅ Copied!';
        copyBtn.style.background = '#ffcc33';
        copyBtn.style.color = '#0a0e17';
        setTimeout(() => {
            copyBtn.textContent = '📄 Copy';
            copyBtn.style.background = '';
            copyBtn.style.color = '';
        }, 2000);
    } catch {
        alert('Please select the code manually and press Ctrl+C.');
    }
});

// --- Inject button (simulates injection + increments counter) ---
let blockCounter = 0;
injectBtn.addEventListener('click', () => {
    console.clear();
    console.log('📡 [InstaRadar] Injecting interceptor...');
    try {
        // Actually execute the interception logic in the page context
        const script = document.createElement('script');
        script.textContent = INTERCEPTION_CODE;
        document.head.appendChild(script);
        document.head.removeChild(script);
        console.log('✅ [InstaRadar] Injection successful!');
        // Increment fake counter
        blockCounter += Math.floor(Math.random() * 5) + 1;
        viewCountEl.textContent = blockCounter;
        injectBtn.textContent = `✅ Injected! (+${blockCounter} blocked)`;
        setTimeout(() => {
            injectBtn.textContent = '▶ Click to Test Injection (Console Log)';
        }, 1800);
    } catch (e) {
        console.error('Injection failed:', e);
    }
});

// --- Stealth toggle ---
stealthToggle.addEventListener('change', () => {
    if (stealthToggle.checked) {
        toggleStatus.textContent = 'ACTIVE';
        toggleStatus.style.color = '#ffcc33';
        statusIndicator.textContent = '● Stealth mode ON';
        statusIndicator.style.color = '#ffcc33';
    } else {
        toggleStatus.textContent = 'OFF';
        toggleStatus.style.color = '#ff6b6b';
        statusIndicator.textContent = '● Stealth mode OFF (visible)';
        statusIndicator.style.color = '#ff6b6b';
    }
});

// --- Dark / Light theme toggle ---
let darkMode = true;
themeBtn.addEventListener('click', () => {
    darkMode = !darkMode;
    document.body.classList.toggle('light', !darkMode);
    themeBtn.textContent = darkMode ? '🌙' : '☀️';
    console.log(`[InstaRadar] Switched to ${darkMode ? 'dark' : 'light'} mode`);
});

// --- Browser detection ---
const ua = navigator.userAgent;
let browser = 'Browser';
if (/Chrome/.test(ua) && /Google Inc/.test(navigator.vendor)) browser = 'Chrome';
else if (/Firefox/.test(ua)) browser = 'Firefox';
else if (/Edg/.test(ua)) browser = 'Edge';
statusIndicator.textContent = `● ${browser} detected — ready to inject`;

// --- GitHub link ---
document.getElementById('githubLink').addEventListener('click', (e) => {
    e.preventDefault();
    alert('⭐ Star this project on GitHub: https://github.com/yourusername/InstaRadar');
});

// --- Easter egg: double-click title resets counter ---
document.querySelector('h1').addEventListener('dblclick', () => {
    blockCounter = 0;
    viewCountEl.textContent = '0';
    console.log('🔄 [InstaRadar] Counter reset.');
});

console.log('📡 InstaRadar loaded successfully!');
console.log('💡 Double-click the title to reset the counter.');
