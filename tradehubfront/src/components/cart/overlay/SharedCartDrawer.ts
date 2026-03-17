import type { ProductImageKind } from '../../../types/productListing';
import { cartStore } from '../state/CartStore';
import type { CartSku } from '../../../types/cart';
import { t } from '../../../i18n';
import { formatCurrency, getSelectedCurrencyInfo } from '../../../services/currencyService';

/** Format an already-converted price with the user's selected currency symbol & locale */
function fmtPrice(amount: number): string {
  const info = getSelectedCurrencyInfo();
  return formatCurrency(amount, info.code);
}

export interface CartDrawerTierModel {
  minQty: number;
  maxQty: number | null;
  price: number;
  originalPrice?: number;
  basePrice: number;
}

export interface CartDrawerShippingOption {
  id: string;
  method: string;
  estimatedDays: string;
  cost: number;
  costText: string;
  baseCost: number;
  baseCurrency: string;
}

export interface CartDrawerColorModel {
  id: string;
  label: string;
  colorHex: string;
  imageKind: ProductImageKind;
  imageUrl?: string;
  price?: number;
  priceAddon?: number;
  basePriceAddon?: number;
}

export interface CartDrawerVariantGroup {
  type: 'color' | 'size' | 'material';
  label: string;
  options: CartDrawerVariantOption[];
}

export interface CartDrawerVariantOption {
  id: string;
  label: string;
  value: string;
  thumbnail?: string;
  available: boolean;
  price?: number;
  priceAddon?: number;
  basePriceAddon?: number;
}

export interface CartDrawerItemModel {
  id: string;
  title: string;
  supplierName: string;
  unit: string;
  moq: number;
  imageKind: ProductImageKind;
  priceTiers: CartDrawerTierModel[];
  priceMin?: number;
  priceMax?: number;
  colors: CartDrawerColorModel[];
  variantGroups?: CartDrawerVariantGroup[];
  shippingOptions: CartDrawerShippingOption[];
  samplePrice?: number;
  baseCurrency: string;
}

interface DrawerState {
  mode: 'cart' | 'sample';
  item: CartDrawerItemModel | null;
  selectedShippingIndex: number;
  colorQuantities: Map<string, number>;
  previewColorIndex: number;
  footerExpanded: boolean;
  selectedVariants: Map<string, string>; // groupLabel → selected optionId
  selectedColorId: string; // multi-variant mode: single selected color
  combinedQuantity: number; // multi-variant mode: single quantity
}

interface CartMemoryItem {
  item: CartDrawerItemModel;
  colorQuantities: Map<string, number>;
}

interface ProductVisual {
  background: string;
  stroke: string;
  icon: string;
}

const productVisuals: Record<ProductImageKind, ProductVisual> = {
  jewelry: { background: 'linear-gradient(180deg, #fef9e7 0%, #fdf0c3 100%)', stroke: '#8a6800', icon: '<path d="M12 2l2.5 5.5L20 9l-4 4 1 5.5L12 16l-5 2.5 1-5.5-4-4 5.5-1.5Z" /><circle cx="12" cy="10" r="2" />' },
  electronics: { background: 'linear-gradient(180deg, #eef2ff 0%, #dbeafe 100%)', stroke: '#4f5fb3', icon: '<rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10M12 16v4" /><circle cx="12" cy="10" r="2" />' },
  label: { background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)', stroke: '#2d8a5e', icon: '<rect x="4" y="6" width="16" height="12" rx="1" /><path d="M8 10h8M8 13h5" /><circle cx="17" cy="6" r="1.5" />' },
  crafts: { background: 'linear-gradient(180deg, #fdf4ff 0%, #fae8ff 100%)', stroke: '#7e22ce', icon: '<path d="M12 2C8.5 2 6 4.5 6 7c0 3 6 8 6 8s6-5 6-8c0-2.5-2.5-5-6-5Z" /><path d="M8 18h8M9 21h6" />' },
  accessory: { background: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)', stroke: '#b45309', icon: '<rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4" /><path d="M4 14h16" />' },
  clothing: { background: 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 100%)', stroke: '#a3456e', icon: '<path d="M8 3h8l2 6v12H6V9l2-6Z" /><path d="M12 3v8M8 3 6 9M16 3l2 6" />' },
  tools: { background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)', stroke: '#475569', icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />' },
  packaging: { background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)', stroke: '#92700c', icon: '<path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" /><path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" /><path d="M10 12h4" />' },
};

const state: DrawerState = {
  mode: 'cart',
  item: null,
  selectedShippingIndex: 0,
  colorQuantities: new Map(),
  previewColorIndex: 0,
  footerExpanded: false,
  selectedVariants: new Map(),
  selectedColorId: '',
  combinedQuantity: 0,
};

const cartMemory = new Map<string, CartMemoryItem>();

let initialized = false;
let shippingInitialized = false;
let productsById = new Map<string, CartDrawerItemModel>();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderColorThumb(color: CartDrawerColorModel, size = 64): string {
  if (color.imageUrl) {
    return `
      <div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#f5f5f5;">
        <img src="${color.imageUrl}" alt="${escapeHtml(color.label)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />
      </div>
    `;
  }
  return `
    <div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;background:${color.colorHex};"></div>
  `;
}

function formatTierLabel(tier: CartDrawerTierModel, unit: string): string {
  if (tier.maxQty === null) return `≥ ${tier.minQty.toLocaleString()} ${unit}`;
  return `${tier.minQty.toLocaleString()} - ${tier.maxQty.toLocaleString()} ${unit}`;
}

function getActiveTierIndex(totalQty: number): number {
  if (!state.item) return 0;
  for (let i = state.item.priceTiers.length - 1; i >= 0; i -= 1) {
    if (totalQty >= state.item.priceTiers[i].minQty) return i;
  }
  return 0;
}

function isMultiVariant(): boolean {
  return (state.item?.variantGroups?.length ?? 0) > 0;
}

function getVariantAddonTotal(): number {
  if (!state.item) return 0;
  let addon = 0;

  if (isMultiVariant()) {
    // Color addon
    if (state.selectedColorId) {
      const color = state.item.colors.find(c => c.id === state.selectedColorId);
      if (color?.priceAddon) addon += color.priceAddon;
    }
    // Variant group addons
    for (const [, optionId] of state.selectedVariants) {
      for (const group of state.item.variantGroups ?? []) {
        const opt = group.options.find(o => o.id === optionId);
        if (opt?.priceAddon) addon += opt.priceAddon;
      }
    }
  }
  // Single-variant mode: addon is computed per-color row in renderSingleVariantColors

  return addon;
}

function getBaseVariantAddonTotal(): number {
  if (!state.item) return 0;
  let addon = 0;

  if (isMultiVariant()) {
    if (state.selectedColorId) {
      const color = state.item.colors.find(c => c.id === state.selectedColorId);
      if (color?.basePriceAddon) addon += color.basePriceAddon;
    }
    for (const [, optionId] of state.selectedVariants) {
      for (const group of state.item.variantGroups ?? []) {
        const opt = group.options.find(o => o.id === optionId);
        if (opt?.basePriceAddon) addon += opt.basePriceAddon;
      }
    }
  }

  return addon;
}

function getTotals(): {
  totalQty: number;
  activePrice: number;
  tierIndex: number;
  itemSubtotal: number;
  shippingCost: number;
  grandTotal: number;
  variationCount: number;
} {
  const multi = isMultiVariant();
  const totalQty = multi
    ? state.combinedQuantity
    : Array.from(state.colorQuantities.values()).reduce((acc, qty) => acc + qty, 0);
  const tierIndex = getActiveTierIndex(totalQty);

  let activePrice: number;
  if (state.mode === 'sample') {
    activePrice = state.item?.samplePrice ?? 0;
  } else if (multi) {
    // Multi-variant mode: tier price + sum of selected variant addons
    const tierPrice = state.item?.priceTiers[tierIndex]?.price ?? 0;
    const variantAddon = getVariantAddonTotal();
    activePrice = tierPrice + variantAddon;
  } else {
    activePrice = state.item?.priceTiers[tierIndex]?.price ?? 0;
  }
  // In single-variant mode, each color may have a different addon, so compute subtotal per-color
  let itemSubtotal: number;
  if (!multi && state.item && state.mode !== 'sample') {
    itemSubtotal = 0;
    for (const [colorId, qty] of state.colorQuantities) {
      if (qty <= 0) continue;
      const color = state.item.colors.find(c => c.id === colorId);
      const colorAddon = color?.priceAddon ?? 0;
      itemSubtotal += (activePrice + colorAddon) * qty;
    }
  } else {
    itemSubtotal = activePrice * totalQty;
  }
  const shippingCost = state.item?.shippingOptions[state.selectedShippingIndex]?.cost ?? 0;
  const grandTotal = totalQty > 0 ? itemSubtotal + shippingCost : 0;
  const variationCount = multi
    ? (state.combinedQuantity > 0 ? 1 : 0)
    : Array.from(state.colorQuantities.values()).filter((qty) => qty > 0).length;
  return { totalQty, activePrice, tierIndex, itemSubtotal, shippingCost, grandTotal, variationCount };
}

function getDrawerElements(): {
  overlay: HTMLElement | null;
  drawer: HTMLElement | null;
  body: HTMLElement | null;
  footer: HTMLElement | null;
} {
  return {
    overlay: document.getElementById('shared-cart-overlay'),
    drawer: document.getElementById('shared-cart-drawer'),
    body: document.getElementById('shared-cart-body'),
    footer: document.getElementById('shared-cart-footer'),
  };
}

function applyDrawerTransform(open: boolean): void {
  const { overlay, drawer } = getDrawerElements();
  if (!overlay || !drawer) return;

  const mobile = window.innerWidth < 1280;
  const closedTransform = mobile ? 'translateY(100%)' : 'translateX(100%)';
  const openTransform = 'translateX(0) translateY(0)';

  drawer.style.transform = open ? openTransform : closedTransform;

  if (open) {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
  } else {
    overlay.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
  }

  setPreviewVisible(open && !mobile);
}

function setPreviewVisible(visible: boolean): void {
  const preview = document.getElementById('shared-cart-preview');
  if (!preview) return;
  if (visible) {
    preview.classList.remove('hidden');
    preview.classList.add('flex');
  } else {
    preview.classList.remove('flex');
    preview.classList.add('hidden');
  }
}

function updatePreview(): void {
  const image = document.getElementById('shared-cart-preview-image');
  const label = document.getElementById('shared-cart-preview-label');
  if (!image || !label || !state.item) return;

  const color = state.item.colors[state.previewColorIndex];
  if (!color) return;

  if (color.imageUrl) {
    image.innerHTML = `
      <img src="${color.imageUrl}" alt="${escapeHtml(color.label)}" style="width:100%;height:100%;object-fit:cover;" />
    `;
  } else {
    image.innerHTML = `
      <div style="width:100%;height:100%;background:${color.colorHex};"></div>
    `;
  }
  label.textContent = `color : ${color.label}`;
}

function showSampleMaxToast(): void {
  const existing = document.getElementById('sample-max-toast');
  if (existing) return; // already visible

  const toast = document.createElement('div');
  toast.id = 'sample-max-toast';
  toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex items-start gap-3 bg-[#1a1a1a] text-white text-sm rounded-2xl px-5 py-4 shadow-xl max-w-xs w-max pointer-events-none';
  toast.innerHTML = `
    <svg class="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e05c25" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${t('cart.sampleMaxQty')}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function isPriceRangeMode(): boolean {
  if (!state.item) return false;
  // Price range mode: no tiers OR only 1 tier (single price), and has min/max range
  const hasTiers = state.item.priceTiers.length > 1;
  const hasRange = state.item.priceMin !== undefined && state.item.priceMax !== undefined && state.item.priceMin !== state.item.priceMax;
  return !hasTiers && hasRange;
}

function renderPriceSectionHtml(totals: ReturnType<typeof getTotals>): string {
  if (!state.item) return '';
  if (state.mode === 'sample') {
    return `
      <div class="mb-5 pb-5 border-b border-border-default">
        <p class="text-sm text-text-secondary mb-1">${t('cart.sampleMaxNote')}</p>
        <p class="text-[22px] font-bold text-text-heading">${fmtPrice((state.item.samplePrice ?? 0))} <span class="text-base font-normal text-text-tertiary">${t('cart.perUnit')}</span></p>
      </div>
    `;
  }

  // PRICE RANGE MODE (Alibaba style: $130-169, MOQ: 1)
  if (isPriceRangeMode()) {
    return `
      <div class="pb-5 mb-5 border-b border-border-default">
        <p class="text-sm text-text-tertiary mb-1">${t('product.minOrderLabel') || 'Minimum Sipariş Miktarı'}: ${state.item.moq} ${state.item.unit}</p>
        <p class="text-[26px] font-bold text-error-500">${fmtPrice(state.item.priceMin!)}-${fmtPrice(state.item.priceMax!)}</p>
      </div>
    `;
  }

  // TIER MODE (wholesale: 200-399 = $50, 400-599 = $40, 600+ = $30)
  return `
    <div class="grid grid-cols-3 gap-6 pb-5 mb-5 border-b border-border-default">
      ${state.item.priceTiers.map((tier, index) => {
    const activeClass = index === totals.tierIndex ? 'text-error-500' : 'text-text-heading';
    return `<div class="cart-tier-item" data-tier-index="${index}">
          <p class="text-sm text-text-tertiary">${formatTierLabel(tier, state.item!.unit)}</p>
          <p class="mt-1 text-[22px] font-bold ${activeClass}">${fmtPrice(tier.price)}</p>
        </div>`;
  }).join('')}
    </div>
  `;
}

function renderVariantPillGroup(group: CartDrawerVariantGroup): string {
  const selectedId = state.selectedVariants.get(group.label) || '';
  return `
    <div class="mb-5 pb-5 border-b border-border-default" data-variant-group="${escapeHtml(group.label)}">
      <h5 class="text-sm font-bold text-text-heading mb-3">${escapeHtml(group.label)}</h5>
      <div class="flex flex-wrap gap-2">
        ${group.options.map(opt => {
    const isSelected = opt.id === selectedId;
    const disabledClass = !opt.available ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer';
    const selectedClass = isSelected
      ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold'
      : 'border-border-default bg-surface text-text-body hover:bg-surface-raised';
    const addonLabel = opt.priceAddon && opt.priceAddon > 0 ? ` +${fmtPrice(opt.priceAddon)}` : '';
    return `
            <button type="button"
              class="cart-variant-option px-4 py-2 rounded-full border text-sm transition-colors ${selectedClass} ${disabledClass}"
              data-variant-group-label="${escapeHtml(group.label)}"
              data-variant-option-id="${escapeHtml(opt.id)}"
              data-variant-option-label="${escapeHtml(opt.label)}"
              ${opt.price ? `data-variant-option-price="${opt.price}"` : ''}
              ${!opt.available ? 'disabled' : ''}
            >${escapeHtml(opt.label)}${addonLabel ? `<span class="text-xs text-text-tertiary ml-1">${addonLabel}</span>` : ''}</button>`;
  }).join('')}
      </div>
    </div>
  `;
}

function renderColorThumbSelector(): string {
  if (!state.item || state.item.colors.length === 0) return '';

  const selectedColor = state.item.colors.find(c => c.id === state.selectedColorId);
  const selectedLabel = selectedColor?.label || '';
  const selectedAddonText = selectedColor?.priceAddon && selectedColor.priceAddon > 0 ? ` (+${fmtPrice(selectedColor.priceAddon)})` : '';
  return `
    <div class="mb-5 pb-5 border-b border-border-default">
      <h5 class="text-sm font-bold text-text-heading mb-3">${t('cart.colorLabel')}: <span class="font-normal text-text-secondary">${escapeHtml(selectedLabel)}${selectedAddonText}</span></h5>
      <div class="flex flex-wrap gap-2">
        ${state.item.colors.map(color => {
    const isSelected = color.id === state.selectedColorId;
    const borderClass = isSelected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-border-default';
    const colorAddonTitle = color.priceAddon && color.priceAddon > 0 ? ` (+${fmtPrice(color.priceAddon)})` : '';
    return `
            <button type="button"
              class="cart-color-select shrink-0 rounded-lg border-2 overflow-hidden ${borderClass} cursor-pointer"
              data-color-select-id="${escapeHtml(color.id)}"
              data-preview-color="${escapeHtml(color.id)}"
              style="width:56px;height:56px;"
              title="${escapeHtml(color.label)}${colorAddonTitle}"
            >
              ${color.imageUrl
      ? `<img src="${color.imageUrl}" alt="${escapeHtml(color.label)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />`
      : `<div style="width:100%;height:100%;background:${color.colorHex};"></div>`}
            </button>`;
  }).join('')}
      </div>
    </div>
  `;
}

function renderCombinedQtyControl(totals: ReturnType<typeof getTotals>): string {
  return `
    <div class="mb-5 pb-5 border-b border-border-default">
      <div class="flex items-center justify-between gap-3 py-2">
        <span class="text-[17px] font-bold text-text-heading">${fmtPrice(totals.activePrice)}</span>
        <div class="inline-flex items-center border border-border-default rounded-full overflow-hidden shrink-0">
          <button type="button" data-combined-qty-action="minus" class="w-9 h-9 bg-surface text-text-secondary hover:bg-surface-raised transition-colors">−</button>
          <input type="number" id="combined-qty-input" value="${state.combinedQuantity}" min="0" class="w-11 h-9 text-center border-x border-border-default bg-surface text-sm font-semibold text-text-heading [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <button type="button" data-combined-qty-action="plus" class="w-9 h-9 bg-surface text-text-secondary hover:bg-surface-raised transition-colors">+</button>
        </div>
      </div>
    </div>
  `;
}

function renderSingleVariantColors(totals: ReturnType<typeof getTotals>): string {
  if (!state.item) return '';
  return `
    <div class="mb-5">
      <h5 class="text-base font-bold text-text-heading mb-3">${t('cart.colorLabel')}</h5>
      <div class="divide-y divide-border-default">
        ${state.item.colors.map((color) => {
    const qty = state.colorQuantities.get(color.id) ?? 0;
    const selectedBorder = qty > 0 ? 'border-primary-500' : 'border-border-default';
    const colorPrice = totals.activePrice + (color.priceAddon ?? 0);
    return `
            <div class="flex items-center gap-4 py-3" data-color-id="${escapeHtml(color.id)}">
              <button type="button" data-preview-color="${escapeHtml(color.id)}" class="shrink-0 rounded-full border-2 ${selectedBorder}">
                ${renderColorThumb(color, 72)}
              </button>
              <div class="flex-1 min-w-0">
                <p class="text-base font-semibold text-text-heading truncate">${escapeHtml(color.label)}${color.priceAddon && color.priceAddon > 0 ? `<span class="text-xs font-normal text-text-tertiary ml-1">+${fmtPrice(color.priceAddon)}</span>` : ''}</p>
              </div>
              <span class="text-[15px] font-semibold text-text-heading whitespace-nowrap">${fmtPrice(colorPrice)}</span>
              <div class="inline-flex items-center border border-border-default rounded-full overflow-hidden shrink-0">
                <button type="button" data-qty-action="minus" data-qty-color="${escapeHtml(color.id)}" class="w-9 h-9 bg-surface text-text-secondary hover:bg-surface-raised transition-colors">−</button>
                <input type="number" data-qty-input="${escapeHtml(color.id)}" value="${qty}" min="0" class="w-11 h-9 text-center border-x border-border-default bg-surface text-sm font-semibold text-text-heading [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                <button type="button" data-qty-action="plus" data-qty-color="${escapeHtml(color.id)}" class="w-9 h-9 bg-surface text-text-secondary hover:bg-surface-raised transition-colors">+</button>
              </div>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
}

function renderShippingSection(): string {
  return `
    <div class="mt-5 mb-2 rounded-3xl border border-border-default p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h5 class="text-base font-bold text-text-heading">${t('cart.shipping')}</h5>
          <p class="mt-2 text-sm text-text-secondary">${t('cart.shippingNegotiate')}</p>
        </div>
        <button type="button" data-shipping-change class="text-base font-semibold text-cta-primary hover:text-cta-primary-hover hover:underline">${t('cart.changeShipping')} ›</button>
      </div>
    </div>
  `;
}

function renderDrawerBody(): void {
  const { body } = getDrawerElements();
  if (!body || !state.item) return;

  const totals = getTotals();
  const priceSection = renderPriceSectionHtml(totals);
  const multi = isMultiVariant();

  if (multi) {
    // ── MULTI-VARIANT MODE (Alibaba Resim 8) ──
    // Color thumbnails + pill selectors + single price/qty
    const variantGroupsHtml = (state.item.variantGroups ?? [])
      .map(group => renderVariantPillGroup(group)).join('');

    body.innerHTML = `
      <h4 class="text-base font-bold text-text-heading leading-tight mb-4">${escapeHtml(state.item.title)}</h4>
      ${priceSection}
      ${renderColorThumbSelector()}
      ${variantGroupsHtml}
      ${renderCombinedQtyControl(totals)}
      ${renderShippingSection()}
    `;
  } else {
    // ── SINGLE-VARIANT MODE (Alibaba Resim 6) ──
    // Color rows with individual qty controls
    body.innerHTML = `
      <h4 class="text-base font-bold text-text-heading leading-tight mb-4">${escapeHtml(state.item.title)}</h4>
      ${priceSection}
      ${renderSingleVariantColors(totals)}
      ${renderShippingSection()}
    `;
  }
}

function fmtSubtotal(qty: number, subtotal: number): string {
  if (!state.item || qty <= 0) return fmtPrice(0);
  const rangeMode = isPriceRangeMode();
  if (rangeMode && state.item.priceMin !== undefined && state.item.priceMax !== undefined) {
    const minTotal = qty * state.item.priceMin;
    const maxTotal = qty * state.item.priceMax;
    return `${fmtPrice(minTotal)} - ${fmtPrice(maxTotal)}`;
  }
  return fmtPrice(subtotal);
}

function renderDrawerFooter(): void {
  const { footer } = getDrawerElements();
  if (!footer || !state.item) return;

  const totals = getTotals();
  const perPiece = totals.totalQty > 0 ? totals.grandTotal / totals.totalQty : 0;
  const rangeMode = isPriceRangeMode();
  const subtotalDisplay = fmtSubtotal(totals.totalQty, totals.grandTotal);
  const itemSubtotalDisplay = fmtSubtotal(totals.totalQty, totals.itemSubtotal);
  const perPieceDisplay = rangeMode && state.item.priceMin !== undefined && state.item.priceMax !== undefined
    ? `${fmtPrice(state.item.priceMin)}-${fmtPrice(state.item.priceMax)}`
    : fmtPrice(perPiece);

  const shippingDisplay = rangeMode
    ? (t('cart.shippingNegotiate') || 'Müzakere Edilecek')
    : escapeHtml(state.item.shippingOptions[state.selectedShippingIndex]?.costText ?? '$0.00');

  const details = state.footerExpanded
    ? `
      <div class="mb-4">
        <button type="button" id="shared-cart-footer-toggle" class="w-full flex items-center justify-center gap-1 text-sm font-semibold text-text-heading border-b border-border-default pb-3 mb-3">
          ${t('cart.price')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
        </button>

        <div class="space-y-2 text-sm text-text-secondary">
          <div class="flex items-center justify-between">
            <span>${t('cart.productTotal')} (${t('cart.variationItems', { variation: String(totals.variationCount), items: String(totals.totalQty) })})</span>
            <strong class="text-text-heading">${itemSubtotalDisplay}</strong>
          </div>
          <div class="flex items-center justify-between">
            <span>${t('cart.shippingTotal')}</span>
            <span>${shippingDisplay}</span>
          </div>
          <div class="flex items-center justify-between border-t border-border-default pt-3 mt-3">
            <strong class="text-text-heading">${t('cart.subtotal')}</strong>
            <div class="text-right">
              <strong class="text-base text-cta-primary">${subtotalDisplay}</strong>
              <p class="text-xs text-text-tertiary">(${perPieceDisplay}/${state.item.unit})</p>
            </div>
          </div>
        </div>
      </div>
    `
    : `
      <button type="button" id="shared-cart-footer-toggle" class="w-full flex items-center justify-between mb-4">
        <strong class="text-base text-text-heading">${t('cart.subtotal')}</strong>
        <span class="flex items-center gap-1.5">
          <strong class="text-[17px] text-cta-primary">${subtotalDisplay}</strong>
          <span class="text-xs text-text-tertiary">(${perPieceDisplay}/${state.item.unit})</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-tertiary"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>
    `;

  footer.innerHTML = `
    ${details}
    <button type="button" id="shared-cart-confirm" class="w-full th-btn-dark th-btn-pill h-12 text-lg">${state.mode === 'sample' ? t('cart.orderSample') : t('cart.addToCartBtn')}</button>
  `;
}

function rerenderDrawer(): void {
  renderDrawerBody();
  renderDrawerFooter();
  updatePreview();
}

function updateShippingModal(quantityOverride?: number): void {
  const qtyEl = document.getElementById('shared-cart-shipping-qty');
  const optionsEl = document.getElementById('shared-cart-shipping-options');
  if (!qtyEl || !optionsEl || !state.item) return;

  const totals = getTotals();
  const qty = quantityOverride ?? Math.max(totals.totalQty, state.item.moq);
  qtyEl.textContent = `${qty} ${state.item.unit}`;

  optionsEl.innerHTML = state.item.shippingOptions.map((option, index) => {
    const active = index === state.selectedShippingIndex;
    return `
      <label class="flex items-center justify-between rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${active ? 'border-primary-500 bg-primary-50' : 'border-border-default bg-surface-muted hover:bg-surface'}" data-shipping-option-index="${index}">
        <span class="flex items-center gap-3">
          <span class="w-7 h-7 rounded-full border inline-flex items-center justify-center ${active ? 'border-primary-500 bg-primary-500 text-white' : 'border-border-medium text-transparent'}">
            ${active ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 13 4 4L19 7"/></svg>' : ''}
          </span>
          <span>
            <strong class="block text-base text-text-heading">${escapeHtml(option.method)}</strong>
            <span class="text-sm text-text-secondary">${escapeHtml(option.estimatedDays)}</span>
          </span>
        </span>
        <strong class="text-base text-text-heading">${escapeHtml(option.costText)}</strong>
      </label>
    `;
  }).join('');
}

function setShippingModalOpen(open: boolean): void {
  const modal = document.getElementById('shared-cart-shipping-modal');
  const sheet = document.getElementById('shared-cart-shipping-sheet');
  if (!modal || !sheet) return;

  if (open) {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    sheet.classList.remove('translate-y-4');
  } else {
    modal.classList.add('opacity-0', 'pointer-events-none');
    sheet.classList.add('translate-y-4');
  }
}

function buildGroupedItemsForEvent(): Array<{ supplierName: string; productTitle: string; items: Array<{ label: string; unitPrice: number; qty: number; colorValue: string }> }> {
  const groups = new Map<string, { supplierName: string; productTitle: string; items: Array<{ label: string; unitPrice: number; qty: number; colorValue: string }> }>();

  cartMemory.forEach((memory) => {
    const qty = Array.from(memory.colorQuantities.values()).reduce((acc, value) => acc + value, 0);
    if (qty <= 0) return;

    const tierIndex = getActiveTierIndex(qty);
    const unitPrice = memory.item.priceTiers[tierIndex]?.price ?? memory.item.priceTiers[0]?.price ?? 0;
    const supplierKey = memory.item.supplierName || 'Supplier';

    if (!groups.has(supplierKey)) {
      groups.set(supplierKey, {
        supplierName: memory.item.supplierName,
        productTitle: memory.item.title,
        items: [],
      });
    }

    groups.get(supplierKey)!.items.push({
      label: `${qty} ${memory.item.unit}, ${memory.item.title.length > 40 ? `${memory.item.title.slice(0, 40)}...` : memory.item.title}`,
      unitPrice,
      qty,
      colorValue: productVisuals[memory.item.imageKind].stroke,
    });
  });

  return Array.from(groups.values());
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function syncToCartStore(item: CartDrawerItemModel): void {
  const currencyInfo = getSelectedCurrencyInfo();
  const multi = isMultiVariant();
  const totals = getTotals();
  const tierPrice = item.priceTiers[totals.tierIndex]?.price ?? 0;
  const productId = item.id;

  // SKU verisi hazırla — geçersizse erken çık (boş product oluşturmayı engelle)
  let skuToAdd: CartSku | null = null;
  let skuToUpdateId: string | null = null;
  let skuToUpdateQty = 0;

  if (multi) {
    const colorId = state.selectedColorId;
    const color = item.colors.find(c => c.id === colorId);
    if (!color || state.combinedQuantity <= 0) return;

    const variantParts: string[] = [`${t('cart.colorLabel')}: ${color.label}`];
    const variantIds: string[] = [colorId];
    for (const [groupLabel, optionId] of state.selectedVariants) {
      for (const group of item.variantGroups ?? []) {
        const opt = group.options.find(o => o.id === optionId);
        if (opt) {
          variantParts.push(`${groupLabel}: ${opt.label}`);
          variantIds.push(optionId);
        }
      }
    }

    const addon = getVariantAddonTotal();
    const baseAddon = getBaseVariantAddonTotal();
    const baseTierPrice = item.priceTiers[totals.tierIndex]?.basePrice ?? tierPrice;
    const skuId = `${productId}-${variantIds.sort().join('-')}`;
    const existing = cartStore.getSku(skuId);

    if (existing) {
      skuToUpdateId = skuId;
      skuToUpdateQty = existing.sku.quantity + state.combinedQuantity;
    } else {
      skuToAdd = {
        id: skuId,
        skuImage: color.imageUrl || 'https://placehold.co/120x120/f5f5f5/999?text=SKU',
        variantText: variantParts.join(', '),
        unitPrice: tierPrice + addon,
        priceAddon: addon,
        currency: currencyInfo.symbol,
        unit: item.unit,
        quantity: state.combinedQuantity,
        minQty: item.moq,
        maxQty: 9999,
        selected: true,
        baseUnitPrice: baseTierPrice + baseAddon,
        basePriceAddon: baseAddon,
        baseCurrency: item.baseCurrency || 'USD',
      };
    }
  } else {
    // Single-variant: ilk geçerli rengi bul, yoksa çık
    const firstValidColor = Array.from(state.colorQuantities.entries()).find(([, qty]) => qty > 0);
    if (!firstValidColor) return;
  }

  // ── Supplier ve Product oluştur (sadece en az 1 SKU eklenecekse) ──
  const supplierId = toSlug(item.supplierName || 'unknown-supplier');
  if (!cartStore.getSupplier(supplierId)) {
    cartStore.addSupplier({
      id: supplierId,
      name: item.supplierName,
      href: `/supplier/${supplierId}`,
      selected: true,
      products: [],
    });
  }

  if (!cartStore.getProduct(productId)) {
    cartStore.addProduct(supplierId, {
      id: productId,
      title: item.title,
      href: `/product/${productId}`,
      tags: [],
      moqLabel: `${t('product.minOrderLabel')}: ${item.moq} ${item.unit}`,
      favoriteIcon: '♡',
      deleteIcon: '🗑',
      skus: [],
      selected: true,
      priceTiers: item.priceTiers.map(pt => ({
        minQty: pt.minQty,
        maxQty: pt.maxQty,
        price: pt.basePrice,
      })),
      baseCurrency: item.baseCurrency || 'USD',
      shippingMethods: item.shippingOptions.map((so, idx) => ({
        id: so.id || `ship-${idx + 1}`,
        method: so.method,
        estimatedDays: so.estimatedDays,
        baseCost: so.baseCost,
        baseCurrency: so.baseCurrency || item.baseCurrency || 'USD',
      })),
    });
  }

  // ── SKU ekle/güncelle ──
  if (multi) {
    if (skuToUpdateId) {
      cartStore.updateSkuQuantity(skuToUpdateId, skuToUpdateQty);
    } else if (skuToAdd) {
      cartStore.addSku(productId, skuToAdd);
    }
  } else {
    // Single-variant: her renk/miktar çifti → ayrı SKU
    const baseTierPriceSingle = item.priceTiers[totals.tierIndex]?.basePrice ?? tierPrice;
    state.colorQuantities.forEach((qty, colorId) => {
      if (qty <= 0) return;
      const color = item.colors.find((c) => c.id === colorId);
      if (!color) return;

      const addon = color.priceAddon ?? 0;
      const baseAddonSingle = color.basePriceAddon ?? 0;
      const skuId = `${productId}-${colorId}`;
      const existing = cartStore.getSku(skuId);

      if (existing) {
        cartStore.updateSkuQuantity(skuId, existing.sku.quantity + qty);
      } else {
        cartStore.addSku(productId, {
          id: skuId,
          skuImage: color.imageUrl || 'https://placehold.co/120x120/f5f5f5/999?text=SKU',
          variantText: `${t('cart.colorLabel')}: ${color.label}`,
          unitPrice: tierPrice + addon,
          priceAddon: addon,
          currency: currencyInfo.symbol,
          unit: item.unit,
          quantity: qty,
          minQty: item.moq,
          maxQty: 9999,
          selected: true,
          baseUnitPrice: baseTierPriceSingle + baseAddonSingle,
          basePriceAddon: baseAddonSingle,
          baseCurrency: item.baseCurrency || 'USD',
        });
      }
    });
  }
}

function dispatchCartAdd(): void {
  if (!state.item) return;

  const totals = getTotals();
  if (totals.totalQty <= 0) return;

  // CartStore'a kaydet
  syncToCartStore(state.item);

  // cartMemory güncelle — multi-variant modda selectedColorId + combinedQuantity kullan
  const multi = isMultiVariant();
  const memoryQuantities = new Map<string, number>();
  if (multi) {
    if (state.selectedColorId && state.combinedQuantity > 0) {
      memoryQuantities.set(state.selectedColorId, state.combinedQuantity);
    }
  } else {
    state.colorQuantities.forEach((qty, colorId) => {
      if (qty > 0) memoryQuantities.set(colorId, qty);
    });
  }

  const existing = cartMemory.get(state.item.id);
  if (existing) {
    memoryQuantities.forEach((qty, colorId) => {
      existing.colorQuantities.set(colorId, (existing.colorQuantities.get(colorId) ?? 0) + qty);
    });
  } else {
    cartMemory.set(state.item.id, { item: state.item, colorQuantities: new Map(memoryQuantities) });
  }

  const groupedItems = buildGroupedItemsForEvent();
  const quantity = groupedItems.reduce((sum, group) => sum + group.items.reduce((acc, item) => acc + item.qty, 0), 0);
  const grandTotal = groupedItems.reduce((sum, group) => sum + group.items.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0), 0);

  document.dispatchEvent(new CustomEvent('cart-add', {
    detail: {
      productTitle: state.item.title,
      supplierName: state.item.supplierName,
      unitPrice: totals.activePrice,
      quantity,
      itemTotal: totals.itemSubtotal,
      grandTotal,
      groupedItems,
    },
  }));
}

function openDrawer(itemId?: string, mode: 'cart' | 'sample' = 'cart', preselectedColorLabel?: string): void {
  const item = itemId ? productsById.get(itemId) : Array.from(productsById.values())[0];
  if (!item) return;

  state.mode = mode;
  state.item = item;
  state.selectedShippingIndex = 0;
  state.previewColorIndex = 0;
  state.footerExpanded = false;
  state.colorQuantities = new Map(item.colors.map((color) => [color.id, 0]));

  // Pre-select first available option for each variant group
  state.selectedVariants = new Map();
  state.combinedQuantity = 0;
  state.selectedColorId = item.colors[0]?.id ?? '';

  if (item.variantGroups && item.variantGroups.length > 0) {
    // Multi-variant mode
    for (const group of item.variantGroups) {
      const firstAvailable = group.options.find(o => o.available);
      if (firstAvailable) {
        state.selectedVariants.set(group.label, firstAvailable.id);
      }
    }
  }

  // Pre-select the color that was clicked in the variant selector
  if (preselectedColorLabel && item.colors.length > 0) {
    const normalizedLabel = preselectedColorLabel.toLowerCase().trim();
    const matchIndex = item.colors.findIndex(c => c.label.toLowerCase().trim() === normalizedLabel);
    if (matchIndex >= 0) {
      state.previewColorIndex = matchIndex;
      state.selectedColorId = item.colors[matchIndex].id;
      if (!isMultiVariant()) {
        state.colorQuantities.set(item.colors[matchIndex].id, 1);
      }
    }
  }

  const heading = document.getElementById('shared-cart-heading');
  if (heading) {
    heading.textContent = mode === 'sample' ? t('cart.sampleVariations') : t('cart.selectVariation');
  }

  rerenderDrawer();
  applyDrawerTransform(true);
}

function bindShippingEvents(): void {
  if (shippingInitialized) return;
  shippingInitialized = true;

  const modal = document.getElementById('shared-cart-shipping-modal');
  const closeBtn = document.getElementById('shared-cart-shipping-close');
  const options = document.getElementById('shared-cart-shipping-options');
  const applyBtn = document.getElementById('shared-cart-shipping-apply');
  if (!modal || !closeBtn || !options || !applyBtn) return;

  closeBtn.addEventListener('click', () => setShippingModalOpen(false));

  modal.addEventListener('click', (event) => {
    if (event.target === modal) setShippingModalOpen(false);
  });

  options.addEventListener('click', (event) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-shipping-option-index]');
    if (!row) return;
    const idx = Number(row.dataset.shippingOptionIndex ?? 0);
    state.selectedShippingIndex = Number.isNaN(idx) ? 0 : idx;
    updateShippingModal();
  });

  applyBtn.addEventListener('click', () => {
    if (!state.item) return;

    const selected = state.item.shippingOptions[state.selectedShippingIndex];
    if (selected) {
      document.dispatchEvent(new CustomEvent('shipping-change', {
        detail: {
          index: state.selectedShippingIndex,
          method: selected.method,
          estimatedDays: selected.estimatedDays,
          costStr: selected.costText,
          cost: selected.cost,
        },
      }));
    }

    setShippingModalOpen(false);
    renderDrawerFooter();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('opacity-0')) {
      setShippingModalOpen(false);
    }
  });
}

export function SharedCartDrawer(): string {
  return `
    <div id="shared-cart-overlay" class="fixed inset-0 z-(--z-backdrop,40) bg-black/50 opacity-0 pointer-events-none transition-opacity duration-300">
      <div id="shared-cart-preview" class="hidden fixed left-0 top-0 bottom-0 right-[600px] z-(--z-modal,50) items-center justify-center px-8 pointer-events-none">
        <div class="relative w-full max-w-[760px] h-[78vh] rounded-2xl overflow-hidden pointer-events-auto shadow-2xl bg-surface">
          <button type="button" id="shared-cart-preview-prev" class="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white text-secondary-700 border border-border-default shadow-md z-20">‹</button>
          <div id="shared-cart-preview-image" class="w-full h-full"></div>
          <button type="button" id="shared-cart-preview-next" class="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white text-secondary-700 border border-border-default shadow-md z-20">›</button>
          <div id="shared-cart-preview-label" class="absolute left-0 right-0 bottom-0 px-6 py-4 text-white text-xl font-medium bg-gradient-to-t from-black/60 to-transparent">color : -</div>
        </div>
      </div>

      <aside id="shared-cart-drawer" class="fixed right-0 top-0 h-full w-full sm:w-[500px] lg:w-[600px] max-w-full bg-surface shadow-[-8px_0_30px_rgba(0,0,0,0.18)] xl:rounded-l-2xl xl:border-l xl:border-border-default flex flex-col transition-transform duration-300">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0 max-md:px-4 max-md:py-3">
          <h3 id="shared-cart-heading" class="text-lg font-bold text-text-heading">${t('cart.selectVariation')}</h3>
          <button type="button" id="shared-cart-close" class="w-8 h-8 rounded-full text-secondary-400 hover:text-secondary-900 hover:bg-surface-raised transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18 18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div id="shared-cart-body" class="flex-1 overflow-y-auto px-6 pt-5 pb-8 max-md:px-4 max-md:pt-4 max-md:pb-6"></div>
        <div id="shared-cart-footer" class="shrink-0 border-t border-border-default bg-surface px-6 pt-4 pb-5 max-md:px-4 max-md:pt-3 max-md:pb-4"></div>
      </aside>
    </div>
  `;
}

export function SharedShippingModal(): string {
  return `
    <div id="shared-cart-shipping-modal" class="fixed inset-0 z-[210] bg-black/50 opacity-0 pointer-events-none transition-opacity duration-300">
      <div id="shared-cart-shipping-sheet" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[min(92vw,760px)] bg-surface rounded-3xl border border-border-default shadow-2xl p-6 translate-y-4 transition-transform duration-300 max-md:w-full max-md:max-w-full max-md:rounded-t-2xl max-md:rounded-b-none max-md:top-auto max-md:bottom-0 max-md:-translate-x-1/2 max-md:-translate-y-0 max-md:p-4">
        <div class="flex items-center justify-between">
          <h4 class="text-xl font-bold text-text-heading">${t('cart.selectShipping')}</h4>
          <button type="button" id="shared-cart-shipping-close" class="w-8 h-8 rounded-full text-secondary-400 hover:text-secondary-900 hover:bg-surface-raised transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18 18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <p class="mt-4 text-base text-text-secondary">${t('cart.shippingTo')}: <strong>${t('countries.TR')}</strong> · ${t('cart.shippingQty')}: <span id="shared-cart-shipping-qty">1 ${state.item?.unit ?? 'pc'}</span></p>
        <div id="shared-cart-shipping-options" class="mt-5 space-y-3 max-h-[46vh] overflow-y-auto"></div>

        <button type="button" id="shared-cart-shipping-apply" class="mt-6 w-full th-btn-dark th-btn-pill h-12">${t('common.apply')}</button>
      </div>
    </div>
  `;
}

export function initSharedCartDrawer(items: CartDrawerItemModel[]): void {
  productsById = new Map(items.map((item) => [item.id, item]));

  const { overlay, drawer, body, footer } = getDrawerElements();
  if (!overlay || !drawer || !body || !footer) return;

  bindShippingEvents();

  if (initialized) return;
  initialized = true;

  const closeBtn = document.getElementById('shared-cart-close');
  const previewPrev = document.getElementById('shared-cart-preview-prev');
  const previewNext = document.getElementById('shared-cart-preview-next');

  applyDrawerTransform(false);

  closeBtn?.addEventListener('click', () => applyDrawerTransform(false));

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      applyDrawerTransform(false);
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const cartTrigger = target.closest<HTMLElement>('[data-add-to-cart]');
    if (cartTrigger) {
      const id = cartTrigger.dataset.addToCart;
      if (id && productsById.has(id)) {
        event.preventDefault();
        openDrawer(id, 'cart');
      }
      return;
    }

    const sampleTrigger = target.closest<HTMLElement>('[data-order-sample]');
    if (sampleTrigger) {
      const id = sampleTrigger.dataset.orderSample;
      if (id && productsById.has(id)) {
        event.preventDefault();
        openDrawer(id, 'sample');
      }
      return;
    }
  });

  body.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Variant group option selection (size, material, etc.)
    const variantOptionBtn = target.closest<HTMLButtonElement>('.cart-variant-option:not([disabled])');
    if (variantOptionBtn) {
      const groupLabel = variantOptionBtn.dataset.variantGroupLabel ?? '';
      const optionId = variantOptionBtn.dataset.variantOptionId ?? '';
      state.selectedVariants.set(groupLabel, optionId);
      rerenderDrawer();
      return;
    }

    // Multi-variant mode: color thumbnail selection
    const colorSelectBtn = target.closest<HTMLButtonElement>('.cart-color-select');
    if (colorSelectBtn && state.item) {
      const colorId = colorSelectBtn.dataset.colorSelectId ?? '';
      state.selectedColorId = colorId;
      const index = state.item.colors.findIndex(c => c.id === colorId);
      if (index >= 0) {
        state.previewColorIndex = index;
        updatePreview();
        setPreviewVisible(window.innerWidth >= 1280);
      }
      rerenderDrawer();
      return;
    }

    // Multi-variant mode: combined quantity control
    const combinedQtyTrigger = target.closest<HTMLElement>('[data-combined-qty-action]');
    if (combinedQtyTrigger) {
      const action = combinedQtyTrigger.dataset.combinedQtyAction;
      if (action === 'plus') {
        if (state.mode === 'sample' && state.combinedQuantity >= 1) {
          showSampleMaxToast();
          return;
        }
        state.combinedQuantity += 1;
      }
      if (action === 'minus') {
        state.combinedQuantity = Math.max(0, state.combinedQuantity - 1);
      }
      rerenderDrawer();
      return;
    }

    const previewTrigger = target.closest<HTMLElement>('[data-preview-color]');
    if (previewTrigger && state.item) {
      const colorId = previewTrigger.dataset.previewColor;
      const index = state.item.colors.findIndex((color) => color.id === colorId);
      if (index >= 0) {
        state.previewColorIndex = index;
        updatePreview();
        setPreviewVisible(window.innerWidth >= 1280);
      }
      return;
    }

    // Single-variant mode: per-color quantity control
    const qtyTrigger = target.closest<HTMLElement>('[data-qty-action]');
    if (qtyTrigger) {
      const action = qtyTrigger.dataset.qtyAction;
      const colorId = qtyTrigger.dataset.qtyColor ?? '';
      const current = state.colorQuantities.get(colorId) ?? 0;

      if (action === 'plus') {
        if (state.mode === 'sample') {
          const totalQty = Array.from(state.colorQuantities.values()).reduce((a, b) => a + b, 0);
          if (totalQty >= 1) {
            showSampleMaxToast();
            return;
          }
        }
        state.colorQuantities.set(colorId, current + 1);
      }
      if (action === 'minus') {
        state.colorQuantities.set(colorId, Math.max(0, current - 1));
      }

      rerenderDrawer();
      return;
    }

    if (target.closest('[data-shipping-change]')) {
      openSharedShippingModal();
    }
  });

  body.addEventListener('change', (event) => {
    // Combined qty input (multi-variant mode)
    const combinedInput = (event.target as HTMLElement).closest<HTMLInputElement>('#combined-qty-input');
    if (combinedInput) {
      let val = Number(combinedInput.value);
      if (Number.isNaN(val) || val < 0) val = 0;
      if (state.mode === 'sample' && val > 1) {
        val = 1;
        combinedInput.value = '1';
        showSampleMaxToast();
      }
      state.combinedQuantity = val;
      rerenderDrawer();
      return;
    }

    // Per-color qty input (single-variant mode)
    const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-qty-input]');
    if (!input) return;

    const colorId = input.dataset.qtyInput ?? '';
    let nextValue = Number(input.value);
    if (Number.isNaN(nextValue) || nextValue < 0) nextValue = 0;

    if (state.mode === 'sample') {
      const othersTotal = Array.from(state.colorQuantities.entries())
        .filter(([id]) => id !== colorId)
        .reduce((a, [, b]) => a + b, 0);
      if (othersTotal + nextValue > 1) {
        nextValue = Math.max(0, 1 - othersTotal);
        input.value = String(nextValue);
        showSampleMaxToast();
      }
    }

    state.colorQuantities.set(colorId, nextValue);
    rerenderDrawer();
  });

  footer.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    if (target.closest('#shared-cart-footer-toggle')) {
      state.footerExpanded = !state.footerExpanded;
      renderDrawerFooter();
      return;
    }

    if (target.closest('#shared-cart-confirm')) {
      const totals = getTotals();
      if (totals.totalQty <= 0) {
        const confirmBtn = document.getElementById('shared-cart-confirm');
        if (!confirmBtn) return;

        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = t('cart.pleaseSelectQty');
        confirmBtn.classList.add('bg-error-500');

        setTimeout(() => {
          confirmBtn.textContent = originalText;
          confirmBtn.classList.remove('bg-error-500');
        }, 1400);
        return;
      }

      if (state.mode === 'sample' && state.item) {
        // Sample mode: save sample order separately and go to checkout
        const item = state.item;
        const selectedColor = Array.from(state.colorQuantities.entries()).find(([, qty]) => qty > 0);
        const color = selectedColor ? item.colors.find(c => c.id === selectedColor[0]) : null;
        const sampleOrder = {
          productId: item.id,
          title: item.title,
          supplierName: item.supplierName,
          samplePrice: item.samplePrice ?? 0,
          unit: item.unit,
          color: color ? { id: color.id, label: color.label, imageUrl: color.imageUrl } : null,
          quantity: 1,
          shippingMethods: item.shippingOptions.map((so, idx) => ({
            id: so.id || `ship-${idx + 1}`,
            method: so.method,
            estimatedDays: so.estimatedDays,
            baseCost: so.baseCost,
            baseCurrency: so.baseCurrency || item.baseCurrency || 'USD',
          })),
        };
        localStorage.setItem('tradehub_sample_order', JSON.stringify(sampleOrder));
        applyDrawerTransform(false);
        const base = (typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL : undefined) || '/';
        window.location.href = `${base}pages/order/checkout.html?mode=sample`;
      } else {
        dispatchCartAdd();
        applyDrawerTransform(false);
      }
    }
  });

  previewPrev?.addEventListener('click', () => {
    if (!state.item || state.item.colors.length === 0) return;
    state.previewColorIndex = (state.previewColorIndex - 1 + state.item.colors.length) % state.item.colors.length;
    updatePreview();
  });

  previewNext?.addEventListener('click', () => {
    if (!state.item || state.item.colors.length === 0) return;
    state.previewColorIndex = (state.previewColorIndex + 1) % state.item.colors.length;
    updatePreview();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('opacity-0')) {
      applyDrawerTransform(false);
    }
  });

  window.addEventListener('resize', () => {
    if (!overlay.classList.contains('opacity-0')) {
      applyDrawerTransform(true);
    }
  });
}

export function openSharedCartDrawer(itemId?: string, mode: 'cart' | 'sample' = 'cart', preselectedColorLabel?: string): void {
  openDrawer(itemId, mode, preselectedColorLabel);
}

export function setSharedCartItems(items: CartDrawerItemModel[]): void {
  productsById = new Map(items.map((item) => [item.id, item]));
}

export function initSharedShippingModal(): void {
  bindShippingEvents();
}

export function openSharedShippingModal(quantity?: number): void {
  if (!state.item) {
    const fallback = Array.from(productsById.values())[0];
    if (!fallback) return;
    state.item = fallback;
    state.selectedShippingIndex = 0;
    state.previewColorIndex = 0;
    state.footerExpanded = false;
    state.colorQuantities = new Map(fallback.colors.map((color) => [color.id, 0]));
  }
  updateShippingModal(quantity);
  setShippingModalOpen(true);
}
