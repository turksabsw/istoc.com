import { getCurrentProduct } from '../../alpine/product';
import type { ProductDetail } from '../../types/product';
import {
  SharedCartDrawer,
  SharedShippingModal,
  initSharedCartDrawer,
  initSharedShippingModal,
  openSharedCartDrawer,
  openSharedShippingModal,
  type CartDrawerColorModel,
  type CartDrawerItemModel,
  type CartDrawerShippingOption,
  type CartDrawerTierModel,
  type CartDrawerVariantGroup,
} from '../cart/overlay/SharedCartDrawer';

export interface CartDrawerTier {
  minQty: number;
  maxQty: number | null;
  price: number;
}

export interface CartDrawerContext {
  title?: string;
  priceTiers?: CartDrawerTier[];
  moq?: number;
  unit?: string;
}

const fallbackColorPalette: Array<{ label: string; hex: string }> = [
  { label: 'Altin', hex: '#D4AF37' },
  { label: 'Gumus', hex: '#C0C0C0' },
  { label: 'Rose Gold', hex: '#B76E79' },
  { label: 'Siyah', hex: '#6B7280' },
];

let currentContext: CartDrawerContext | null = null;

function toShippingOptions(product: ProductDetail): CartDrawerShippingOption[] {
  return product.shipping.map((option, index) => {
    // Parse cost from formatted string — handle both "₺400,00" (TR) and "$400.00" (EN)
    const normalized = option.cost.replace(/[^0-9.,]/g, '').replace(',', '.');
    const numeric = Number(normalized) || 0;
    return {
      id: `ship-${index + 1}`,
      method: option.method,
      estimatedDays: option.estimatedDays,
      cost: numeric,
      costText: option.cost,
      baseCost: option.baseCost ?? numeric,
      baseCurrency: option.baseCurrency || product.baseCurrency || 'USD',
    };
  });
}

function toColors(product: ProductDetail): CartDrawerColorModel[] {
  const colorVariant = product.variants.find((variant) => variant.type === 'color');
  if (!colorVariant || colorVariant.options.length === 0) {
    return fallbackColorPalette.map((entry, index) => ({
      id: `fallback-color-${index + 1}`,
      label: entry.label,
      colorHex: entry.hex,
      imageKind: 'jewelry',
      imageUrl: product.images[0]?.src
    }));
  }

  return colorVariant.options.map((option, index) => ({
    id: option.id || `color-${index + 1}`,
    label: option.label,
    colorHex: option.value,
    imageKind: 'jewelry',
    imageUrl: option.thumbnail || product.images[0]?.src,
    price: option.price,
    priceAddon: option.priceAddon,
    basePriceAddon: option.basePriceAddon ?? option.priceAddon,
  }));
}

function toVariantGroups(product: ProductDetail): CartDrawerVariantGroup[] {
  return product.variants
    .filter(v => v.type !== 'color')
    .map(v => ({
      type: v.type,
      label: v.label,
      options: v.options.map(o => ({
        id: o.id,
        label: o.label,
        value: o.value,
        thumbnail: o.thumbnail,
        available: o.available,
        price: o.price,
        priceAddon: o.priceAddon,
        basePriceAddon: o.basePriceAddon ?? o.priceAddon,
      })),
    }));
}

function toDrawerItem(product: ProductDetail, context?: CartDrawerContext | null): CartDrawerItemModel {
  const unit = context?.unit || product.unit;
  const moq = context?.moq && context.moq > 0 ? context.moq : product.moq;
  const tiers: CartDrawerTierModel[] = (context?.priceTiers && context.priceTiers.length > 0)
    ? context.priceTiers.map((tier) => ({ minQty: tier.minQty, maxQty: tier.maxQty, price: tier.price, basePrice: tier.price }))
    : product.priceTiers.map((tier) => ({ minQty: tier.minQty, maxQty: tier.maxQty, price: tier.price, basePrice: tier.basePrice ?? tier.price }));

  return {
    id: product.id,
    title: context?.title || product.title,
    supplierName: product.supplier.name,
    unit,
    moq,
    imageKind: 'jewelry',
    priceTiers: tiers,
    priceMin: product.priceMin,
    priceMax: product.priceMax,
    colors: toColors(product),
    variantGroups: toVariantGroups(product),
    shippingOptions: toShippingOptions(product),
    samplePrice: product.samplePrice,
    baseCurrency: product.baseCurrency || 'USD',
  };
}

function buildActiveItem(): CartDrawerItemModel {
  return toDrawerItem(getCurrentProduct(), currentContext);
}

export function setCartDrawerContext(context: CartDrawerContext | null): void {
  currentContext = context;
}

export function openCartDrawer(preselectedColorLabel?: string): void {
  const item = buildActiveItem();
  initSharedCartDrawer([item]);
  openSharedCartDrawer(item.id, 'cart', preselectedColorLabel);
}

export function CartDrawer(): string {
  return SharedCartDrawer();
}

export function initCartDrawer(): void {
  const item = buildActiveItem();
  initSharedCartDrawer([item]);
}

export function ShippingModal(): string {
  return SharedShippingModal();
}

export function initShippingModal(): void {
  initSharedShippingModal();
}

export function openShippingModal(quantity?: number): void {
  openSharedShippingModal(quantity);
}
