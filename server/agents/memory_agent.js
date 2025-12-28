
const { OpenAI } = require('openai');
const supabase = require('../supabaseClient');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function searchSqlMemory(question, matchThreshold = 0.8) {
    try {
        const embeddingResp = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: question,
        });
        const embedding = embeddingResp.data?.[0]?.embedding;

        const { data, error } = await supabase.rpc('match_sql_memory', {
            query_embedding: embedding,
            match_threshold: matchThreshold,
            match_count: 1
        });

        if (error) {
            console.error('Error searching SQL memory:', error);
            return null;
        }

        if (data && data.length > 0) {
            console.log('🧠 Found relevant SQL memory:', data[0].question);
            return data[0];
        }
        return null;
    } catch (err) {
        console.error('searchSqlMemory failed:', err);
        return null;
    }
}

async function saveSqlMemory(question, sqlQuery) {
    try {
        const embeddingResp = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: question,
        });
        const embedding = embeddingResp.data?.[0]?.embedding;

        const { data, error } = await supabase.from('sql_memory').insert({
            question,
            sql_query: sqlQuery,
            embedding
        }).select('id').single();

        if (error) {
            console.error('Error saving SQL memory:', error);
            return null;
        } else {
            console.log('💾 Saved successful SQL query to memory ID:', data.id);
            return data.id;
        }
    } catch (err) {
        console.error('saveSqlMemory failed:', err);
        return null;
    }
}

module.exports = { searchSqlMemory, saveSqlMemory };
