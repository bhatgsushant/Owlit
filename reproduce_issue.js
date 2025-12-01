
function normalizeMerchantName(name = '') {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/(?:^|[\s])\w/g, c => c.toUpperCase()); // New title casing logic
}

const tests = [
    { input: "Co-op", expected: "Co-op" },
    { input: "tesco express", expected: "Tesco Express" },
    { input: "waitrose & partners", expected: "Waitrose and Partners" }, // & is replaced by ' and ' earlier
];

let allPassed = true;

tests.forEach(({ input, expected }) => {
    // Note: The function above doesn't include the '&' -> ' and ' replacement for simplicity in this test, 
    // but let's add it to match the real function if we want to test that.
    // For now, let's just test the casing logic.

    let processed = input.toLowerCase().replace(/[^a-z0-9 -]/gi, ' ').trim();
    // Simulating the ' and ' replacement for waitrose if needed, but let's stick to the casing part.

    const actual = normalizeMerchantName(input);
    console.log(`Input: "${input}" -> Actual: "${actual}"`);

    // We are lenient on the & part for this specific script unless we copy the full logic.
    // Let's copy full logic to be sure.
});

function fullNormalize(name = '') {
    return name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9 -]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/(?:^|[\s])\w/g, c => c.toUpperCase());
}

console.log("\n--- Full Normalization Tests ---");
tests.forEach(({ input, expected }) => {
    const actual = fullNormalize(input);
    if (actual === expected) {
        console.log(`✅ "${input}" -> "${actual}"`);
    } else {
        console.log(`❌ "${input}" -> "${actual}" (Expected: "${expected}")`);
        allPassed = false;
    }
});
