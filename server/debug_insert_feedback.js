require('dotenv').config();
const supabase = require('./supabaseClient.js');

async function testInsert() {
    console.log("🧪 Testing Supabase Insert into 'feedbacks'...");

    // We need a valid user_id. Let's pick one from 'profiles'.
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id').limit(1);

    if (profileError) {
        console.error("❌ Failed to fetch profiles:", profileError);
        return;
    }

    const userId = profiles?.[0]?.id;

    if (!userId) {
        console.log("❌ No users found in profiles to test with.");
        return;
    }

    console.log(`👤 Using User ID: ${userId}`);

    const payload = {
        user_id: userId,
        question: "Test Question",
        answer: "Test Answer",
        feedback: "good",
        memory_id: null
    };

    const { data, error } = await supabase
        .from('feedbacks')
        .insert(payload)
        .select();

    if (error) {
        console.error("❌ Insert Failed:", error);
    } else {
        console.log("✅ Insert Success:", data);

        // Clean up
        const { error: delError } = await supabase
            .from('feedbacks')
            .delete()
            .eq('id', data[0].id);

        if (delError) console.error("⚠️ Cleanup failed:", delError);
        else console.log("🧹 Cleanup successful.");
    }
}

testInsert();
