import 'dotenv/config';
import { createRequire } from 'module';
import supabase from '../server/supabaseClient.js';

const require = createRequire(import.meta.url);
const { buildReceiptHash } = require('../server/utils/receiptHash.js');

async function backfillReceiptHashes() {
  const { data: receipts, error } = await supabase.from('receipts').select('*');
  if (error) {
    throw new Error(`Failed to fetch receipts: ${error.message}`);
  }

  for (const receipt of receipts ?? []) {
    const receipt_hash = buildReceiptHash(receipt.user_id, receipt);
    const { error: updateError } = await supabase
      .from('receipts')
      .update({ receipt_hash })
      .eq('id', receipt.id);

    if (updateError) {
      throw new Error(`Failed to update receipt ${receipt.id}: ${updateError.message}`);
    }

    console.log(`✅ Updated receipt ${receipt.id}`);
  }

  console.log('🎉 Receipt hash backfill complete.');
}

backfillReceiptHashes().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
