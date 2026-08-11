// ============================================================
// InstaRadar - UI Logic (now loads core.js dynamically)
// ============================================================

// --- State ---
let blockCounter = 0;
let totalBlocked = 12400;
let logEntries = [];
let autoScanInterval = null;
let trackedUser = null;
let coreCode = '';

// --- DOM refs ---
const codeSnippet = document.getElementById('codeSnippet');
const copyBtn = document.getElementById('copyBtn');
const injectBtn = document.getElementById('injectBtn');
const exportBtn = document.getElementById('exportBtn');
const stealthToggle = document.getElementById('stealthToggle');
const toggleStatus = document.getElementById('toggleStatus');
const statusIndicator = document.getElementById('statusIndicator');
const themeBtn = document.getElementById('themeToggle');
const viewCountEl = document.getElementById('viewCount');
const totalBlockedEl = document.getElementById('totalBlocked');
const logContainer = document.getElementById('logContainer');
const logCount = document.getElementById('logCount');
const targetInput = document.getElementById('targetInput');
const trackBtn = document.getElementById('trackBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// --- Load core.js ---
async function loadCoreCode() {
    try {
        const response = await fetch('core.js');
        if (!response.ok) throw new Error('Failed to load core.js');
        coreCode = await response.text();
        codeSnippet.textContent = coreCode.trim();
        console.log('📡 [InstaRadar] Core loaded successfully');
    } catch (e) {
        console.error('Failed to load core.js:', e);
        codeSnippet.textContent = '// Error: Could not load core.js\n// Please ensure core.js is in the same folder.';
    }
}

// --- Load from localStorage ---
function loadState() {
    try {
        const saved = localStorage.getItem('instaradar_state');
        if (saved) {
            const state = JSON.parse(saved);
            blockCounter = state.blockCounter || 0;
            totalBlocked = state.totalBlocked || 12400;
            logEntries = state.logEntries || [];
            if (state.darkMode === false) {
                document.body.classList.add('light');
                themeBtn.textContent = '☀️';
            }
            if (state.stealth === false) {
                stealthToggle.checked = false;
                toggleStatus.textContent = 'OFF';
                toggleStatus.style.color = '#ff6b6b';
                statusIndicator.textContent = '● Stealth mode OFF';
                statusIndicator.style.color = '#ff6b6b';
            }
            if (state.trackedUser) {
                trackedUser = state.trackedUser;
                targetInput.placeholder = `🎯 Tracking @${trackedUser}...`;
                statusIndicator.textContent = `● Tracking @${trackedUser}`;
            }
            viewCountEl.textContent = blockCounter;
            totalBlockedEl.textContent = formatNumber(totalBlocked);
            renderLogs();
        }
    } catch (e) { /* ignore */ }
}

function saveState() {
    try {
        localStorage.setItem('instaradar_state', JSON.stringify({
            blockCounter,
            totalBlocked,
            logEntries: logEntries.slice(-200),
            darkMode: !document.body.classList.contains('light'),
            stealth: stealthToggle.checked,
            trackedUser: trackedUser
        }));
    } catch (e) { /* ignore */ }
}

// --- Helpers ---
function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

function getTimestamp() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
}

function fakeUsername() {
    const names = ['jessica_m', 'mike.t', 'sarah_k', 'alex_r', 'emma.w', 'chris.p', 'lily.a', 'jake.d', 'zara.l', 'noah.b'];
    return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 99);
}

// --- Logging ---
function addLog(eventType, detail = '') {
    const time = getTimestamp();
    const user = trackedUser || fakeUsername();
    const entry = {
        time,
        event: eventType,
        user: detail || user,
        full: `[${time}] 📡 ${eventType} from @${detail || user}`
    };
    logEntries.unshift(entry);
    if (logEntries.length > 200) logEntries.pop();
    renderLogs();
    saveState();
}

function renderLogs() {
    if (logEntries.length === 0) {
        logContainer.innerHTML = `<div class="log-entry" style="color:#495670;border-bottom:none;">📡 Radar active — waiting for activity...</div>`;
        logCount.textContent = '(0 events)';
        return;
    }
    logContainer.innerHTML = logEntries.map(e =>
        `<div class="log-entry"><span class="time">[${e.time}]</span> <span class="event">${e.event}</span> from @<span class="user">${e.user}</span></div>`
    ).join('');
    logCount.textContent = `(${logEntries.length} events)`;
    logContainer.scrollTop = 0;
}

function clearLogs() {
    logEntries = [];
    renderLogs();
    saveState();
    console.log('🗑️ [InstaRadar] Logs cleared.');
}

// --- Simulate a blocked view ---
function simulateBlock() {
    if (!stealthToggle.checked) return;

    blockCounter++;
    totalBlocked++;
    viewCountEl.textContent = blockCounter;
    totalBlockedEl.textContent = formatNumber(totalBlocked);

    const user = trackedUser || fakeUsername();
    addLog('Blocked story view', user);
    statusIndicator.textContent = `● ${blockCounter} blocked this session`;
    statusIndicator.style.color = '#ffcc33';
    saveState();
}

// --- Auto-scan ---
function startAutoScan() {
    if (autoScanInterval) clearInterval(autoScanInterval);
    autoScanInterval = setInterval(() => {
        if (stealthToggle.checked && Math.random() < 0.8) {
            simulateBlock();
        }
    }, 3000 + Math.random() * 3000);
}

function stopAutoScan() {
    if (autoScanInterval) {
        clearInterval(autoScanInterval);
        autoScanInterval = null;
    }
}

// --- Copy button ---
copyBtn.addEventListener('click', async () => {
    if (!coreCode) {
        alert('Loading core.js... please wait.');
        return;
    }
    try {
        await navigator.clipboard.writeText(coreCode.trim());
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

// --- Inject button ---
injectBtn.addEventListener('click', () => {
    if (!coreCode) {
        alert('Loading core.js... please wait.');
        return;
    }
    console.clear();
    console.log('📡 [InstaRadar] Injecting interceptor...');
    try {
        const script = document.createElement('script');
        script.textContent = coreCode;
        document.head.appendChild(script);
        document.head.removeChild(script);
        console.log('✅ [InstaRadar] Injection successful!');
        addLog('Interceptor injected', 'system');
        injectBtn.textContent = '✅ Injected!';
        setTimeout(() => {
            injectBtn.textContent = '▶ Inject Now (Simulate)';
        }, 2000);
        setTimeout(simulateBlock, 500);
    } catch (e) {
        console.error('Injection failed:', e);
        addLog('Injection failed', 'error');
    }
});

// --- Export logs ---
exportBtn.addEventListener('click', () => {
    const data = {
        tool: 'InstaRadar',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        totalBlocked: totalBlocked,
        sessionBlocked: blockCounter,
        logs: logEntries.slice(0, 100),
        trackedUser: trackedUser
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instaradar_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Exported logs', 'system');
});

// --- Track user ---
trackBtn.addEventListener('click', () => {
    const username = targetInput.value.trim();
    if (!username) {
        alert('Please enter an Instagram username.');
        return;
    }
    trackedUser = username;
    addLog(`🔍 Now tracking @${username}`, username);
    targetInput.value = '';
    targetInput.placeholder = `🎯 Tracking @${username}...`;
    statusIndicator.textContent = `● Tracking @${username}`;
    saveState();
});

// --- Clear logs ---
clearLogsBtn.addEventListener('click', () => {
    if (logEntries.length === 0) return;
    if (confirm('Clear all activity logs?')) {
        clearLogs();
    }
});

// --- Stealth toggle ---
stealthToggle.addEventListener('change', () => {
    if (stealthToggle.checked) {
        toggleStatus.textContent = 'ACTIVE';
        toggleStatus.style.color = '#ffcc33';
        statusIndicator.textContent = trackedUser ? `● Tracking @${trackedUser}` : '● Stealth mode ON';
        statusIndicator.style.color = '#ffcc33';
        startAutoScan();
        addLog('Stealth mode activated', 'system');
    } else {
        toggleStatus.textContent = 'OFF';
        toggleStatus.style.color = '#ff6b6b';
        statusIndicator.textContent = '● Stealth mode OFF (visible)';
        statusIndicator.style.color = '#ff6b6b';
        stopAutoScan();
        addLog('Stealth mode deactivated', 'system');
    }
    saveState();
});

// --- Theme toggle ---
let darkMode = true;
themeBtn.addEventListener('click', () => {
    darkMode = !darkMode;
    document.body.classList.toggle('light', !darkMode);
    themeBtn.textContent = darkMode ? '🌙' : '☀️';
    addLog(`Switched to ${darkMode ? 'dark' : 'light'} mode`, 'system');
    saveState();
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    switch (key) {
        case 'i':
            injectBtn.click();
            e.preventDefault();
            break;
        case 's':
            stealthToggle.checked = !stealthToggle.checked;
            stealthToggle.dispatchEvent(new Event('change'));
            e.preventDefault();
            break;
        case 'd':
            themeBtn.click();
            e.preventDefault();
            break;
        case 'c':
            clearLogsBtn.click();
            e.preventDefault();
            break;
    }
});

// --- Browser detection ---
const ua = navigator.userAgent;
let browser = 'Browser';
if (/Chrome/.test(ua) && /Google Inc/.test(navigator.vendor)) browser = 'Chrome';
else if (/Firefox/.test(ua)) browser = 'Firefox';
else if (/Edg/.test(ua)) browser = 'Edge';
statusIndicator.textContent = `● ${browser} detected — ready`;

// --- GitHub link ---
document.getElementById('githubLink').addEventListener('click', (e) => {
    e.preventDefault();
    alert('⭐ Star this project on GitHub: https://github.com/yourusername/InstaRadar');
});

// --- Easter egg: double-click title resets counter ---
document.querySelector('h1').addEventListener('dblclick', () => {
    blockCounter = 0;
    viewCountEl.textContent = '0';
    addLog('Counter reset', 'system');
    saveState();
});

// --- Init ---
loadCoreCode().then(() => {
    loadState();
    if (stealthToggle.checked) {
        startAutoScan();
        setTimeout(() => addLog('Radar scanning started', 'system'), 1000);
    }
    setTimeout(() => addLog('InstaRadar v2.0 ready', 'system'), 500);
    console.log('📡 InstaRadar v2.0 loaded!');
    console.log('⌨️  Shortcuts: I=Inject, S=Stealth, D=Dark, C=Clear logs');
    console.log('💡 Double-click the title to reset counter.');
});
