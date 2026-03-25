export interface QuoteCartOption {
  name: string;
  quantity: number;
  price: number;
}

export interface QuoteCartBasicComponent {
  name: string;
  quantity: number;
  model_name?: string;
}

export interface QuoteCartItem {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string;
  start_date: string;
  end_date: string;
  expected_people: number;
  total_price: number;
  selected_options: QuoteCartOption[];
  basic_components: QuoteCartBasicComponent[];
  created_at: string;
}

const QUOTE_CART_STORAGE_KEY = "hp_quote_cart_v1";

const canUseStorage = () => typeof window !== "undefined";

export const getQuoteCartItems = (): QuoteCartItem[] => {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuoteCartItem[]) : [];
  } catch (error) {
    console.error("Failed to parse quote cart data", error);
    return [];
  }
};

export const setQuoteCartItems = (items: QuoteCartItem[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(QUOTE_CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("quoteCartUpdated"));
};

export const addQuoteCartItem = (
  item: Omit<QuoteCartItem, "cart_item_id" | "created_at">,
) => {
  const current = getQuoteCartItems();
  const now = new Date().toISOString();

  const existingIndex = current.findIndex(
    (target) =>
      target.product_id === item.product_id &&
      target.start_date === item.start_date &&
      target.end_date === item.end_date,
  );

  const nextItem: QuoteCartItem = {
    ...item,
    cart_item_id:
      existingIndex >= 0
        ? current[existingIndex].cart_item_id
        : `${item.product_id}-${Date.now()}`,
    created_at: now,
  };

  if (existingIndex >= 0) {
    current[existingIndex] = nextItem;
  } else {
    current.push(nextItem);
  }

  setQuoteCartItems(current);
  return nextItem;
};

export const removeQuoteCartItem = (cartItemId: string) => {
  const filtered = getQuoteCartItems().filter(
    (item) => item.cart_item_id !== cartItemId,
  );
  setQuoteCartItems(filtered);
  return filtered;
};

export const clearQuoteCartItems = () => {
  setQuoteCartItems([]);
};

export const getQuoteCartCount = () => getQuoteCartItems().length;
