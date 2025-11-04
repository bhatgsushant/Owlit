import { STORE_DATA } from './logo';

export function getMerchantLogoUrl(merchantName) {
    if (!merchantName) return null;

    const normalizedName = merchantName.toLowerCase().trim();
    const storeInfo = STORE_DATA[normalizedName];

    if (storeInfo && storeInfo.domain) {
        // Using Clearbit for logos. Replace with your preferred service if different.
        return `https://logo.clearbit.com/${storeInfo.domain}?size=32`;
    }

    // Fallback for common merchants not in STORE_DATA but might have a clearbit logo
    // This is a heuristic and might not always work
    const simpleDomain = normalizedName.replace(/[^a-z0-9]/g, '') + '.com';
    return `https://logo.clearbit.com/${simpleDomain}?size=32`;
}
