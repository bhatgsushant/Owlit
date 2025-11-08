export const SUB_CATEGORIES = {
  // 🛒 Grocery & Food
  fruit: ["apples", "bananas", "berries", "citrus", "tropical", "grapes", "melons", "stone_fruit"],
  vegetable: ["leafy_greens", "root_vegetables", "cruciferous", "peppers", "tomatoes", "onions", "mushrooms", "squash"],
  meat: ["beef", "pork", "lamb", "veal", "processed_meats"],
  poultry: ["chicken", "turkey", "duck"],
  seafood: ["fish", "shellfish", "frozen_seafood", "canned_seafood"],
  dairy: ["milk", "cheese", "yogurt", "butter", "cream", "eggs"],
  bakery: ["bread", "pastries", "cakes", "cookies", "bagels", "muffins"],
  beverages: ["water", "soft_drinks", "coca cola", "juice", "coffee", "tea", "beer", "wine", "spirits", "energy_drinks"],
  snacks: ["chips", "crackers", "nuts", "candy", "chocolate", "popcorn", "protein_bars"],
  frozen: ["ice_cream", "frozen_meals", "frozen_vegetables", "frozen_pizza", "frozen_desserts"],
  canned_goods: ["canned_vegetables", "canned_fruits", "canned_soups", "canned_beans", "canned_fish", "sauces"],

  // 🧴 Personal & Health
  personal_care: ["soap", "shampoo", "toothpaste", "deodorant", "skincare", "cosmetics", "razor"],
  health: ["medicines", "vitamins", "first_aid", "sanitizer", "pain_relief", "supplements"],
  fitness: ["gym_membership", "yoga", "protein_powder", "fitness_equipment"],

  // 🏠 Home & Utilities
  household: ["cleaning_supplies", "paper_products", "laundry", "kitchen_supplies", "furniture", "decor"],
  electronics: ["mobile", "laptop", "tv", "earphones", "chargers", "home_appliances", "batteries"],
  utilities: ["electricity", "gas", "water", "internet", "mobile_bill"],

  // 👕 Fashion & Lifestyle
  clothing: ["t_shirts", "jeans", "jackets", "dresses", "shoes", "accessories", "socks", "belts", "hats"],
  jewelry: ["necklace", "rings", "bracelet", "earrings", "watches"],

  // 🚗 Travel & Commute
  transport: ["fuel", "parking", "bus", "train", "taxi", "uber", "bike_service"],
  travel: ["flight", "hotel", "restaurant", "tour", "car_rental", "visa_fee", "luggage"],

  // 💼 Office & Education
  stationery: ["pens", "notebooks", "printer_paper", "markers", "folders", "office_supplies"],
  education: ["books", "courses", "tuition", "software", "subscriptions", "school_fees"],

  // 💳 Financial & Misc
  finance: ["bank_fees", "interest", "investment", "insurance", "tax", "loan_repayment"],
  entertainment: ["movies", "music", "games", "subscriptions", "events", "streaming", "concerts"],
  pets: ["pet_food", "veterinary", "toys", "grooming"],
  gifts: ["birthday", "festival", "anniversary", "donation", "charity"],

  // 🍽️ Dining
  dining: ["restaurant", "takeaway", "coffee_shop", "fast_food", "pub", "bar"],

  // 🧾 Catch-all
  other: ["miscellaneous"]
};

function categorizeLine(line) {
    const lineLower = line.toLowerCase();
    for (const mainCategory in SUB_CATEGORIES) {
        for (const subCategory of SUB_CATEGORIES[mainCategory]) {
            if (lineLower.includes(subCategory.replace('_', ' ')))
 {
                return {
                    main_category: mainCategory,
                    sub_category: subCategory
                };
            }
        }
    }
    return {
        main_category: "other",
        sub_category: "miscellaneous"
    };
}

export function parseVoiceInput(transcript) {
    const lines = transcript.split(/\n|\s*and\s*|\s*then\s*/).filter(line => line.trim() !== '');
    const line_items = [];
    let merchant_name = '';

    const itemRegex = /(\d*\.?\d+)\s*([a-zA-Z\s]+?)\s*(\d*\.?\d+)\s*(?:pounds|gbp|£)?(?:\s*at\s*([a-zA-Z\s]+))?$/i;

    for (const line of lines) {
        const match = line.trim().match(itemRegex);
        if (match) {
            const [, quantity, item, price, store] = match;
            const categorization = categorizeLine(item);
            line_items.push({
                item: item.trim(),
                quantity: parseFloat(quantity) || 1,
                price: parseFloat(price),
                ...categorization
            });
            if (store && !merchant_name) {
                merchant_name = store.trim();
            }
        }
    }

    // If no merchant was found in the lines, we can try to find a merchant name mentioned alone
    if (!merchant_name) {
        const merchantRegex = /at\s+([a-zA-Z\s]+)/i;
        const merchantMatch = transcript.match(merchantRegex);
        if (merchantMatch) {
            merchant_name = merchantMatch[1].trim();
        }
    }

    return {
        merchant_name,
        transaction_date: new Date().toISOString().split('T')[0],
        line_items,
        total_amount: line_items.reduce((acc, item) => acc + item.price * item.quantity, 0)
    };
}
