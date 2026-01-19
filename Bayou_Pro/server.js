const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { machineIdSync } = require('node-machine-id');

const RENDER_API_URL = "https://bayou-backend.onrender.com/validate";
const PORT = 3000;
const LICENSE_FILE = path.join(__dirname, 'license.txt');
const HWID = machineIdSync();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let votes = { fb: 0, gs: 0, bjk: 0, ts: 0 };
let elitePlayers = {};
let currentLicense = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

async function checkLicense(key) {
    try {
        const response = await axios.get(RENDER_API_URL, { params: { key: key, hwid: HWID } });
        if (response.data.success) {
            fs.writeFileSync(LICENSE_FILE, key);
            currentLicense = response.data;
            return true;
        }
        return false;
    } catch (e) { return false; }
}

async function startApp() {
    process.stdout.write('\x1Bc');
    console.log(`\n=================================================`);
    console.log(`🚀 BAYOU PRO V3.0 - OFFICIAL EDITION`);
    console.log(`🖥️  Cihaz ID: ${HWID}`);
    console.log(`=================================================\n`);

    let savedKey = fs.existsSync(LICENSE_FILE) ? fs.readFileSync(LICENSE_FILE, 'utf8').trim() : "";

    if (savedKey && await checkLicense(savedKey)) {
        console.log(`✅ Lisans Onayli (Kalan Gun: ${currentLicense.daysLeft})\n`);
        askForVideo();
    } else {
        askForLicense();
    }
}

function askForLicense() {
    rl.question('🔑 Lütfen Lisans Anahtarınızı Girin: ', async (key) => {
        if (await checkLicense(key)) askForVideo();
        else { console.log("❌ Gecersiz Lisans!"); askForLicense(); }
    });
}

function askForVideo() {
    rl.question('📺 YouTube Video ID Girin (Boş bırakırsanız TEST modu): ', (vid) => {
        runServer();
        if (vid) runPuppeteer(vid);
        else console.log("\n[MOD] Test Modu Aktif - http://localhost:3000 adresinden izleyebilirsiniz.\n");
    });
}

async function runPuppeteer(videoId) {
    console.log(`\n[LOG] YouTube Canli Sohbet Baglantisi Kuruluyor...`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://www.youtube.com/live_chat?v=${videoId}&is_popout=1`);

        await page.exposeFunction('onNewMessage', (name, text, isSC) => {
            const msg = text.toLowerCase();
            let team = null;
            if (msg.includes('fb') || msg.includes('fener')) team = 'fb';
            else if (msg.includes('gs') || msg.includes('cimbom')) team = 'gs';
            else if (msg.includes('bjk') || msg.includes('besiktas')) team = 'bjk';
            else if (msg.includes('ts') || msg.includes('trabzon')) team = 'ts';

            if (team) {
                votes[team] += isSC ? 10 : 1;
                if (isSC) elitePlayers[name] = { team, power: 10 };
                broadcast({ type: 'update', votes, elitePlayers });
            }
        });

        await page.evaluate(() => {
            const observer = new MutationObserver(m => {
                m.forEach(mut => mut.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const name = node.querySelector("#author-name")?.innerText || "Anon";
                        const text = node.querySelector("#message")?.innerText || "";
                        const isSC = node.tagName.toLowerCase().includes('super-chat');
                        window.onNewMessage(name, text, isSC);
                    }
                }));
            });
            observer.observe(document.querySelector("yt-live-chat-app"), { childList: true, subtree: true });
        });
    } catch (e) { console.log("⚠️ Puppeteer Hatasi:", e.message); }
}

function runServer() {
    server.listen(PORT, () => {
        console.log(`\n🌍 Bayou Panel: http://localhost:${PORT}`);
    });
}

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', votes, elitePlayers, license: currentLicense }));
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.type === 'test_vote') votes[data.team]++;
            if (data.type === 'test_sc') { votes[data.team] += 10; elitePlayers[data.name] = { team: data.team }; }
            if (data.type === 'reset') { votes = { fb: 0, gs: 0, bjk: 0, ts: 0 }; elitePlayers = {}; }
            broadcast({ type: 'update', votes, elitePlayers });
        } catch (e) { }
    });
});

startApp();
