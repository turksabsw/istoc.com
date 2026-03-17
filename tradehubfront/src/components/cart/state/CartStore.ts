/**
 * CartStore — Merkezi State Store
 * Singleton pattern ile sepet verisi yönetimi.
 * Tüm CRUD operasyonları burada, DOM "source of truth" olmaktan çıkıyor.
 */

import type { CartSupplier, CartProduct, CartSku, CartSummaryData } from '../../../types/cart';
import { convertPrice, getSelectedCurrencyInfo } from '../../../services/currencyService';

export class CartStore {
  private static STORAGE_KEY = 'tradehub_cart';

  private suppliers: CartSupplier[] = [];
  private shippingFee = 0;
  private discount = 0;
  private currency = '$';
  private listeners = new Set<() => void>();

  // ──────────────── INIT ────────────────

  init(suppliers: CartSupplier[], shippingFee = 0, currency = '$', discount = 0): void {
    this.suppliers = structuredClone(suppliers);
    this.shippingFee = shippingFee;
    this.discount = discount;
    this.currency = currency;
    this.notify();
  }

  /** localStorage'dan sepet verisini yükle */
  load(): boolean {
    try {
      const raw = localStorage.getItem(CartStore.STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as {
        suppliers: CartSupplier[];
        shippingFee: number;
        discount: number;
        currency: string;
      };
      if (!Array.isArray(data.suppliers) || data.suppliers.length === 0) return false;
      this.suppliers = data.suppliers;
      this.shippingFee = data.shippingFee ?? 0;
      this.discount = data.discount ?? 0;
      // Bozuk veriyi temizle: qty=0 SKU'lar, SKU'suz ürünler, ürünsüz supplier'lar
      this.sanitize();
      // Recalculate all prices from base currency for current selected currency
      this.recalculateAllPrices();
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  /** Mevcut durumu localStorage'a kaydet */
  private save(): void {
    try {
      localStorage.setItem(
        CartStore.STORAGE_KEY,
        JSON.stringify({
          suppliers: this.suppliers,
          shippingFee: this.shippingFee,
          discount: this.discount,
          currency: this.currency,
        }),
      );
    } catch { /* quota exceeded — sessizce geç */ }
  }

  // ──────────────── READ ────────────────

  getSuppliers(): CartSupplier[] {
    return this.suppliers;
  }

  getSupplier(supplierId: string): CartSupplier | undefined {
    return this.suppliers.find((s) => s.id === supplierId);
  }

  getProduct(productId: string): { supplier: CartSupplier; product: CartProduct } | undefined {
    for (const supplier of this.suppliers) {
      const product = supplier.products.find((p) => p.id === productId);
      if (product) return { supplier, product };
    }
    return undefined;
  }

  getSku(skuId: string): { supplier: CartSupplier; product: CartProduct; sku: CartSku } | undefined {
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        const sku = product.skus.find((s) => s.id === skuId);
        if (sku) return { supplier, product, sku };
      }
    }
    return undefined;
  }

  getSelectedSkus(): CartSku[] {
    const selected: CartSku[] = [];
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        for (const sku of product.skus) {
          if (sku.selected) selected.push(sku);
        }
      }
    }
    return selected;
  }

  getSelectedSkuMoqViolations(): Array<{
    skuId: string;
    minQty: number;
    quantity: number;
    missingQty: number;
  }> {
    const violations: Array<{
      skuId: string;
      minQty: number;
      quantity: number;
      missingQty: number;
    }> = [];

    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        for (const sku of product.skus) {
          if (!sku.selected) continue;
          if (sku.quantity >= sku.minQty) continue;

          violations.push({
            skuId: sku.id,
            minQty: sku.minQty,
            quantity: sku.quantity,
            missingQty: sku.minQty - sku.quantity,
          });
        }
      }
    }

    return violations;
  }

  hasSelectedSkuMoqViolation(): boolean {
    return this.getSelectedSkuMoqViolations().length > 0;
  }

  getAllSkus(): CartSku[] {
    const all: CartSku[] = [];
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        for (const sku of product.skus) {
          all.push(sku);
        }
      }
    }
    return all;
  }

  getSummary(): CartSummaryData {
    let selectedCount = 0;
    let productSubtotal = 0;
    const items: { image: string; quantity: number }[] = [];

    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        for (const sku of product.skus) {
          if (sku.selected) {
            selectedCount++;
            productSubtotal += sku.unitPrice * sku.quantity;
            items.push({ image: sku.skuImage, quantity: sku.quantity });
          }
        }
      }
    }

    return {
      selectedCount,
      items,
      productSubtotal,
      discount: this.discount,
      shippingFee: this.shippingFee,
      subtotal: productSubtotal - this.discount + this.shippingFee,
      currency: getSelectedCurrencyInfo().symbol,
    };
  }

  getTotalSkuCount(): number {
    let count = 0;
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        count += product.skus.length;
      }
    }
    return count;
  }

  getSelectedSkuCount(): number {
    return this.getSelectedSkus().length;
  }

  // ──────────────── CREATE ────────────────

  addSupplier(supplier: CartSupplier): void {
    this.suppliers.push(structuredClone(supplier));
    this.notify();
  }

  addProduct(supplierId: string, product: CartProduct): void {
    const supplier = this.getSupplier(supplierId);
    if (!supplier) return;
    supplier.products.push(structuredClone(product));
    this.notify();
  }

  addSku(productId: string, sku: CartSku): void {
    const found = this.getProduct(productId);
    if (!found) return;
    found.product.skus.push(structuredClone(sku));
    this.recalculateProductPrices(found.product);
    this.notify();
  }

  // ──────────────── UPDATE ────────────────

  updateSkuQuantity(skuId: string, quantity: number): void {
    const found = this.getSku(skuId);
    if (!found) return;
    found.sku.quantity = quantity;
    this.recalculateProductPrices(found.product);
    this.notify();
  }

  fillSkuToMinQty(skuId: string): void {
    const found = this.getSku(skuId);
    if (!found) return;

    if (found.sku.quantity < found.sku.minQty) {
      found.sku.quantity = found.sku.minQty;
      this.notify();
    }
  }

  toggleSkuSelection(skuId: string, selected: boolean): void {
    const found = this.getSku(skuId);
    if (!found) return;
    found.sku.selected = selected;
    this.syncParentSelection(found.product, found.supplier);
    this.notify();
  }

  toggleProductSelection(productId: string, selected: boolean): void {
    const found = this.getProduct(productId);
    if (!found) return;
    found.product.selected = selected;
    for (const sku of found.product.skus) {
      sku.selected = selected;
    }
    this.syncSupplierSelection(found.supplier);
    this.notify();
  }

  toggleSupplierSelection(supplierId: string, selected: boolean): void {
    const supplier = this.getSupplier(supplierId);
    if (!supplier) return;
    supplier.selected = selected;
    for (const product of supplier.products) {
      product.selected = selected;
      for (const sku of product.skus) {
        sku.selected = selected;
      }
    }
    this.notify();
  }

  toggleAll(selected: boolean): void {
    for (const supplier of this.suppliers) {
      supplier.selected = selected;
      for (const product of supplier.products) {
        product.selected = selected;
        for (const sku of product.skus) {
          sku.selected = selected;
        }
      }
    }
    this.notify();
  }

  toggleFavorite(productId: string): void {
    const found = this.getProduct(productId);
    if (!found) return;
    // Toggle between ♡ and ♥
    found.product.favoriteIcon = found.product.favoriteIcon === '♥' ? '♡' : '♥';
    this.notify();
  }

  // ──────────────── DELETE ────────────────

  deleteSku(skuId: string): void {
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        const idx = product.skus.findIndex((s) => s.id === skuId);
        if (idx !== -1) {
          product.skus.splice(idx, 1);
          // Cascade: product boşsa sil
          if (product.skus.length === 0) {
            this.removeProduct(supplier, product.id);
          }
          this.notify();
          return;
        }
      }
    }
  }

  deleteProduct(productId: string): void {
    for (const supplier of this.suppliers) {
      const idx = supplier.products.findIndex((p) => p.id === productId);
      if (idx !== -1) {
        supplier.products.splice(idx, 1);
        // Cascade: supplier boşsa sil
        if (supplier.products.length === 0) {
          this.removeSupplier(supplier.id);
        }
        this.notify();
        return;
      }
    }
  }

  deleteSupplier(supplierId: string): void {
    this.removeSupplier(supplierId);
    this.notify();
  }

  deleteSelected(): void {
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        product.skus = product.skus.filter((s) => !s.selected);
      }
      supplier.products = supplier.products.filter((p) => p.skus.length > 0);
    }
    this.suppliers = this.suppliers.filter((s) => s.products.length > 0);
    this.notify();
  }

  // ──────────────── SUBSCRIPTION ────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    this.save();
    for (const listener of this.listeners) {
      listener();
    }
  }

  // ──────────────── PRIVATE HELPERS ────────────────

  private removeProduct(supplier: CartSupplier, productId: string): void {
    supplier.products = supplier.products.filter((p) => p.id !== productId);
    if (supplier.products.length === 0) {
      this.removeSupplier(supplier.id);
    }
  }

  private removeSupplier(supplierId: string): void {
    this.suppliers = this.suppliers.filter((s) => s.id !== supplierId);
  }

  /** Bozuk veriyi temizle: qty<=0 SKU'lar, SKU'suz ürünler, ürünsüz supplier'lar sil */
  private sanitize(): void {
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        product.skus = product.skus.filter(s => s.quantity > 0);
      }
      supplier.products = supplier.products.filter(p => p.skus.length > 0);
    }
    this.suppliers = this.suppliers.filter(s => s.products.length > 0);
  }

  /** Ürünün toplam miktarına göre tier fiyatını yeniden hesapla (base prices -> selected currency) */
  private recalculateProductPrices(product: CartProduct): void {
    const info = getSelectedCurrencyInfo();
    const baseCur = product.baseCurrency || 'USD';

    // priceTiers yoksa (eski veri) — sadece SKU'ların currency sembolünü güncelle
    // ve baseUnitPrice varsa dönüşüm yap
    if (!product.priceTiers || product.priceTiers.length === 0) {
      for (const sku of product.skus) {
        sku.currency = info.symbol;
        if (sku.baseUnitPrice != null && sku.baseCurrency) {
          sku.unitPrice = convertPrice(sku.baseUnitPrice, sku.baseCurrency);
          sku.priceAddon = convertPrice(sku.basePriceAddon ?? 0, sku.baseCurrency);
        }
      }
      return;
    }

    const totalQty = product.skus.reduce((sum, s) => sum + s.quantity, 0);

    // En uygun tier'ı bul (en yüksek minQty'den başlayarak) — tiers store base prices
    let baseTierPrice = product.priceTiers[0].price;
    for (let i = product.priceTiers.length - 1; i >= 0; i--) {
      if (totalQty >= product.priceTiers[i].minQty) {
        baseTierPrice = product.priceTiers[i].price;
        break;
      }
    }

    // Convert base tier price to selected currency
    const convertedTierPrice = convertPrice(baseTierPrice, baseCur);

    // Her SKU'nun birim fiyatını güncelle: converted tier + converted addon
    for (const sku of product.skus) {
      const convertedAddon = convertPrice(sku.basePriceAddon ?? 0, baseCur);
      sku.unitPrice = convertedTierPrice + convertedAddon;
      sku.priceAddon = convertedAddon;
      sku.currency = info.symbol;
    }
  }

  /** Tüm ürünlerin fiyatlarını seçili para birimi için yeniden hesapla */
  private recalculateAllPrices(): void {
    const info = getSelectedCurrencyInfo();
    this.currency = info.symbol;
    for (const supplier of this.suppliers) {
      for (const product of supplier.products) {
        this.recalculateProductPrices(product);
      }
    }
  }

  /** SKU toggle sonrası parent product/supplier seçim durumunu senkronize et */
  private syncParentSelection(product: CartProduct, supplier: CartSupplier): void {
    product.selected = product.skus.every((s) => s.selected);
    this.syncSupplierSelection(supplier);
  }

  private syncSupplierSelection(supplier: CartSupplier): void {
    supplier.selected = supplier.products.every((p) => p.selected);
  }
}

export const cartStore = new CartStore();
