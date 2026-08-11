// ============================================================
// InstaRadar - Core Interception Logic
// Blocks Instagram's "Seen" signal across multiple vectors
// ============================================================

(function() {
    'use strict';

    console.log('📡 [InstaRadar] Stealth layer activating...');

    // --- Save original methods ---
    const originalFetch = window.fetch;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalBeacon = navigator.sendBeacon;
    const originalImage = window.Image;

    const TARGET = 'PolarisStoriesV3SeenMutation';
    let isActive = true;

    // --- 1. Block fetch requests ---
    window.fetch = function(...args) {
        const [url, options] = args;
        if (isActive && options?.body && typeof options.body === 'string') {
            try {
                const body = JSON.parse(options.body);
                if (body.operationName === TARGET) {
                    console.log('📡 [InstaRadar] Blocked story seen (fetch)');
                    return Promise.resolve(
                        new Response(JSON.stringify({ data: {} }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        })
                    );
                }
            } catch (e) { /* Ignore non-JSON */ }
        }
        return originalFetch.apply(this, args);
    };

    // --- 2. Block XMLHttpRequest ---
    XMLHttpRequest.prototype.send = function(body) {
        if (isActive && body && typeof body === 'string') {
            try {
                const parsed = JSON.parse(body);
                if (parsed.operationName === TARGET) {
                    console.log('📡 [InstaRadar] Blocked story seen (XHR)');
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
            } catch (e) { /* Ignore non-JSON */ }
        }
        return originalSend.apply(this, arguments);
    };

    // --- 3. Block sendBeacon (analytics) ---
    navigator.sendBeacon = function(url, data) {
        if (isActive && typeof data === 'string' && data.includes(TARGET)) {
            console.log('📡 [InstaRadar] Blocked beacon (seen signal)');
            return true;
        }
        return originalBeacon.apply(this, arguments);
    };

    // --- 4. Block image tracking pixels ---
    window.Image = function() {
        const img = new originalImage();
        const originalSrc = Object.getOwnPropertyDescriptor(img, 'src');
        Object.defineProperty(img, 'src', {
            set: function(value) {
                if (isActive && typeof value === 'string' && value.includes('logging')) {
                    console.log('📡 [InstaRadar] Blocked tracking pixel');
                    return;
                }
                originalSrc.set.call(this, value);
            },
            get: function() {
                return originalSrc.get.call(this);
            }
        });
        return img;
    };

    // --- 5. Expose control functions ---
    window.__instaradar = {
        toggle: function(state) {
            isActive = state !== undefined ? state : !isActive;
            console.log(`📡 [InstaRadar] Stealth ${isActive ? 'ON' : 'OFF'}`);
            return isActive;
        },
        status: function() {
            return isActive;
        }
    };

    console.log('✅ InstaRadar is ACTIVE. All tracking blocked!');
    console.log('💡 Control: window.__instaradar.toggle(false/true)');
})();
