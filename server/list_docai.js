
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { GoogleAuth } = require('google-auth-library');
require('dotenv').config();

async function listProcessors(location) {
    console.log(`\n🔍 Checking Location: ${location}`);
    const client = new DocumentProcessorServiceClient();
    const parent = `projects/${process.env.DOCAI_PROJECT_ID}/locations/${location}`;

    try {
        const [processors] = await client.listProcessors({ parent });
        if (processors.length === 0) {
            console.log("   No processors found.");
        } else {
            processors.forEach(p => {
                console.log(`   ✅ Found: ${p.displayName} | ID: ${p.name.split('/').pop()} | State: ${p.state}`);
            });
        }
    } catch (error) {
        console.log(`   ❌ Failed to list in ${location}: ${error.message}`);
    }
}

async function run() {
    console.log(`Project: ${process.env.DOCAI_PROJECT_ID}`);
    console.log(`Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    await listProcessors('us');
    await listProcessors('eu');
    // Try us-central1 just in case, though usually DocAI is multiregion
}

run();
