
const { OpenAI } = require('openai');
const supabase = require('../supabaseClient');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Searches the vector store for receipt items semantically similar to the question.
 * @param {string} question 
 * @param {string} userId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function searchItemsVector(question, userId, limit = 20) {
    try {
        if (!question || !userId) return [];

        const embeddingResp = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: question,
        });
        const embedding = embeddingResp.data?.[0]?.embedding;
        if (!embedding) return [];

        const { data, error } = await supabase.rpc('match_receipt_items', {
            query_embedding: embedding,
            match_count: limit,
            _user_id: userId,
        });

        if (error) {
            console.error('searchItemsVector RPC error:', error.message);
            return [];
        }
        if (!data || !Array.isArray(data)) return [];

        return data
            .map((row) => ({
                receipt_id: row.receipt_id,
                item_name: row.item_name,
                main_category: row.main_category,
                sub_category: row.sub_category,
                price: row.total_price,
                merchant_name: row.merchant_name,
                transaction_date: row.transaction_date,
                similarity: row.similarity,
            }))
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    } catch (err) {
        console.error('searchItemsVector error:', err.message);
        return [];
    }
}

module.exports = { searchItemsVector };
