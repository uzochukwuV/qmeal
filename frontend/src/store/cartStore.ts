import { create } from 'zustand';

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  restaurant_id: string;
  restaurant_name?: string;
}

interface CartState {
  items: CartItem[];
  restaurant_id: string | null;
  restaurant_name: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (item_id: string) => void;
  updateQuantity: (item_id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurant_id: null,
  restaurant_name: null,

  addItem: (item) => {
    const state = get();
    
    // If cart has items from different restaurant, clear it
    if (state.restaurant_id && state.restaurant_id !== item.restaurant_id) {
      set({
        items: [{ ...item, quantity: 1 }],
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurant_name || null,
      });
      return;
    }

    // Check if item already exists
    const existingItem = state.items.find((i) => i.item_id === item.item_id);
    
    if (existingItem) {
      set({
        items: state.items.map((i) =>
          i.item_id === item.item_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [...state.items, { ...item, quantity: 1 }],
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurant_name || state.restaurant_name,
      });
    }
  },

  removeItem: (item_id) => {
    const state = get();
    const newItems = state.items.filter((i) => i.item_id !== item_id);
    set({
      items: newItems,
      restaurant_id: newItems.length > 0 ? state.restaurant_id : null,
      restaurant_name: newItems.length > 0 ? state.restaurant_name : null,
    });
  },

  updateQuantity: (item_id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(item_id);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.item_id === item_id ? { ...i, quantity } : i
      ),
    }));
  },

  clearCart: () => {
    set({ items: [], restaurant_id: null, restaurant_name: null });
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
