import { Injectable, signal, computed, effect } from '@angular/core';
import { CartItem } from '@core/interfaces/products.interface';
import { calculateDiscount } from '@utils/discountedPrice';

const CART_STORAGE_KEY = 'tene_cart';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  readonly items = signal<CartItem[]>(this.loadCartFromStorage());

  readonly isDeleteModalOpen = signal(false);
  readonly itemToDelete = signal<CartItem | null>(null);

  readonly deleteModalMessage = computed(() => {
    const item = this.itemToDelete();
    return item
      ? `ნამდვილად გსურთ ${item.product.name} წაშლა თქვენი კალათიდან?`
      : 'ნამდვილად გსურთ ამ ნივთის წაშლა თქვენი კალათიდან?';
  });

  readonly itemCount = computed(() => {
    return this.items().reduce((total, item) => total + item.quantity, 0);
  });

  readonly totalPrice = computed(() => {
    return this.items().reduce((total, item) => {
      const price = calculateDiscount(item.product);
      return total + price * item.quantity;
    }, 0);
  });

  readonly totalDiscount = computed(() => {
    return this.items().reduce((total, item) => {
      if (item.product.discount === 0) {
        return total;
      }

      const originalPrice = item.product.price * item.quantity;
      const discountedPrice = calculateDiscount(item.product) * item.quantity;
      const savings = originalPrice - discountedPrice;

      return total + savings;
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
          i.selectedImageId === item.selectedImageId,
      );

      if (existingItemIndex !== -1) {
        const updatedItems = [...currentItems];
        const existingItem = updatedItems[existingItemIndex];
        const maxQuantity = existingItem.product.quantity;
        const newQuantity = Math.min(
          existingItem.quantity + item.quantity,
          maxQuantity,
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
          ),
      ),
    );
  }

  updateQuantity(
    productId: number,
    color: string,
    imageId: string,
    quantity: number,
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
            Math.min(quantity, item.product.quantity),
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

  openDeleteModal(item: CartItem): void {
    this.itemToDelete.set(item);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.itemToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.itemToDelete();
    if (item) {
      this.removeItem(
        item.product.id,
        item.selectedColor,
        item.selectedImageId,
      );
      this.closeDeleteModal();
    }
  }

  calculateFinalPrice(price: number, discount: number): number {
    if (discount === 0) {
      return price;
    }

    const discountAmount = (price * discount) / 100;
    const priceAfterDiscount = price - discountAmount;

    return Math.round(priceAfterDiscount * 100) / 100;
  }

  calculateTotalPrice(price: number, quantity: number): number {
    return Math.round(price * quantity * 100) / 100;
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
