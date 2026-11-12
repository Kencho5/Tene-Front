import { Injectable, signal, computed, effect } from '@angular/core';
import { CartItem, Product } from '@core/interfaces/products.interface';
import { calculateDiscount } from '@utils/discountedPrice';

const CART_STORAGE_KEY = 'tene_cart';

function sameCableConfig(
  a: CartItem['cableConfig'],
  b: CartItem['cableConfig'],
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.watts === b.watts && a.lengthCm === b.lengthCm;
}

function lineKey(item: CartItem): string {
  return `${item.product.id}|${item.selectedColor}|${item.selectedImageId}`;
}

function stripCombo(item: CartItem): CartItem {
  const { combo: _combo, ...rest } = item;
  return rest;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  readonly items = signal<CartItem[]>(this.loadCartFromStorage());

  readonly isDeleteModalOpen = signal(false);
  readonly itemToDelete = signal<CartItem | null>(null);

  readonly deleteModalMessage = computed(() => {
    const item = this.itemToDelete();
    if (!item) return 'ნამდვილად გსურთ ამ ნივთის წაშლა თქვენი კალათიდან?';
    if (item.combo?.isMain && this.groupMembers(item).length > 1) {
      return `ნამდვილად გსურთ ${item.product.name} და მასთან კომბოში დამატებული პროდუქტების წაშლა?`;
    }
    return `ნამდვილად გსურთ ${item.product.name} წაშლა თქვენი კალათიდან?`;
  });

  readonly itemCount = computed(() => {
    return this.items().reduce((total, item) => total + item.quantity, 0);
  });

  readonly totalPrice = computed(() => {
    return this.items().reduce((total, item) => {
      if (this.needsCableConfig(item)) return total;
      return total + this.unitPrice(item) * item.quantity;
    }, 0);
  });

  readonly hasUnconfiguredCables = computed(() =>
    this.items().some((item) => this.needsCableConfig(item)),
  );

  readonly totalDiscount = computed(() => {
    return this.items().reduce((total, item) => {
      if (this.needsCableConfig(item)) return total;
      const savings = (this.originalUnitPrice(item) - this.unitPrice(item)) * item.quantity;
      return total + Math.max(0, savings);
    }, 0);
  });

  constructor() {
    effect(() => {
      this.saveCartToStorage(this.items());
    });
  }

  unitPrice(item: CartItem): number {
    if (item.combo && !(item.combo.isMain && item.combo.pricingType === 'addon_price')) {
      return item.combo.unitPrice;
    }
    if (item.cableConfig) return item.cableConfig.price;
    return calculateDiscount(item.product);
  }

  originalUnitPrice(item: CartItem): number {
    if (item.cableConfig) return item.cableConfig.price;
    return Number(item.product.price);
  }

  hasComboPrice(item: CartItem): boolean {
    return !!item.combo && this.unitPrice(item) < this.regularUnitPrice(item);
  }

  regularUnitPrice(item: CartItem): number {
    if (item.cableConfig) return item.cableConfig.price;
    return calculateDiscount(item.product);
  }

  groupMembers(item: CartItem): CartItem[] {
    if (!item.combo) return [item];
    const group = item.combo.group;
    return this.items().filter((i) => i.combo?.group === group);
  }

  addItem(item: CartItem): void {
    if (item.selectedImageQuantity === 0) return;
    this.items.set(this.loadCartFromStorage());
    this.items.update((currentItems) => {
      const existingItemIndex = currentItems.findIndex(
        (i) =>
          !i.combo &&
          i.product.id === item.product.id &&
          i.selectedColor === item.selectedColor &&
          i.selectedImageId === item.selectedImageId &&
          sameCableConfig(i.cableConfig, item.cableConfig),
      );

      if (existingItemIndex !== -1) {
        const updatedItems = [...currentItems];
        const existingItem = updatedItems[existingItemIndex];
        const maxQuantity = existingItem.selectedImageQuantity;
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

  addCombo(lines: CartItem[]): void {
    const main = lines.find((l) => l.combo?.isMain);
    if (!main?.combo || lines.some((l) => l.selectedImageQuantity === 0)) return;

    this.items.set(this.loadCartFromStorage());
    this.items.update((currentItems) => {
      const wanted = new Set(lines.map(lineKey));
      const existingGroup = [...new Set(currentItems.map((i) => i.combo?.group))].find((group) => {
        if (!group) return false;
        const members = currentItems.filter((i) => i.combo?.group === group);
        return (
          members[0].combo!.offerId === main.combo!.offerId &&
          members.length === lines.length &&
          members.every((m) => wanted.has(lineKey(m)) && sameCableConfig(
            m.cableConfig,
            lines.find((l) => lineKey(l) === lineKey(m))?.cableConfig,
          ))
        );
      });

      if (existingGroup) {
        const members = currentItems.filter((i) => i.combo?.group === existingGroup);
        const max = Math.min(...members.map((m) => m.selectedImageQuantity));
        const quantity = Math.min(members[0].quantity + main.quantity, max);
        return currentItems.map((i) =>
          i.combo?.group === existingGroup ? { ...i, quantity } : i,
        );
      }

      const max = Math.min(...lines.map((l) => l.selectedImageQuantity));
      const quantity = Math.max(1, Math.min(main.quantity, max));
      return [...currentItems, ...lines.map((l) => ({ ...l, quantity }))];
    });
  }

  removeItem(target: CartItem): void {
    const combo = target.combo;
    if (!combo) {
      this.items.update((currentItems) => currentItems.filter((item) => item !== target));
      return;
    }

    this.items.update((currentItems) => {
      if (combo.isMain) {
        return currentItems.filter((item) => item.combo?.group !== combo.group);
      }

      const remaining = currentItems.filter((item) => item !== target);
      const groupLeft = remaining.filter((item) => item.combo?.group === combo.group);
      const dissolve =
        combo.pricingType === 'bundle_price' || groupLeft.every((item) => item.combo?.isMain);
      if (!dissolve) return remaining;

      return remaining.map((item) =>
        item.combo?.group === combo.group ? stripCombo(item) : item,
      );
    });
  }

  updateQuantity(target: CartItem, quantity: number): void {
    const group = target.combo?.group;
    this.items.update((currentItems) => {
      const members = group
        ? currentItems.filter((item) => item.combo?.group === group)
        : [target];
      const max = Math.min(...members.map((m) => m.selectedImageQuantity));
      const clampedQuantity = Math.max(1, Math.min(quantity, max));

      return currentItems.map((item) =>
        item === target || (group && item.combo?.group === group)
          ? { ...item, quantity: clampedQuantity }
          : item,
      );
    });
  }

  maxQuantity(target: CartItem): number {
    return Math.min(...this.groupMembers(target).map((m) => m.selectedImageQuantity));
  }

  setCableConfig(target: CartItem, cableConfig: CartItem['cableConfig'] | null): void {
    this.items.update((currentItems) =>
      currentItems.map((item) =>
        item === target ? { ...item, cableConfig: cableConfig ?? undefined } : item,
      ),
    );
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
      this.removeItem(item);
      this.closeDeleteModal();
    }
  }

  discountedPrice(product: Product): number {
    return calculateDiscount(product);
  }

  calculateTotalPrice(price: number, quantity: number): number {
    return Math.round(price * quantity * 100) / 100;
  }

  private needsCableConfig(item: CartItem): boolean {
    return item.product.cable_type_id != null && !item.cableConfig;
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
