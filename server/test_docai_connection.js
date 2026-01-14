
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { GoogleAuth } = require('google-auth-library');
require('dotenv').config();

async function testDocAI() {
    const projectId = process.env.DOCAI_PROJECT_ID;
    const location = process.env.DOCAI_LOCATION;
    const processorId = process.env.DOCAI_PROCESSOR_ID;

    console.log(`Testing Document AI...`);
    console.log(`Project: ${projectId}`);
    console.log(`Location: ${location}`);
    console.log(`Processor: ${processorId}`);
    console.log(`Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

    try {
        // Check if we can authenticate
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        console.log(`✅ Authenticated as: ${client.email}`);
    } catch (e) {
        console.error('❌ Google Auth failed:', e.message);
        return;
    }

    try {
        const client = new DocumentProcessorServiceClient();
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

        // Just try to get the processor info to verify access
        console.log(`Fetching processor: ${name}`);
        const [processor] = await client.getProcessor({ name });
        console.log(`✅ Processor found: ${processor.displayName} (${processor.state})`);
    } catch (error) {
        console.error('❌ Document AI Error:', error.message);
        if (error.code === 7) {
            console.log("Suggestion: Make sure the Service Account has 'Document AI API User' role.");
        }
    }
}

testDocAI();
