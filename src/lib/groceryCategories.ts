/** Lightweight keyword categorizer for the grocery AddItemBar's auto-categorize (spec §5 M5). Not exhaustive by design — falls back to "Other" rather than guessing wrong. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Produce: ["apple", "banana", "lettuce", "spinach", "carrot", "onion", "potato", "tomato", "pepper", "avocado", "berries", "fruit", "vegetable", "garlic", "broccoli", "cucumber"],
  Dairy: ["milk", "cheese", "yogurt", "butter", "cream", "egg"],
  Meat: ["chicken", "beef", "pork", "turkey", "bacon", "sausage", "fish", "salmon", "shrimp"],
  Bakery: ["bread", "bagel", "tortilla", "muffin", "roll"],
  Pantry: ["rice", "pasta", "beans", "flour", "sugar", "oil", "cereal", "sauce", "soup", "can", "spice"],
  Frozen: ["frozen", "ice cream", "pizza"],
  Household: ["paper towel", "toilet paper", "detergent", "soap", "trash bag", "dish"],
};

export function categorize(label: string): string {
  const lower = label.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Other";
}
