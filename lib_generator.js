const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const indexPath = path.join(__dirname, 'bayou_backend', 'index.js');

function generateKey() {
    return "BAYOU-" + crypto.randomBytes(2).toString('hex').toUpperCase() + "-" + crypto.randomBytes(2).toString('hex').toUpperCase();
}

const args = process.argv.slice(2);
const days = parseInt(args[0]) || 30;
const typeMap = { 30: "AYLIK", 90: "3 AYLIK", 365: "YILLIK", 9999: "SINIRSIZ" };
const typeName = typeMap[days] || (days + " GUNLUK");

const newKey = generateKey();
const expiry = new Date();
expiry.setDate(expiry.getDate() + days);

const newEntry = `    {
        key: "${newKey}",
        hwid: "",
        expiryDate: "${expiry.toISOString()}",
        type: "${typeName}",
        status: "active"
    },`;

let content = fs.readFileSync(indexPath, 'utf8');
if (content.includes('let licenses = [')) {
    content = content.replace('let licenses = [', `let licenses = [\n${newEntry}`);
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log("\n? LISANS BASARIYLA OLUSTURULDU!");
    console.log("--------------------------------------");
    console.log("ANAHTAR: " + newKey);
    console.log("SURE:    " + typeName);
    console.log("BITIS:   " + expiry.toLocaleDateString('tr-TR'));
    console.log("--------------------------------------");
    console.log("\n[!] Simdi bu degisikligi GitHub'a yuklemeniz gerekiyor.");
} else {
    console.log("Hata: index.js dosyasý beklenen formatta degil!");
}
