const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
const axios = require('axios');
const readline = require('readline');
const puppeteer = require('puppeteer');

// =================================================================
// 🚀 BAYOU ELITE ARENA KONFİGÜRASYONU
// =================================================================
const PORT = 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rootPath = process.pkg ? path.dirname(process.execPath) : __dirname;
const publicPath = path.join(rootPath, 'public');

app.use(express.static(publicPath));

// OYUN VERİLERİ
let votes = { fb: 0, gs: 0, bjk: 0, ts: 0 };
let elitePlayers = {};
let pendingSuperChats = {};

const teams_map = {
    'fb': ['fb', 'fener', 'fenerbahce', 'fenerbahçe'],
    'gs': ['gs', 'cimbom', 'galatasaray'],
    'bjk': ['bjk', 'besiktas', 'beşiktaş'],
    'ts': ['ts', 'trabzon', 'trabzonspor']
};

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 📡 WEBSOCKET BAĞLANTISI
wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', votes, elitePlayers }));
});

// 📺 PUPPETEER - YOUTUBE CHAT TAKİBİ
async function runPuppeteer(videoId) {
    if (!videoId) return;
    const chatUrl = `https://www.youtube.com/live_chat?v=${videoId}&is_popout=1`;
    console.log(`[BAĞLANTI] YouTube Chat izleniyor: ${videoId}`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(chatUrl, { waitUntil: 'networkidle2' });

    await page.exposeFunction('onNewMessage', (name, text, isSuperChat, amount) => {
        if (isSuperChat) {
            console.log(`[SC] BAĞIŞ GELDİ: ${name} (${amount})`);
            pendingSuperChats[name] = { amount, timestamp: Date.now() };
            broadcast({ type: 'sc_alert', name, amount });
        } else {
            const msg = text.toLowerCase();
            let teamFound = null;
            for (const [key, aliases] of Object.entries(teams_map)) {
                if (aliases.some(a => msg.includes(a))) {
                    teamFound = key;
                    break;
                }
            }

            if (teamFound) {
                if (pendingSuperChats[name] && (Date.now() - pendingSuperChats[name].timestamp < 120000)) {
                    console.log(`[ELITE] ${name} artık ${teamFound} için Elite!`);
                    elitePlayers[name] = { team: teamFound, power: 5, rounds: 3 };
                    delete pendingSuperChats[name];
                    broadcast({ type: 'elite_update', name, team: teamFound });
                }

                const power = elitePlayers[name] ? elitePlayers[name].power : 1;
                votes[teamFound] += power;
                broadcast({ type: 'update', votes, lastVote: { name, team: teamFound, power } });
            }
        }
    });

    await page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        try {
                            const name = node.querySelector("#author-name")?.innerText || "Anonim";
                            const text = node.querySelector("#message")?.innerText || "";
                            const isSC = node.tagName.toLowerCase().includes('super-chat');
                            const amount = isSC ? node.querySelector("#purchase-amount")?.innerText : 0;
                            if (text || isSC) window.onNewMessage(name, text, isSC, amount);
                        } catch (e) { }
                    }
                });
            });
        });
        const container = document.querySelector("#item-scroller") || document.querySelector("yt-live-chat-app");
        if (container) observer.observe(container, { childList: true, subtree: true });
    });
}

// 🚀 BAŞLATMA
server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`   BAYOU ELITE ARENA v2.0 - AKTİF`);
    console.log(`   Adres: http://localhost:${PORT}`);
    console.log(`=================================================\n`);

    const videoId = process.argv[2];
    if (videoId) runPuppeteer(videoId);
    else console.log("UYARI: Video ID girilmedi, TEST modunda basladi.");
});
