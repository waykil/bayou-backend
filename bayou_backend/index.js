const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔒 LİSANS VERİTABANI (Örnek Anahtarlar)
let licenses = [
    {
        key: "BAYOU-6958-C8DE",
        hwid: "",
        expiryDate: "2026-02-18T13:17:40.168Z",
        type: "AYLIK",
        status: "active"
    },
    {
        key: "BAYOU-71BE-FD99",
        hwid: "",
        expiryDate: "2026-02-18T13:15:15.161Z",
        type: "AYLIK",
        status: "active"
    },
    {
        key: "BAYOU-017F-007C",
        hwid: "",
        expiryDate: "2026-02-18T13:11:53.671Z",
        type: "AYLIK",
        status: "active"
    },
    {
        key: "BAYOU-7527-1CB5",
        hwid: "",
        expiryDate: "2026-02-18T13:11:02.028Z",
        type: "AYLIK",
        status: "active"
    },
    {
        key: "BAYOU-9463-CE2D",
        hwid: "",
        expiryDate: "2026-02-18T13:04:41.156Z",
        type: "AYLIK",
        status: "active"
    },
    {
        key: "BAYOU-MONTH-TEST-1",
        hwid: "",
        expiryDate: "2026-03-01T00:00:00Z",
        type: "AYLIK",
        status: "active"
    },
    {
        key: "BAYOU-YEAR-TEST-2",
        hwid: "",
        expiryDate: "2027-01-01T00:00:00Z",
        type: "YILLIK",
        status: "active"
    }
];

// 🛰️ LİSANS DOĞRULAMA ENDPOINT'I
app.get('/validate', (req, res) => {
    const { key, hwid } = req.query;

    const license = licenses.find(l => l.key === key);

    if (!license) {
        return res.json({ success: false, message: "Hatalı Lisans Anahtarı!" });
    }

    if (license.status !== "active") {
        return res.json({ success: false, message: "Bu lisans dondurulmuş!" });
    }

    // İlk aktivasyonda HWID kitle
    if (!license.hwid) {
        license.hwid = hwid;
    }

    if (license.hwid !== hwid) {
        return res.json({ success: false, message: "Bu lisans başka bir cihaza ait!" });
    }

    const now = new Date();
    const expiry = new Date(license.expiryDate);

    if (now > expiry) {
        return res.json({ success: false, message: "Lisans süreniz doldu!" });
    }

    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    res.json({
        success: true,
        daysLeft: diffDays,
        expiryDate: license.expiryDate,
        type: license.type,
        serverTime: now
    });
});

app.get('/', (req, res) => {
    res.send("Bayou Lisans Sunucusu Aktif 🚀");
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
