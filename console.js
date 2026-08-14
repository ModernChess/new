// =========================================================================
// IN-GAME OVERLAY CONSOLE & ERROR/SUCCESS TRACKER
// =========================================================================

(function() {
    // Create container elements for the in-game console
    const consoleContainer = document.createElement('div');
    consoleContainer.id = 'ingame-debug-console';
    consoleContainer.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        width: 420px;
        height: 32px;
        background: rgba(15, 15, 15, 0.9);
        border: 2px solid #333;
        border-radius: 6px;
        color: #fff;
        font-family: monospace;
        font-size: 11px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        pointer-events: auto;
    `;

    const headerBar = document.createElement('div');
    headerBar.style.cssText = `
        background: #222;
        padding: 6px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #444;
        cursor: pointer;
        user-select: none;
    `;
    headerBar.innerHTML = `<span><b>Game Tracker & Console</b></span>`;

    const controls = document.createElement('div');
    const clearBtn = document.createElement('button');
    clearBtn.innerText = 'Clear';
    clearBtn.style.cssText = 'background:#444; color:#fff; border:none; padding:2px 6px; cursor:pointer; font-size:10px; margin-right:5px; border-radius:3px;';
    clearBtn.onclick = (e) => { e.stopPropagation(); logContent.innerHTML = ''; };

    const toggleBtn = document.createElement('button');
    toggleBtn.innerText = '+';
    toggleBtn.style.cssText = 'background:#444; color:#fff; border:none; padding:2px 8px; cursor:pointer; font-size:10px; border-radius:3px;';
    
    controls.appendChild(clearBtn);
    controls.appendChild(toggleBtn);
    headerBar.appendChild(controls);

    const logContent = document.createElement('div');
    logContent.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: none;
        flex-direction: column;
        gap: 4px;
        word-break: break-all;
    `;

    consoleContainer.appendChild(headerBar);
    consoleContainer.appendChild(logContent);
    document.body.appendChild(consoleContainer);

    // Toggle minimize/maximize (starts minimized)
    let isMinimized = true;
    toggleBtn.onclick = () => {
        isMinimized = !isMinimized;
        consoleContainer.style.height = isMinimized ? '32px' : '200px';
        logContent.style.display = isMinimized ? 'none' : 'flex';
        toggleBtn.innerText = isMinimized ? '+' : '_';
    };

    headerBar.onclick = () => {
        toggleBtn.click();
    };

    // Logger helper function appending to UI & keeping standard console functionality
    function appendLog(type, args) {
        let entry = document.createElement('div');
        let color = '#fff';
        if (type === 'error') color = '#ff6b6b';
        else if (type === 'warn') color = '#feca57';
        else if (type === 'success') color = '#1dd1a1';
        else if (type === 'info') color = '#54a0ff';

        entry.style.color = color;
        let text = args.map(arg => {
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch(err) { return '[Object]'; }
            }
            return arg;
        }).join(' ');

        let timestamp = new Date().toLocaleTimeString();
        entry.innerText = `[${timestamp}] ${text}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    // Intercept native console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = function(...args) {
        originalLog.apply(console, args);
        appendLog('log', args);
    };

    console.warn = function(...args) {
        originalWarn.apply(console, args);
        appendLog('warn', args);
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        appendLog('error', args);
    };

    // Catch global unhandled script runtime errors
    window.addEventListener('error', function(event) {
        appendLog('error', [`Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}`]);
    });

    console.log('In-game web console and tracker successfully initialized.');
})();
