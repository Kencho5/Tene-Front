import { Injectable, signal, computed, effect } from '@angular/core';
import { CartItem } from '@core/interfaces/products.interface';

const CART_STORAGE_KEY = 'tene_cart';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  readonly items = signal<CartItem[]>(this.loadCartFromStorage());

  readonly itemCount = computed(() => {
    return this.items().reduce((total, item) => total + item.quantity, 0);
  });

  readonly totalPrice = computed(() => {
    return this.items().reduce((total, item) => {
      const price = this.calculateItemPrice(item);
      return total + price * item.quantity;
    }, 0);
  });

  constructor() {
    effect(() => {
      this.saveCartToStorage(this.items());
    });
  }

  addItem(item: CartItem): void {
    this.items.update((currentItems) => {
      const existingItemIndex = currentItems.findIndex(
        (i) =>
          i.product.id === item.product.id &&
          i.selectedColor === item.selectedColor &&
          i.selectedImageId === item.selectedImageId
      );

      if (existingItemIndex !== -1) {
        const updatedItems = [...currentItems];
        const existingItem = updatedItems[existingItemIndex];
        const maxQuantity = existingItem.product.quantity;
        const newQuantity = Math.min(
          existingItem.quantity + item.quantity,
          maxQuantity
        );

        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
        };

        return updatedItems;
      }

      return [...currentItems, item];
    });
  }

  removeItem(productId: number, color: string, imageId: string): void {
    this.items.update((currentItems) =>
      currentItems.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedColor === color &&
            item.selectedImageId === imageId
          )
      )
    );
  }

  updateQuantity(
    productId: number,
    color: string,
    imageId: string,
    quantity: number
  ): void {
    this.items.update((currentItems) => {
      return currentItems.map((item) => {
        if (
          item.product.id === productId &&
          item.selectedColor === color &&
          item.selectedImageId === imageId
        ) {
          const clampedQuantity = Math.max(
            1,
            Math.min(quantity, item.product.quantity)
          );
          return { ...item, quantity: clampedQuantity };
        }
        return item;
      });
    });
  }

  clearCart(): void {
    this.items.set([]);
  }

  private calculateItemPrice(item: CartItem): number {
    const originalPrice = item.product.price;
    const discountPercent = item.product.discount;

    if (discountPercent === 0) {
      return originalPrice;
    }

    const discountAmount = (originalPrice * discountPercent) / 100;
    const priceAfterDiscount = originalPrice - discountAmount;

    return Math.floor(priceAfterDiscount) + 0.99;
  }

  private loadCartFromStorage(): CartItem[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveCartToStorage(items: CartItem[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }
}
