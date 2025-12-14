const dns = require('dns');
require('dotenv').config();

const urlStr = process.env.DATABASE_URL;
if (!urlStr) { console.log("No DB URL"); process.exit(1); }

const u = new URL(urlStr);
console.log("Hostname:", u.hostname);

dns.resolve4(u.hostname, (err, addresses) => {
    if (err) {
        console.error("DNS IPv4 Lookup Failed:", err);
    } else {
        console.log("IPv4 Addresses:", addresses);
    }
});

dns.resolve6(u.hostname, (err, addresses) => {
    if (err) {
        console.log("DNS IPv6 Lookup Failed (Expected if only IPv4/Mixed):", err.message);
    } else {
        console.log("IPv6 Addresses:", addresses);
    }
});
