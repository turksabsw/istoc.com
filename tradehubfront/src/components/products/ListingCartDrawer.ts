import { t } from '../../i18n';
import type { ProductListingCard } from '../../types/productListing';
import type { ProductDetail } from '../../types/product';
import { getListingDetail } from '../../services/listingService';
import {
  SharedCartDrawer,
  initSharedCartDrawer,
  openSharedCartDrawer,
  type CartDrawerItemModel,
  type CartDrawerTierModel,
  type CartDrawerColorModel,
  type CartDrawerShippingOption,
} from '../cart/overlay/SharedCartDrawer';

// ── Mappers: ProductDetail → CartDrawerItemModel ──

function toShippingOptions(product: ProductDetail): CartDrawerShippingOption[] {
  if (product.shipping.length === 0) {
    return [
      { id: 'standard', method: t('products.standardShipping'), estimatedDays: t('products.businessDays', { days: '10-20' }), cost: 0, costText: t('products.freeShipping') },
    ];
  }
  return product.shipping.map((option, index) => {
    const numeric = Number(option.cost.replace(/[^0-9.]/g, '')) || 0;
    return {
      id: `ship-${index + 1}`,
      method: option.method,
      estimatedDays: option.estimatedDays,
      cost: numeric,
      costText: option.cost,
    };
  });
}

function toColors(product: ProductDetail): CartDrawerColorModel[] {
  const colorVariant = product.variants.find((variant) => variant.type === 'color');
  if (!colorVariant || colorVariant.options.length === 0) {
    // No color variants — show single default entry with product image
    return [{
      id: 'default-color',
      label: t('products.defaultColor'),
      colorHex: '#999999',
      imageKind: 'jewelry',
      imageUrl: product.images[0]?.src,
    }];
  }

  return colorVariant.options.map((option, index) => ({
    id: option.id || `color-${index + 1}`,
    label: option.label,
    colorHex: option.value,
    imageKind: 'jewelry',
    imageUrl: option.thumbnail || product.images[0]?.src,
  }));
}

function toDrawerItem(product: ProductDetail): CartDrawerItemModel {
  const tiers: CartDrawerTierModel[] = product.priceTiers.map((tier) => ({
    minQty: tier.minQty,
    maxQty: tier.maxQty,
    price: tier.price,
  }));

  return {
    id: product.id,
    title: product.title,
    supplierName: product.supplier.name,
    unit: product.unit,
    moq: product.moq,
    imageKind: 'jewelry',
    priceTiers: tiers,
    colors: toColors(product),
    shippingOptions: toShippingOptions(product),
    samplePrice: product.samplePrice,
  };
}

// ── Fallback: build minimal item from listing card (before API loads) ──

function parsePriceRange(priceText: string): { low: number; high: number } {
  const matches = priceText.match(/[\d.]+/g);
  if (!matches || matches.length === 0) return { low: 0, high: 0 };
  if (matches.length === 1) {
    const value = Number(matches[0]);
    return { low: value, high: value };
  }
  const a = Number(matches[0]);
  const b = Number(matches[1]);
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

function parseMoq(moqText: string): number {
  const found = moqText.match(/(\d+)/);
  return found ? Number(found[1]) : 1;
}

function toMinimalDrawerItem(product: ProductListingCard): CartDrawerItemModel {
  const moq = parseMoq(product.moq);
  const { low, high } = parsePriceRange(product.price);
  const mid = Math.round(((low + high) / 2) * 100) / 100;

  return {
    id: product.id,
    title: product.name,
    supplierName: product.supplierName || '',
    unit: t('cart.unit'),
    moq,
    imageKind: 'jewelry',
    priceTiers: [
      { minQty: Math.max(1, moq), maxQty: 49, price: high || low },
      { minQty: 50, maxQty: 199, price: mid || low },
      { minQty: 200, maxQty: null, price: low },
    ],
    colors: [{
      id: 'default-color',
      label: t('products.defaultColor'),
      colorHex: '#999999',
      imageKind: 'jewelry',
      imageUrl: product.imageSrc,
    }],
    shippingOptions: [
      { id: 'standard', method: t('products.standardShipping'), estimatedDays: t('products.businessDays', { days: '10-20' }), cost: 0, costText: t('products.freeShipping') },
    ],
  };
}

// ── Cache for fetched product details ──
const detailCache = new Map<string, ProductDetail>();

// ── Public API ──

export function ListingCartDrawer(): string {
  return SharedCartDrawer();
}

export function initListingCartDrawer(products: ProductListingCard[]): void {
  // Register minimal items so drawer can open immediately
  const drawerItems = products.map(toMinimalDrawerItem);
  initSharedCartDrawer(drawerItems);

  // Intercept add-to-cart clicks to fetch real data before opening
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const cartTrigger = target.closest<HTMLElement>('[data-add-to-cart]');
    if (!cartTrigger) return;

    const id = cartTrigger.dataset.addToCart;
    if (!id) return;

    // Prevent the default SharedCartDrawer handler from firing first
    event.stopPropagation();
    event.preventDefault();

    // Check cache first
    if (detailCache.has(id)) {
      const item = toDrawerItem(detailCache.get(id)!);
      initSharedCartDrawer([item]);
      openSharedCartDrawer(item.id);
      return;
    }

    // Fetch real product detail from API
    try {
      const detail = await getListingDetail(id);
      detailCache.set(id, detail);
      const item = toDrawerItem(detail);
      initSharedCartDrawer([item]);
      openSharedCartDrawer(item.id);
    } catch (err) {
      console.warn('[ListingCartDrawer] Failed to fetch product detail, using minimal data:', err);
      // Fallback: open with minimal listing data
      const listingProduct = products.find(p => p.id === id);
      if (listingProduct) {
        const item = toMinimalDrawerItem(listingProduct);
        initSharedCartDrawer([item]);
        openSharedCartDrawer(item.id);
      }
    }
  }, true); // Use capture phase to run before SharedCartDrawer's click handler
}
