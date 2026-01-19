const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔒 SAHTE VERİTABANI (Gerçekte MongoDB veya SQLite kullanılabilir)
// Örnek bir HWID ve Lisans Kaydı
const licenses = {
    "6183e8bb38232b6132c1f88185a25831810f19475f954c7cb720364c40e161e3": {
        key: "BAYOU-1234-ABCD",
        type: "MONTHLY",
        expiryDate: "2026-03-01T12:22:56Z",
        status: "active"
    }
};

// 🛰️ LİSANS DOĞRULAMA ENDPOINT'İ
app.get('/api/validate', (req, res) => {
    const { hwid, key } = req.query;

    console.log(`[LOG] Lisans isteği: HWID: ${hwid}, KEY: ${key}`);

    const license = licenses[hwid];

    if (license && license.key === key) {
        res.json({
            success: true,
            type: license.type,
            expiryDate: license.expiryDate,
            serverTime: new Date().toISOString()
        });
    } else {
        res.status(401).json({
            success: false,
            message: "Geçersiz Lisans veya HWID eşleşmiyor."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Bayou Lisans Sunucusu ${PORT} portunda aktif.`);
});
