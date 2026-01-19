const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');
const axios = require('axios'); // API istekleri için
const readline = require('readline');

// 🔒 GÜVENLİK AYARLARI
const API_URL = "https://bayou-license-api.onrender.com/api/validate"; // ⚠️ Buraya kendi Render URL'ni koyacaksın
const HWID = machineIdSync();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function checkLicense() {
    process.stdout.write('\x1Bc'); // Ekranı temizle
    console.log("================================================================");
    console.log("           BAYOU CANLI MARŞ SİSTEMİ - v2.0 LİSANSLI             ");
    console.log("================================================================\n");

    console.log("[LİSANS] Online lisans doğrulama sistemi aktif");
    console.log("[API] Render.com lisans sunucusu kullanılıyor\n");
    console.log("-".repeat(60));

    let licenseKey = "";
    const licensePath = path.join(path.dirname(process.execPath), 'license.txt');

    // Eğer yerel dosya varsa oku
    if (fs.existsSync(licensePath)) {
        licenseKey = fs.readFileSync(licensePath, 'utf8').trim();
    } else {
        console.log("[LİSANS] Yerel lisans dosyası bulunamadı.");
        licenseKey = await askQuestion("Lütfen Lisans Anahtarınızı Girin: ");
    }

    let authenticated = false;
    let licenseInfo = null;
    let attempts = 0;
    const maxAttempts = 12;

    while (attempts < maxAttempts && !authenticated) {
        attempts++;
        console.log(`[LİSANS] Online doğrulama yapılıyor...`);
        if (attempts > 1) console.log(`[LİSANS] Render.com sunucusu uyanana kadar 10 saniyede bir deneniyor...`);

        try {
            console.log(`[API] Deneme ${attempts}/${maxAttempts} - ${API_URL}`);

            const response = await axios.get(API_URL, {
                params: { hwid: HWID, key: licenseKey },
                timeout: 8000
            });

            if (response.data.success) {
                console.log("[API] Başarılı yanıt alındı (Deneme " + attempts + ")");
                licenseInfo = response.data;
                authenticated = true;

                // Lisansı yerel dosyaya kaydet/güncelle
                fs.writeFileSync(licensePath, licenseKey);
                console.log("[LOCAL] Lisans güvenli şekilde kaydedildi");
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.error("\n[HATA] Geçersiz Lisans Anahtarı! Müşteri temsilcinizle görüşün.");
                console.error(`[HWID] Kimliğiniz: ${HWID}`);
                const retry = await askQuestion("\nYeni bir anahtar girmek ister misiniz? (E/H): ");
                if (retry.toLowerCase() === 'e') {
                    licenseKey = await askQuestion("Yeni Lisans Anahtarı: ");
                    attempts = 0; // Denemeleri sıfırla
                    continue;
                } else {
                    process.exit(1);
                }
            }

            console.log(`[UYARI] Sunucuya bağlanılamadı. 10 saniye sonra tekrar denenecek...`);
            await new Promise(r => setTimeout(r, 10000));
        }
    }

    if (!authenticated) {
        console.error("\n[HATA] Lisans sunucusuna ulaşılamadı. Lütfen internetinizi kontrol edin.");
        process.exit(1);
    }

    // Süre hesaplama logic'i
    const now = new Date();
    const expiry = new Date(licenseInfo.expiryDate);
    const diff = expiry - now;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    console.log(`[LİSANS] Online doğrulama başarılı - Tip: ${licenseInfo.type}`);
    console.log(`[LİSANS] Aktif lisans bulundu ✅`);
    console.log(`[LİSANS] Tip: ${licenseInfo.type}`);
    console.log(`[LİSANS] Kalan Süre: ${days} gün ${hours} saat`);
    console.log(`[LİSANS] Bitiş Tarihi: ${expiry.toLocaleDateString('tr-TR')} ${expiry.toLocaleTimeString('tr-TR')}`);
    console.log("-".repeat(60) + "\n");

    // Readline'ı kapatma ama programı bitirme
    // rl.close(); // Burada kapatmıyoruz çünkü kullanıcı daha sonra ID girebilir.
}

// PROGRAMI BAŞLATMA
(async () => {
    try {
        await checkLicense();
        startApp(); // Lisans tamamsa ana uygulamayı başlat
    } catch (err) {
        console.error("Kritik Hata:", err);
        process.exit(1);
    }
})();

function startApp() {
    console.log("✅ Bayou Sistemi Hazır.");

    // 🚨 YOUTUBE VİDEO ID'SİNİ KOMUT SATIRI ARGÜMANLARINDAN ALMA
    const videoId = process.argv[2];

    if (!videoId) {
        console.warn("DİKKAT: YouTube Video ID'si belirtilmedi. Sistem TEST modunda başlıyor.");
        console.log("Sadece yerel arayüzü (http://localhost:3000) görebilirsiniz, YouTube sohbeti okunmayacaktır.");
    } else {
        console.log(`[BAŞLANGIÇ] Kullanılan YouTube Video ID: ${videoId}`);
    }
    const chatUrl = videoId ? `https://www.youtube.com/live_chat?v=${videoId}&is_popout=1` : null;

    // -----------------------------------------------------
    // OY VE SAYAÇ DEĞİŞKENLERİ (GLOBAL)

    // 🌟 DEĞİŞİKLİK 1: Algılanacak tüm takım adı varyasyonları eklendi.
    const teams = [
        "fb", "fener", "fenerbahce", "fenerbahçe",
        "gs", "cimbom", "galatasaray",
        "bjk", "besiktas", "beşiktaş", "besiktaş", // besiktaş yaygın bir yazım hatası için eklendi
        "ts", "trabzon", "trabzonspor"
    ];
    let votes = { fb: 0, gs: 0, bjk: 0, ts: 0 };
    let totalSeconds = 180;
    let timerInterval;
    let isCountingDown = false; // Maç başlama geri sayımı (3, 2, 1)
    let countdownValue = 3;
    let matchStarted = false; // Maçın başladığını takip eder
    let lastChampion = "Henüz Yok"; // Son şampiyon bilgisini tutar
    let countdownInterval; // Geri sayım için özel interval
    // Yeni oylama değişkenleri:
    let currentVotingRound = 1; // Hangi oylama turunda olduğumuzu tutar
    let isMarchPlaying = false; // Marşın çalınıp çalınmadığını tutar

    // Takım Anahtarlarını Normalleştiren Fonksiyon
    // 🌟 DEĞİŞİKLİK 2: Yeni varyasyonları doğru anahtara eşleştirecek şekilde güncellendi.
    function normalizeVote(vote) {
        const lowerVote = vote.toLowerCase();

        if (['fb', 'fener', 'fenerbahce', 'fenerbahçe'].includes(lowerVote)) return 'fb';
        if (['gs', 'cimbom', 'galatasaray'].includes(lowerVote)) return 'gs';
        if (['bjk', 'besiktas', 'beşiktaş', 'besiktaş'].includes(lowerVote)) return 'bjk';
        if (['ts', 'trabzon', 'trabzonspor'].includes(lowerVote)) return 'ts';
        return null;
    }

    // -----------------------------------------------------
    // EXPRESS APP VE SUNUCU KURULUMU
    const app = express();
    const PORT = 3000;

    // 🛠️ EXE İÇİN DOSYA YOLU DÜZELTMESİ
    // Eğer program EXE olarak çalışıyorsa (pkg), dışarıdaki 'public' klasörüne bak.
    // Eğer normal node ile çalışıyorsa, kendi dizinine bak.
    const rootPath = process.pkg ? path.dirname(process.execPath) : __dirname;
    const publicPath = path.join(rootPath, 'public');

    app.use(express.static(publicPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

    // -----------------------------------------------------
    // WS İstemci Bağlantı Mantığı 
    wss.on('connection', (ws) => {
        console.log('İstemci bağlandı.');
        // Bağlanan istemciye güncel durumu gönder
        ws.send(JSON.stringify({ type: 'update', votes: votes }));
        ws.send(JSON.stringify({ type: 'timer', timer: totalSeconds }));
        ws.send(JSON.stringify({ type: 'champion_update', lastChampion: lastChampion }));
        ws.on('message', (message) => {
            const data = JSON.parse(message);
            if (data.type === "force_winner_check") {
                // Manuel tetikleme (gerekliyse)
                checkWinner();
            } else if (data.type === "march_started") {
                // İstemci marşı başlattığını bildirir
                isMarchPlaying = true;
            } else if (data.type === "march_ended") {
                // İstemci marşın bittiğini bildirir
                isMarchPlaying = false;
            } else if (data.type === "simulate_vote") {
                // TEST: Sahte oy ekle
                const team = normalizeVote(data.team);
                if (team) {
                    const isBonus = (data.isBonus === true || data.isBonus === "true");
                    let pointIncrease = isBonus ? 5 : 1;
                    if (!isBonus && totalSeconds <= 60 && !isCountingDown) pointIncrease = 2;

                    votes[team] += pointIncrease;
                    console.log(`[TEST] Vote added to ${team}: +${pointIncrease}. New score: ${votes[team]}`);
                    broadcast({ type: 'update', votes: votes, lastVote: { team: team, increase: pointIncrease } });
                }
            } else if (data.type === "set_timer") {
                // TEST: Sayacı ayarla
                totalSeconds = data.seconds;
                broadcast({ type: 'timer', timer: totalSeconds });
            }
        });
        ws.on('close', () => { console.log('İstemci bağlantısı kesildi.'); });
    });
    function broadcast(data) {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    // -----------------------------------------------------
    // SAYAÇ VE OYLAMA MANTIĞI 

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        if (countdownInterval) clearInterval(countdownInterval);

        // YENİ: Maç başlama geri sayımı (Düdük sesi için)
        isCountingDown = true;
        countdownValue = 3;
        matchStarted = false;
        broadcast({ type: 'match_countdown', value: countdownValue });

        countdownInterval = setInterval(() => {
            countdownValue--;
            if (countdownValue >= 0) {
                broadcast({ type: 'match_countdown', value: countdownValue });
            }
            if (countdownValue < 0) {
                clearInterval(countdownInterval); // Geri sayım bitti, intervali temizle
                isCountingDown = false;
                matchStarted = true;
                console.log(`[SAYAÇ] Maç Başladı! Tur ${currentVotingRound}.`);

                // Şimdi ana sayacı başlat
                startMainTimer();
            }
        }, 1000);
    }

    function startMainTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            totalSeconds--;

            if (totalSeconds < 0) {
                totalSeconds = 0;
            }

            if (totalSeconds === 0) {
                checkWinner();
            }

            broadcast({ type: 'timer', timer: totalSeconds });
        }, 1000);
        console.log(`[SAYAÇ] Ana süre işliyor: Tur ${currentVotingRound}.`);
    }

    // ✨ DEĞİŞİKLİK BURADA: Oylamayı sıfırlamadan önce kazananı ilan et
    // FONKSİYON ASYNC YAPILDI
    async function checkWinner() {
        // 3 dakikalık oylama süresi doldu, sayacı durdur
        if (timerInterval) clearInterval(timerInterval);

        const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

        if (totalVotes === 0) {
            console.log(`[OYLAMA ${currentVotingRound}] Süre doldu, ancak oy yok.`);
            broadcast({ type: 'no_winner' });
        } else {
            let maxVotes = -1;
            let winners = [];
            for (const team in votes) {
                if (votes[team] > maxVotes) {
                    maxVotes = votes[team];
                    winners = [team];
                } else if (votes[team] === maxVotes) {
                    winners.push(team);
                }
            }

            if (winners.length === 1) {
                const winnerTeam = winners[0];
                const teamNames = { fb: "Fenerbahçe", gs: "Galatasaray", bjk: "Beşiktaş", ts: "Trabzonspor" };
                lastChampion = teamNames[winnerTeam];
                console.log(`[KAZANAN ${currentVotingRound}] Belirlendi: ${winnerTeam} (${maxVotes} oy)`);

                // İstemciye marşı çalması sinyalini gönder
                broadcast({ type: 'winner', team: winnerTeam, championName: lastChampion });
                broadcast({ type: 'champion_update', lastChampion: lastChampion });

            } else {
                console.log(`[OYLAMA ${currentVotingRound}] Süre doldu ve beraberlik var.`);
                broadcast({ type: 'no_winner' });
            }
        }

        // YENİ: Kazanan ilan edildikten sonra 2 saniye bekle
        console.log("[SAYAÇ] Yeni oylama turuna geçmeden önce 2 saniye bekleniyor...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekleme eklendi

        // Kazanan ilan edildikten hemen sonra oylamayı sıfırla ve yeni turu başlat
        resetVoting();
    }

    // resetVoting: Oylamayı sıfırlar ve yeni 3 dakikalık turu başlatır.
    function resetVoting() {
        currentVotingRound++;
        console.log(`[OYLAMA] Sıfırlandı. Yeni tur başlıyor: Tur ${currentVotingRound}`);
        votes = { fb: 0, gs: 0, bjk: 0, ts: 0 };
        totalSeconds = 180;

        // Yeni tur başladığı için arayüzü sıfır oyla güncelle
        broadcast({ type: 'update', votes: votes });
        broadcast({ type: 'timer', timer: totalSeconds });

        // Yeni 3 dakikalık sayacı başlat
        startTimer();
    }


    // -----------------------------------------------------
    // PUPPETEER MANTIĞI (YOUTUBE CHAT OKUMA) - (Aynı kaldı)

    const seenMessageHashes = new Set();
    const MAX_HISTORY = 100;

    function hashMessage(msg) {
        let hash = 0;
        if (msg.length === 0) return hash.toString(36);
        for (let i = 0; i < msg.length; i++) {
            const char = msg.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString(36) + Date.now().toString().slice(-2);
    }

    async function runPuppeteer() {
        if (!chatUrl) {
            console.log("[PUPPETEER] Video ID girilmediği için Youtube Chat izleme başlatılmadı (TEST MODU).");
            return;
        }
        try {
            const browser = await puppeteer.launch({
                headless: false,
                defaultViewport: null,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio']
            });

            const page = await browser.newPage();

            await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 0 });

            console.log(`[PUPPETEER] YouTube Chat sayfası açıldı: ${chatUrl}`);

            await page.waitForSelector('yt-live-chat-app', { timeout: 30000 });
            console.log("[PUPPETEER] Chat ana uygulaması DOM'da bulundu.");

            console.log("[PUPPETEER] 2 saniye bekleniyor (YouTube JS yüklenmesi için)...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log("[PUPPETEER] Devam ediliyor.");

            // KONSOL DİNLEYİCİ
            page.on('console', msg => {
                const text = msg.text();

                if (text.startsWith('CHAT_VOTE:')) {
                    const parts = text.split(':');
                    const rawVote = parts[1].toLowerCase().trim();
                    const isBonus = parts[2] === 'BONUS';
                    const chatMessage = normalizeVote(rawVote);

                    if (!chatMessage) return;

                    const messageKey = hashMessage(rawVote + (isBonus ? 'bonus' : ''));

                    if (seenMessageHashes.has(messageKey)) {
                        return;
                    }

                    // 🌟 ÖZELLİK: Son 1 dakikada 2x puan
                    let pointIncrease = isBonus ? 5 : 1;
                    if (!isBonus && totalSeconds <= 60 && !isCountingDown) {
                        pointIncrease = 2;
                    }

                    votes[chatMessage] += pointIncrease;
                    console.log(`[OY] ALINDI: ${rawVote} -> ${chatMessage} (+${pointIncrease}) - Yeni Toplam: ${votes[chatMessage]}`);
                    broadcast({ type: 'update', votes: votes, lastVote: { team: chatMessage, increase: pointIncrease } });

                    seenMessageHashes.add(messageKey);
                    if (seenMessageHashes.size > MAX_HISTORY + 20) {
                        const newArray = Array.from(seenMessageHashes).slice(-MAX_HISTORY);
                        seenMessageHashes.clear();
                        newArray.forEach(item => seenMessageHashes.add(item));
                    }
                }
            });

            // MUTATION OBSERVER MANTIĞI (Tarayıcı tarafı)
            await page.evaluate(() => {
                const chatContainer = document.querySelector("yt-live-chat-app");

                // 🌟 DEĞİŞİKLİK 3a: Yeni takım adları eklendi.
                const teams = [
                    'fb', 'fener', 'fenerbahce', 'fenerbahçe',
                    'gs', 'cimbom', 'galatasaray',
                    'bjk', 'besiktas', 'beşiktaş', 'besiktaş',
                    'ts', 'trabzon', 'trabzonspor'
                ];

                if (!chatContainer) {
                    console.error("HATA: YouTube Chat ana uygulaması (yt-live-chat-app) bulunamadı!");
                    return;
                }

                console.log("YouTube Chat DOM dinleyicisi başlatıldı (Observer Aktif).");

                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {

                            if (node.nodeType === 1 && node.tagName.toLowerCase() === 'yt-live-chat-text-message-renderer') {

                                const messageText = node.querySelector("#message")?.innerText || "";

                                if (messageText) {
                                    const messageLower = messageText.toLowerCase();
                                    const hasBonus = messageLower.includes("beğendim") || messageLower.includes("begendim");
                                    const bonusAmount = 5;

                                    const messageParts = messageLower.split(/\s+|\.|\,|\!|\?|\;|\:|\-/);

                                    for (const part of messageParts) {
                                        if (!part) continue; // Boş dizeleri atla
                                        if (teams.includes(part)) {
                                            console.log(`CHAT_VOTE:${part}${hasBonus ? ':BONUS' : ''}`);
                                            break;
                                        }
                                    }
                                }
                            }
                        });
                    });
                });

                observer.observe(chatContainer, { childList: true, subtree: true });

                // RAM temizleme işlevi
                setInterval(() => {
                    const messageContainer = chatContainer.querySelector('#item-scroller');
                    if (messageContainer) {
                        messageContainer.innerHTML = "";
                        console.log("DOM Belleği Temizlendi.");
                    }
                }, 15 * 60 * 1000);
            });


        } catch (error) {
            console.error('[PUPPETEER] HATA:', error.message);
            if (error.message.includes('closed')) {
                console.log("İPUCU: Puppeteer başlatılamadı veya sayfa yüklenirken beklenmeyen bir hata oluştu.");
            }
        }
    }

    // -----------------------------------------------------
    // BAŞLANGIÇ

    server.listen(PORT, () => {
        console.log(`Sunucu başlatıldı. Arayüz adresi: http://localhost:${PORT}`);

        runPuppeteer();
        startTimer();
    });
}