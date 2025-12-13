import { pipeline } from '@xenova/transformers';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: ['server/.env', '.env', '.env.local'] });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRAG() {
    console.log("🔍 Starting RAG Debug...");

    // 1. Check Table Count
    const { count, error: countError } = await supabase
        .from('documents_with_embeddings')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("❌ Error checking table count:", countError);
    } else {
        console.log(`✅ 'documents_with_embeddings' row count: ${count}`);
    }

    // 2. Test Embedding Generation
    console.log("🧠 Testing Embedding Generation with @xenova/transformers...");
    try {
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        const output = await extractor("bananas", { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);
        console.log(`✅ Embedding generated. Length: ${embedding.length} (Expected: 384)`);

        // 3. Test RPC
        console.log("📡 Testing match_documents RPC...");
        const { data, error: rpcError } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.01,
            match_count: 5
        });

        if (rpcError) {
            console.error("❌ RPC Error:", rpcError);
        } else {
            console.log(`✅ RPC Success. Found ${data.length} matches.`);
            if (data.length > 0) {
                console.log("   Top match:", data[0].content);

                // 4. Test OpenAI Generation
                console.log("🤖 Testing OpenAI Generation...");
                const { OpenAI } = await import('openai');
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    console.error("❌ Missing OPENAI_API_KEY");
                } else {
                    const openai = new OpenAI({ apiKey });
                    try {
                        const completion = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "user", content: "Say 'Hello from OpenAI'" }
                            ]
                        });
                        console.log("✅ OpenAI Response:", completion.choices[0].message.content);
                    } catch (openaiErr) {
                        console.error("❌ OpenAI Error:", openaiErr);
                    }
                }
            }
        }

    } catch (err) {
        console.error("❌ Detailed Error:", err);
    }
}

testRAG();
