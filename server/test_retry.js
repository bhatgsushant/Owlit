
const AskController = require('./controllers/ask_controller');

async function testRetry() {
    console.log("🧪 Testing AskController Auto-Retry...");

    // 1. Simulate Normal Query
    console.log("\n--- 1. Normal Query ---");
    const res1 = await AskController.processQuestion({
        userId: '103517642769452703078',
        question: "How much did I spend on dining?",
        isRetry: false
    });
    console.log("Normal Answer:", res1.answer);

    // 2. Simulate Retry Query
    console.log("\n--- 2. Retry Query (isRetry=true) ---");
    const res2 = await AskController.processQuestion({
        userId: '103517642769452703078',
        question: "How much did I spend on dining?",
        isRetry: true
    });
    console.log("Retry Answer:", res2.answer);

    if (res2.answer) {
        console.log("\n✅ Test Passed: Retry produced an answer.");
    } else {
        console.error("\n❌ Test Failed: Retry failed.");
    }
    process.exit(0);
}

// Mock Env Vars if needed or use dotenv
require('dotenv').config();
testRetry();
