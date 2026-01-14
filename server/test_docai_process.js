const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testDocAIProcess() {
    const projectId = process.env.DOCAI_PROJECT_ID;
    const location = process.env.DOCAI_LOCATION;
    const processorId = process.env.DOCAI_PROCESSOR_ID;

    // Adjusted path assuming running from server directory or resolving correctly
    const filePath = path.resolve(__dirname, '../public/images/ProfilePicture.jpeg');

    console.log(`Reading file from: ${filePath}`);
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`File not found at ${filePath}`);
            return;
        }
    } catch (e) {
        console.error(e);
        return;
    }

    const imageFile = fs.readFileSync(filePath);
    const encodedImage = imageFile.toString('base64');

    console.log(`Testing Document AI Processing...`);

    try {
        const client = new DocumentProcessorServiceClient();
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

        const request = {
            name,
            rawDocument: {
                content: encodedImage,
                mimeType: 'image/jpeg',
            },
        };

        console.log(`Sending request to: ${name}`);
        const [result] = await client.processDocument(request);
        console.log('✅ Document AI processing complete.');
        console.log('Detailed output (text length):', result.document.text ? result.document.text.length : 0);
    } catch (error) {
        console.error('❌ Document AI Process Error:', error);
    }
}

testDocAIProcess();
