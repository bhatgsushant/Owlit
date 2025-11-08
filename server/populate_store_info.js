
const supabase = require('./supabaseClient.js');
const fs = require('fs').promises;
const path = require('path');

async function populateStoreInfo() {
    console.log('Populating store_info table...');

    const logoJsPath = path.resolve(__dirname, '../src/utils/logo.js');
    const fileContent = await fs.readFile(logoJsPath, 'utf-8');

    const lines = fileContent.split('\n');
    let currentMainCategory = null;
    const storeData = [];

    for (const line of lines) {
        const mainCategoryMatch = line.match(/\/\/\s*.*?\s*(.*)/);
        if (mainCategoryMatch && mainCategoryMatch[1] && (line.includes('🛒') || line.includes('🍔') || line.includes('👗') || line.includes('💻') || line.includes('🏠') || line.includes('💄') || line.includes('🛍️') || line.includes('🚗') || line.includes('🍴') || line.includes('🐾') || line.includes('💳') || line.includes('🧳') || line.includes('💊') || line.includes('📦') || line.includes('🎮') || line.includes('📚'))) {
            currentMainCategory = mainCategoryMatch[1].trim();
        }


        const storeMatch = line.match(/'(.*)':\s*{\s*domain:\s*'(.*)',\s*StoreName_category:\s*'(.*)'\s*}/);
        if (storeMatch) {
            const merchant_name = storeMatch[1];
            const domain = storeMatch[2];
            const store_type = storeMatch[3];

            storeData.push({
                merchant_name,
                domain,
                main_category: currentMainCategory,
                store_type,
            });
        }
    }

    if (storeData.length > 0) {
        // Use upsert to avoid errors on re-running the script
        const { data, error } = await supabase
            .from('store_info')
            .upsert(storeData, { onConflict: 'merchant_name' })
            .select();

        if (error) {
            console.error('Error populating store_info table:', error);
        } else {
            console.log(`Successfully inserted/updated ${data.length} records into store_info.`);
        }
    } else {
        console.log('No store data found to populate.');
    }
}

populateStoreInfo();
