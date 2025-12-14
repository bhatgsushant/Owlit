require('dotenv').config();

const urlStr = process.env.DATABASE_URL;

console.log("--- DATABASE_URL DIAGNOSTIC ---");
if (!urlStr) {
    console.error("❌ DATABASE_URL is missing.");
    process.exit(1);
}

try {
    const url = new URL(urlStr);
    console.log("Protocol:", url.protocol); // Should be postgres: or postgresql:
    console.log("Hostname:", url.hostname); // Should be ...supabase.co
    console.log("Port:", url.port);         // Should be 5432 or 6543
    console.log("Username:", url.username); // Should be postgres or similar

    const password = url.password;
    const hasPercent = password.includes('%');
    const hasAt = password.includes('@');

    console.log("Password length:", password.length);
    console.log("Password contains '%':", hasPercent ? "YES (Good if you used %40)" : "NO");
    console.log("Password contains '@':", hasAt ? "YES (⚠️ This might be the problem if unencoded)" : "NO");

    // Check if the @ separating password and host is correctly identified
    // If the password contains @, new URL() might have split it wrong depending on the string.
    // Actually new URL() usually handles the LAST @ as the separator, so internal @ in password *without* encoding 
    // often ends up being part of the userinfo, which is fine for parsing, but the DB driver might get confused 
    // or it's actually just the wrong password.

    if (url.hostname.includes('@')) {
        console.log("⚠️ Hostname looks suspicious. It contains '@'. You likely have an unencoded '@' in your password.");
    }

} catch (e) {
    console.error("❌ Could not parse DATABASE_URL as a valid URL.");
    console.error("Error:", e.message);
    // Use simple regex to check for @ count
    const atCount = (urlStr.match(/@/g) || []).length;
    console.log(`String contains ${atCount} '@' symbol(s). (Should be exactly 1 unless encoded).`);
}
console.log("-------------------------------");
