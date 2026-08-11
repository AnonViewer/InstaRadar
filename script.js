// ============================================================
// InstaRadar - Full UI Logic (Advanced Version)
// ============================================================

// --- Configuration ---
const CONFIG = {
    maxLogEntries: 200,
    autoScanInterval: 3000,
    autoScanVariance: 3000,
    soundEnabled: true,
    notificationsEnabled: true,
    analyticsEnabled: true,
    retryAttempts: 3
};

// --- State ---
let blockCounter = 0;
let totalBlocked = parseInt(localStorage.getItem('instaradar_total')) || 12400;
let logEntries = JSON.parse(localStorage.getItem('instaradar_logs')) || [];
let autoScanInterval = null;
let trackedUser = localStorage.getItem('instaradar_tracked') || null;
let coreCode = '';
let injectionAttempts = 0;
let blockTimeline = JSON.parse(localStorage.getItem('instaradar_timeline')) || [];
let trackedUsers = JSON.parse(localStorage.getItem('instaradar_users')) || [];

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
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');

// --- Load core.js ---
async function loadCoreCode() {
    try {
        const response = await fetch('core.js');
        if (!response.ok) throw new Error('Failed to load core.js');
        coreCode = await response.text();
        codeSnippet.textContent = coreCode.trim();
        console.log('📡 [InstaRadar] Core loaded successfully');
        return true;
    } catch (e) {
        console.error('Failed to load core.js:', e);
        codeSnippet.textContent = '// Error: Could not load core.js\n// Please ensure core.js is in the same folder.';
        return false;
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
            blockTimeline = state.blockTimeline || [];
            trackedUsers = state.trackedUsers || [];
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
            if (state.settings) {
                Object.assign(CONFIG, state.settings);
            }
            viewCountEl.textContent = blockCounter;
            totalBlockedEl.textContent = formatNumber(totalBlocked);
            renderLogs();
            updateAnalytics();
        }
    } catch (e) { /* ignore */ }
}

function saveState() {
    try {
        localStorage.setItem('instaradar_state', JSON.stringify({
            blockCounter,
            totalBlocked,
            logEntries: logEntries.slice(-CONFIG.maxLogEntries),
            blockTimeline: blockTimeline.slice(-100),
            trackedUsers: trackedUsers.slice(-50),
            darkMode: !document.body.classList.contains('light'),
            stealth: stealthToggle.checked,
            trackedUser: trackedUser,
            settings: CONFIG
        }));
        localStorage.setItem('instaradar_total', totalBlocked.toString());
        localStorage.setItem('instaradar_logs', JSON.stringify(logEntries.slice(-CONFIG.maxLogEntries)));
        localStorage.setItem('instaradar_timeline', JSON.stringify(blockTimeline.slice(-100)));
        localStorage.setItem('instaradar_users', JSON.stringify(trackedUsers.slice(-50)));
        if (trackedUser) {
            localStorage.setItem('instaradar_tracked', trackedUser);
        }
    } catch (e) { /* ignore */ }
}

// --- Helpers ---
function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

function getTimestamp() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
}

function getFullTimestamp() {
    const d = new Date();
    return d.toISOString().replace('T', ' ').slice(0, 19);
}

function fakeUsername() {
    const names = ['jessica_m', 'mike.t', 'sarah_k', 'alex_r', 'emma.w', 'chris.p', 'lily.a', 'jake.d', 'zara.l', 'noah.b', 'olivia.c', 'ethan.j', 'mia.s', 'liam.w', 'ava.r'];
    return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 99);
}

function playSound(type = 'ping') {
    if (!CONFIG.soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = type === 'ping' ? 800 : 1200;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* ignore audio errors */ }
}

function sendNotification(title, body) {
    if (!CONFIG.notificationsEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '📡' });
    } else if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// --- Logging ---
function addLog(eventType, detail = '', silent = false) {
    const time = getTimestamp();
    const fullTime = getFullTimestamp();
    const user = trackedUser || detail || fakeUsername();

    if (eventType.includes('Blocked') && !silent) {
        playSound('ping');
        if (CONFIG.notificationsEnabled && blockCounter % 5 === 0) {
            sendNotification('📡 InstaRadar', `${blockCounter} views blocked this session!`);
        }
        // Add to timeline for analytics
        blockTimeline.push({ time: fullTime, count: 1 });
        if (blockTimeline.length > 100) blockTimeline.shift();
    }

    const entry = {
        time,
        fullTime,
        event: eventType,
        user: user,
        tracked: user === trackedUser
    };

    logEntries.unshift(entry);
    if (logEntries.length > CONFIG.maxLogEntries) logEntries.pop();

    if (!silent) {
        renderLogs();
        updateAnalytics();
        saveState();
    }
    return entry;
}

function renderLogs() {
    if (logEntries.length === 0) {
        logContainer.innerHTML = `<div class="log-entry" style="color:#495670;border-bottom:none;">📡 Radar active — waiting for activity...</div>`;
        logCount.textContent = '(0 events)';
        return;
    }

    const filtered = filterLogs(logEntries);
    const displayEntries = filtered.length > 0 ? filtered : logEntries;

    logContainer.innerHTML = displayEntries.slice(0, CONFIG.maxLogEntries).map(e => {
        const trackedTag = e.tracked ? ' 🎯' : '';
        return `<div class="log-entry">
            <span class="time">[${e.time}]</span> 
            <span class="event">${e.event}</span> 
            from @<span class="user">${e.user}${trackedTag}</span>
        </div>`;
    }).join('');

    logCount.textContent = `(${displayEntries.length} events)`;
    logContainer.scrollTop = 0;
}

function filterLogs(entries) {
    // Advanced filtering logic
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterUser = document.getElementById('filterUser')?.value?.toLowerCase() || '';

    let filtered = entries;

    if (filterType !== 'all') {
        filtered = filtered.filter(e => e.event.includes(filterType));
    }

    if (filterUser) {
        filtered = filtered.filter(e => e.user.toLowerCase().includes(filterUser));
    }

    return filtered;
}

function clearLogs() {
    logEntries = [];
    renderLogs();
    saveState();
    console.log('🗑️ [InstaRadar] Logs cleared.');
}

// --- Analytics ---
function updateAnalytics() {
    const statsEl = document.getElementById('analyticsStats');
    if (!statsEl) return;

    const total = blockTimeline.length;
    const now = Date.now();
    const hourAgo = now - 3600000;
    const recent = blockTimeline.filter(e => new Date(e.time).getTime() > hourAgo);

    const avgPerMin = total > 0 ? (total / (blockTimeline.length > 0 ? ((new Date() - new Date(blockTimeline[0].time)) / 60000) : 1)).toFixed(1) : 0;

    statsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;">
            <div style="text-align:center;background:#0d1117;padding:8px;border-radius:8px;">
                <span style="display:block;font-size:18px;color:#ffcc33;">${total}</span>
                <span style="font-size:10px;color:#495670;">Total Events</span>
            </div>
            <div style="text-align:center;background:#0d1117;padding:8px;border-radius:8px;">
                <span style="display:block;font-size:18px;color:#ffcc33;">${recent.length}</span>
                <span style="font-size:10px;color:#495670;">Last Hour</span>
            </div>
            <div style="text-align:center;background:#0d1117;padding:8px;border-radius:8px;">
                <span style="display:block;font-size:18px;color:#ffcc33;">${avgPerMin}/min</span>
                <span style="font-size:10px;color:#495670;">Avg Rate</span>
            </div>
            <div style="text-align:center;background:#0d1117;padding:8px;border-radius:8px;">
                <span style="display:block;font-size:18px;color:#ffcc33;">${trackedUsers.length}</span>
                <span style="font-size:10px;color:#495670;">Tracked Users</span>
            </div>
        </div>
    `;
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

    // Update live stats
    updateAnalytics();
    saveState();

    // Update GitHub-style contribution visual if it exists
    updateContributions();
}

// --- Contribution heatmap (GitHub style) ---
function updateContributions() {
    const grid = document.getElementById('contributionGrid');
    if (!grid) return;

    // Show last 7 days of activity
    const days = 7;
    let html = '';
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().slice(0, 10);
        const count = blockTimeline.filter(e => e.time.startsWith(dayStr)).length;
        const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4;
        const colors = ['#1e2a3a', '#2a4a2a', '#4a8a3a', '#6aba4a', '#8ada5a'];
        html += `<div style="width:20px;height:20px;background:${colors[level]};border-radius:4px;border:1px solid #0d1117;" title="${dayStr}: ${count} blocks"></div>`;
    }
    grid.innerHTML = html;
}

// --- Auto-scan ---
function startAutoScan() {
    if (autoScanInterval) clearInterval(autoScanInterval);
    autoScanInterval = setInterval(() => {
        if (stealthToggle.checked && Math.random() < 0.8) {
            simulateBlock();
        }
    }, CONFIG.autoScanInterval + Math.random() * CONFIG.autoScanVariance);
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
        addLog('Code copied to clipboard', 'system', true);
    } catch {
        alert('Please select the code manually and press Ctrl+C.');
    }
});

// --- Inject button with retry logic ---
injectBtn.addEventListener('click', async () => {
    if (!coreCode) {
        alert('Loading core.js... please wait.');
        return;
    }

    let success = false;
    injectionAttempts = 0;

    while (injectionAttempts < CONFIG.retryAttempts && !success) {
        injectionAttempts++;
        console.log(`📡 [InstaRadar] Injection attempt ${injectionAttempts}/${CONFIG.retryAttempts}...`);

        try {
            const script = document.createElement('script');
            script.textContent = coreCode;
            document.head.appendChild(script);
            document.head.removeChild(script);

            console.log('✅ [InstaRadar] Injection successful!');
            addLog('Interceptor injected', 'system');
            success = true;

            injectBtn.textContent = `✅ Injected! (${injectionAttempts} tries)`;
            setTimeout(() => {
                injectBtn.textContent = '▶ Inject Now (Simulate)';
            }, 2000);

            // Simulate a block to show it's working
            setTimeout(simulateBlock, 500);

            // Send notification
            sendNotification('📡 InstaRadar', 'Interceptor injected successfully!');

        } catch (e) {
            console.error('Injection failed:', e);
            addLog(`Injection failed (attempt ${injectionAttempts})`, 'error');

            if (injectionAttempts < CONFIG.retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                alert('❌ Injection failed after 3 attempts. Please copy the script manually.');
                addLog('Injection failed permanently', 'error');
            }
        }
    }
});

// --- Export logs (multiple formats) ---
exportBtn.addEventListener('click', () => {
    const format = document.getElementById('exportFormat')?.value || 'json';

    const data = {
        tool: 'InstaRadar',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        totalBlocked: totalBlocked,
        sessionBlocked: blockCounter,
        logs: logEntries.slice(0, 100),
        trackedUser: trackedUser,
        trackedUsers: trackedUsers,
        timeline: blockTimeline.slice(-50),
        config: CONFIG
    };

    let content, filename, mimeType;

    if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `instaradar_logs_${Date.now()}.json`;
        mimeType = 'application/json';
    } else if (format === 'csv') {
        const headers = 'Time,Event,User\n';
        const rows = logEntries.slice(0, 100).map(e =>
            `${e.fullTime},${e.event},@${e.user}`
        ).join('\n');
        content = headers + rows;
        filename = `instaradar_logs_${Date.now()}.csv`;
        mimeType = 'text/csv';
    } else {
        // HTML report
        content = `
            <!DOCTYPE html>
            <html><head><title>InstaRadar Report</title>
            <style>body{background:#0a0e17;color:#e0e6f0;font-family:sans-serif;padding:40px;}
            h1{color:#ffcc33;}table{width:100%;border-collapse:collapse;}
            td,th{padding:8px;border-bottom:1px solid #1e2a3a;}
            .time{color:#495670;}</style></head>
            <body>
                <h1>📡 InstaRadar Report</h1>
                <p>Generated: ${new Date().toISOString()}</p>
                <p>Total Blocked: ${totalBlocked} | Session: ${blockCounter}</p>
                <table>
                    <tr><th>Time</th><th>Event</th><th>User</th></tr>
                    ${logEntries.slice(0, 50).map(e =>
                        `<tr><td class="time">${e.time}</td><td>${e.event}</td><td>@${e.user}</td></tr>`
                    ).join('')}
                </table>
            </body></html>
        `;
        filename = `instaradar_report_${Date.now()}.html`;
        mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    addLog(`Exported logs (${format.toUpperCase()})`, 'system');
});

// --- Track user with history ---
trackBtn.addEventListener('click', () => {
    const username = targetInput.value.trim();
    if (!username) {
        alert('Please enter an Instagram username.');
        return;
    }

    if (trackedUser && trackedUser !== username) {
        // Save previous user to history
        if (!trackedUsers.includes(trackedUser)) {
            trackedUsers.push(trackedUser);
        }
    }

    trackedUser = username;
    addLog(`🔍 Now tracking @${username}`, username);
    targetInput.value = '';
    targetInput.placeholder = `🎯 Tracking @${username}...`;
    statusIndicator.textContent = `● Tracking @${username}`;

    if (!trackedUsers.includes(username)) {
        trackedUsers.push(username);
    }

    saveState();
    sendNotification('🎯 InstaRadar', `Now tracking @${username}`);
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
        sendNotification('📡 InstaRadar', 'Stealth mode activated');
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
    addLog(`Switched to ${darkMode ? 'dark' : 'light'} mode`, 'system', true);
    saveState();
});

// --- Keyboard shortcuts (extended) ---
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
        case 'e':
            exportBtn.click();
            e.preventDefault();
            break;
        case 'r':
            // Reset everything (with confirmation)
            if (confirm('Reset all data?')) {
                blockCounter = 0;
                totalBlocked = 12400;
                logEntries = [];
                blockTimeline = [];
                trackedUsers = [];
                viewCountEl.textContent = '0';
                totalBlockedEl.textContent = '12.4K';
                renderLogs();
                updateAnalytics();
                saveState();
                addLog('All data reset', 'system');
                sendNotification('🔄 InstaRadar', 'All data has been reset');
            }
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

// --- Easter eggs ---
document.querySelector('h1').addEventListener('dblclick', () => {
    blockCounter = 0;
    viewCountEl.textContent = '0';
    addLog('Counter reset (double-click)', 'system');
    saveState();
    playSound('ping');
});

// Konami code easter egg (↑ ↑ ↓ ↓ ← → ← → B A)
let konamiIndex = 0;
const konamiCode = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            konamiIndex = 0;
            addLog('🎮 Konami code activated! +50 bonus blocks', 'system');
            for (let i = 0; i < 50; i++) {
                setTimeout(() => simulateBlock(), i * 50);
            }
            sendNotification('🎮 InstaRadar', 'Konami code activated! +50 blocks!');
            playSound('ping');
        }
    } else {
        konamiIndex = 0;
    }
});

// --- Init ---
loadCoreCode().then(() => {
    loadState();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    if (stealthToggle.checked) {
        startAutoScan();
        setTimeout(() => addLog('Radar scanning started', 'system'), 1000);
    }

    setTimeout(() => {
        addLog('InstaRadar v2.0 ready', 'system');
        updateAnalytics();
        updateContributions();
    }, 500);

    console.log('📡 InstaRadar v2.0 loaded!');
    console.log('⌨️  Shortcuts: I=Inject, S=Stealth, D=Dark, C=Clear logs, E=Export, R=Reset all');
    console.log('💡 Double-click the title to reset counter.');
    console.log('🎮 Konami code: ↑ ↑ ↓ ↓ ← → ← → B A');

    // Show welcome notification
    setTimeout(() => {
        sendNotification('📡 InstaRadar', 'Welcome back! Tracking mode ready.');
    }, 1500);
});

// --- Manual filter trigger ---
document.addEventListener('change', (e) => {
    if (e.target.id === 'filterType' || e.target.id === 'filterUser') {
        renderLogs();
    }
});

// --- Settings panel toggle ---
if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('visible');
    });
}

console.log('✅ InstaRadar advanced JS loaded successfully!');
console.log(`📊 Total JS size: ~${document.querySelector('script[src="script.js"]')?.textContent?.length || '??'} characters`);
