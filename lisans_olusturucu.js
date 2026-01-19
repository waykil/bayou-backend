const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');

// 🔒 GÜVENLİK AYARI (server.js ile aynı olmalı)
const SECRET_SALT = "bayou_secure_protocol_2026";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("======================================");
console.log("       BAYOU LICENSE GENERATOR");
console.log("======================================");

rl.question('\nEnter the Customer Hardware ID (HWID): ', (hwid) => {
    if (!hwid || hwid.trim() === "") {
        console.log("Error: Invalid HWID!");
        process.exit();
    }

    const licenseKey = crypto.createHash('sha256')
        .update(hwid.trim() + SECRET_SALT)
        .digest('hex');

    console.log("\n--------------------------------------");
    console.log("GENERATED LICENSE KEY:");
    console.log(licenseKey);
    console.log("--------------------------------------");
    console.log("\n1. Create a file named 'license.txt'");
    console.log("2. Paste this key inside.");
    console.log("3. Place it in the Bayou program folder.");

    rl.close();
});
