/**
 * Checkout Page — Entry Point
 * Assembles header, checkout content, and footer.
 */

import '../style.css'
import { initFlowbite } from 'flowbite'
import { t } from '../i18n'
import { getBaseUrl } from '../utils/url'
import { initCurrency } from '../services/currencyService'
import { isLoggedIn } from '../utils/auth'
import { apiCreateOrder, apiValidateCoupon } from '../services/cartService'

// Header components (reuse from main page)
import { TopBar, initMobileDrawer, SubHeader, initStickyHeaderSearch, MegaMenu, initMegaMenu, initHeaderCart } from '../components/header'
import { initLanguageSelector } from '../components/header/TopBar'

// Shared components
import { Breadcrumb } from '../components/shared/Breadcrumb'

// Footer components
import { FooterLinks } from '../components/footer'

// Floating components
import { FloatingPanel } from '../components/floating'

// Alpine.js
import { startAlpine } from '../alpine'

// Checkout components
import { CheckoutHeader, CheckoutLayout, ShippingAddressForm, OrderSummary, PaymentMethodSection, ItemsDeliverySection, OrderProtectionModal, OrderReviewModal } from '../components/checkout'
import { protectionSummaryItems, tradeAssuranceText, modalSections, paymentIcons, infoBoxBullets } from '../data/mockCheckout'
import { cartStore } from '../components/cart/state/CartStore'
import type { OrderSummary as OrderSummaryData } from '../types/checkout'
import type { CartProduct, CartShippingMethod, CartSku } from '../types/cart'
import type { CheckoutDeliveryOrderGroup } from '../components/checkout'
import { initStickyHeights } from '../utils/stickyHeights'
import { convertPrice, getSelectedCurrencyInfo } from '../services/currencyService'
import { orderStore } from '../components/orders/state/OrderStore'
import type { Order } from '../types/order'

// Expose coupon validator for Alpine component
(window as unknown as Record<string, unknown>).__validateCoupon = apiValidateCoupon;

// Sample mode detection
const isSampleMode = new URLSearchParams(window.location.search).get('mode') === 'sample';

interface SampleOrderData {
  productId: string;
  title: string;
  supplierName: string;
  samplePrice: number;
  unit: string;
  color: { id: string; label: string; imageUrl?: string } | null;
  quantity: number;
  shippingMethods?: CartShippingMethod[];
}

let sampleOrderData: SampleOrderData | null = null;

if (isSampleMode) {
  try {
    const raw = localStorage.getItem('tradehub_sample_order');
    if (raw) sampleOrderData = JSON.parse(raw) as SampleOrderData;
  } catch { /* ignore */ }
  if (!sampleOrderData) {
    window.location.replace('/');
  }
}

// CartStore'dan checkout order summary oluştur
if (!isSampleMode) {
  cartStore.load();
  if (cartStore.hasSelectedSkuMoqViolation()) {
    window.location.replace('/pages/cart.html');
  }
}

// shippingMethods eksik ürünler için backend'den shipping bilgisi çek
async function enrichMissingShippingMethods(): Promise<void> {
  if (isSampleMode) return;
  const suppliers = cartStore.getSuppliers();
  const productsNeedingShipping: { productId: string; product: CartProduct }[] = [];

  for (const supplier of suppliers) {
    for (const product of supplier.products) {
      if (!product.shippingMethods || product.shippingMethods.length === 0) {
        productsNeedingShipping.push({ productId: product.id, product });
      }
    }
  }

  if (productsNeedingShipping.length === 0) return;

  // Her ürün için listing detail'den shipping bilgisini çek
  const { getListingDetail } = await import('../services/listingService');
  const settled = await Promise.allSettled(
    productsNeedingShipping.map(async ({ productId, product }) => {
      try {
        const detail = await getListingDetail(productId);
        if (detail && detail.shipping && detail.shipping.length > 0) {
          product.shippingMethods = detail.shipping.map((s, idx) => ({
            id: `ship-${idx + 1}`,
            method: s.method,
            estimatedDays: s.estimatedDays,
            baseCost: s.baseCost ?? 0,
            baseCurrency: s.baseCurrency || detail.baseCurrency || 'USD',
          }));
        }
      } catch { /* API hatası — fallback shipping kullanılacak */ }
    })
  );
  // Güncellenen veriyi kaydet (notify tetiklenmez ama localStorage güncellenir)
  void settled;
}

const cartSummary = isSampleMode ? null : cartStore.getSummary();

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function buildProductCard(product: CartProduct): { card: CheckoutDeliveryOrderGroup['products'][number] | null; subtotal: number } {
  const selectedSkus = product.skus.filter((sku) => sku.selected);
  if (selectedSkus.length === 0) return { card: null, subtotal: 0 };

  const skuLines = selectedSkus.map((sku: CartSku) => ({
    id: sku.id,
    image: sku.skuImage,
    variantText: sku.variantText,
    unitPrice: sku.unitPrice,
    quantity: sku.quantity,
    listingVariant: sku.listingVariant,
  }));

  const subtotal = selectedSkus.reduce((sum, sku) => sum + (sku.unitPrice * sku.quantity), 0);
  const image = selectedSkus[0]?.skuImage || '';

  return {
    subtotal,
    card: {
      id: product.id,
      title: product.title,
      moqLabel: product.moqLabel,
      image,
      skuLines,
    },
  };
}

function buildSampleDeliveryOrders(): CheckoutDeliveryOrderGroup[] {
  if (!sampleOrderData) return [];
  const now = new Date();
  const sellerId = sampleOrderData.supplierName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  let methods: CheckoutDeliveryOrderGroup['methods'];

  if (sampleOrderData.shippingMethods && sampleOrderData.shippingMethods.length > 0) {
    // Dynamic: use backend shipping methods with currency conversion
    methods = sampleOrderData.shippingMethods.map((sm, idx) => ({
      id: sm.id || `method-sample-${idx}`,
      etaLabel: sm.estimatedDays
        ? `Estimated delivery: ${sm.estimatedDays}`
        : `Shipping option ${idx + 1}`,
      shippingFee: Number(convertPrice(sm.baseCost, sm.baseCurrency).toFixed(2)),
      isDefault: idx === 0,
    }));
  } else {
    // Fallback: default shipping for old sample data
    const start1 = addDays(now, 10);
    const end1 = addDays(now, 24);
    methods = [{
      id: `method-sample-1`,
      etaLabel: `Estimated delivery by ${formatMonthDay(start1)}-${formatMonthDay(end1)}`,
      shippingFee: 5,
      isDefault: true,
    }];
  }

  return [{
    orderId: 'order-sample',
    orderLabel: t('cart.sampleOrder') || 'Sample Order',
    sellerId,
    sellerName: sampleOrderData.supplierName,
    methods,
    products: [{
      id: sampleOrderData.productId,
      title: sampleOrderData.title,
      moqLabel: `${t('cart.sampleMaxNote')}`,
      image: sampleOrderData.color?.imageUrl || '',
      skuLines: [{
        id: `sample-${sampleOrderData.productId}`,
        image: sampleOrderData.color?.imageUrl || '',
        variantText: sampleOrderData.color ? `${t('cart.colorLabel')}: ${sampleOrderData.color.label}` : '',
        unitPrice: sampleOrderData.samplePrice,
        quantity: 1,
      }],
    }],
  }];
}

function buildDeliveryOrders(): CheckoutDeliveryOrderGroup[] {
  if (!cartSummary) return [];
  const suppliers = cartStore.getSuppliers();
  const selectedSuppliers = suppliers
    .map((supplier) => {
      const products = supplier.products
        .map((product) => buildProductCard(product))
        .filter((row): row is { card: CheckoutDeliveryOrderGroup['products'][number]; subtotal: number } => Boolean(row.card));

      const subtotal = products.reduce((sum, row) => sum + row.subtotal, 0);
      return {
        supplier,
        subtotal,
        products: products.map((row) => row.card),
        // Collect shipping methods from products that have backend data
        sourceProducts: supplier.products.filter(p => p.skus.some(s => s.selected)),
      };
    })
    .filter((row) => row.subtotal > 0 && row.products.length > 0);

  if (selectedSuppliers.length === 0) return [];

  const now = new Date();

  return selectedSuppliers.map((row, index) => {
    // Find the first product with backend shipping methods
    const productWithShipping = row.sourceProducts.find(
      p => p.shippingMethods && p.shippingMethods.length > 0
    );

    let methods: CheckoutDeliveryOrderGroup['methods'];

    if (productWithShipping?.shippingMethods && productWithShipping.shippingMethods.length > 0) {
      // Dynamic: use backend shipping methods with currency conversion
      methods = productWithShipping.shippingMethods.map((sm, idx) => ({
        id: sm.id || `method-${index}-${idx}`,
        etaLabel: sm.estimatedDays
          ? `Estimated delivery: ${sm.estimatedDays}`
          : `Shipping option ${idx + 1}`,
        shippingFee: Number(convertPrice(sm.baseCost, sm.baseCurrency).toFixed(2)),
        isDefault: idx === 0,
      }));
    } else {
      // Fallback: generate default shipping methods for old cart data
      const start1 = addDays(now, 10 + (index * 2));
      const end1 = addDays(now, 24 + (index * 2));
      const start2 = addDays(now, 14 + (index * 2));
      const end2 = addDays(now, 24 + (index * 2));

      methods = [
        {
          id: `method-${row.supplier.id}-1`,
          etaLabel: `Estimated delivery by ${formatMonthDay(start1)}-${formatMonthDay(end1)}`,
          shippingFee: 5,
          isDefault: true,
        },
        {
          id: `method-${row.supplier.id}-2`,
          etaLabel: `Estimated delivery by ${formatMonthDay(start2)}-${formatMonthDay(end2)}`,
          shippingFee: 10,
        },
      ];
    }

    return {
      orderId: `order-${index + 1}`,
      orderLabel: `Order ${index + 1}`,
      sellerId: row.supplier.id,
      sellerName: row.supplier.name,
      methods,
      products: row.products,
    };
  });
}

// Modül düzeyinde tutulan checkout durumu — renderCheckout sonrası doldurulur
let checkoutDeliveryOrders: CheckoutDeliveryOrderGroup[] = [];
let currentDefaultShippingFee = 0;
let currentCheckoutOrderSummary: OrderSummaryData | null = null;

// Build Order objects from checkout data
function buildOrdersFromCheckout(paymentMethod: string): Order[] {
  const now = Date.now();
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }) + ', PST';

  const isCreditCard = paymentMethod === 'credit_card';

  return checkoutDeliveryOrders.map((deliveryOrder, idx) => {
    const supplier = cartStore.getSupplier(deliveryOrder.sellerId);
    const selectedMethod = deliveryOrder.methods.find((m) => m.isDefault) ?? deliveryOrder.methods[0];
    const shippingFee = selectedMethod?.shippingFee ?? 0;

    const products = deliveryOrder.products.map((p) => {
      const totalQty = p.skuLines.reduce((sum, sku) => sum + sku.quantity, 0);
      const totalPrice = p.skuLines.reduce((sum, sku) => sum + sku.unitPrice * sku.quantity, 0);
      return {
        name: p.title,
        variation: p.skuLines.map((s) => s.variantText).join(', '),
        unitPrice: (totalPrice / totalQty).toFixed(2),
        quantity: totalQty,
        totalPrice: totalPrice.toFixed(2),
        image: p.image,
      };
    });

    const subtotal = products.reduce((sum, p) => sum + Number(p.totalPrice), 0);
    const grandTotal = subtotal + shippingFee;
    const orderNumber = `ORD-${(now + idx).toString(36).toUpperCase()}`;

    return {
      id: `ord-${now}-${idx}`,
      orderNumber,
      orderDate: dateStr,
      total: grandTotal.toFixed(2),
      currency: getSelectedCurrencyInfo().code,
      seller: deliveryOrder.sellerName,
      status: isCreditCard ? 'Confirming' : 'Waiting for payment',
      statusColor: isCreditCard ? 'text-blue-600' : 'text-amber-600',
      statusDescription: isCreditCard
        ? 'Your payment is being confirmed.'
        : 'Please complete your payment soon.',
      products,
      shipping: {
        trackingStatus: 'Pending',
        address: 'Turkey',
        shipFrom: 'China',
        method: selectedMethod?.etaLabel ?? 'Standard',
        incoterms: 'DAP',
      },
      payment: {
        status: isCreditCard ? 'Processing' : 'Unpaid',
        hasRecord: false,
        subtotal: subtotal.toFixed(2),
        shippingFee: shippingFee.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      },
      supplier: {
        name: supplier?.name ?? deliveryOrder.sellerName,
        contact: 'Sales Team',
        phone: '+86 123 4567 8900',
        email: `contact@supplier${idx + 1}.com`,
      },
      paymentMethod,
      createdAt: now,
    } as Order;
  });
}

// Gather review data from DOM
function gatherReviewData() {
  const addrParts: string[] = [];
  const firstNameEl = document.querySelector<HTMLInputElement>('[name="firstName"]');
  const lastNameEl = document.querySelector<HTMLInputElement>('[name="lastName"]');
  const streetEl = document.querySelector<HTMLInputElement>('[name="streetAddress"]');
  const cityEl = document.querySelector<HTMLInputElement>('[name="city"]');
  const stateEl = document.querySelector<HTMLSelectElement>('[name="state"]');
  const postalEl = document.querySelector<HTMLInputElement>('[name="postalCode"]');
  if (firstNameEl?.value) addrParts.push(firstNameEl.value + (lastNameEl?.value ? ' ' + lastNameEl.value : ''));
  if (streetEl?.value) addrParts.push(streetEl.value);
  if (cityEl?.value) addrParts.push(cityEl.value);
  if (stateEl?.value) addrParts.push(stateEl.value);
  if (postalEl?.value) addrParts.push(postalEl.value);
  const shippingAddress = addrParts.length > 0 ? addrParts.join(', ') : 'Not provided';

  let paymentLabel = t('checkout.creditDebitCard');
  const selected = document.querySelector<HTMLInputElement>('input[name="payment_method"]:checked');
  if (selected) {
    switch (selected.value) {
      case 'elden': paymentLabel = 'Elden Taksit'; break;
      case 'anlasmali': paymentLabel = t('checkout.negotiatedWithSupplier'); break;
      case 'kredi_karti': paymentLabel = t('checkout.creditDebitCard'); break;
      case 'banka_havale': paymentLabel = 'Bank Transfer / EFT'; break;
      case 'cek_senet': paymentLabel = t('checkout.checkDraft'); break;
      default: paymentLabel = t('checkout.creditDebitCard');
    }
  }

  const sidebarEl = document.querySelector<HTMLElement>('.checkout-sidebar');
  const alpineData = sidebarEl && ((sidebarEl as any)._x_dataStack as Record<string, unknown>[] | undefined)?.[0] as Record<string, unknown> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  const couponDiscount = Number(alpineData?.couponDiscount ?? 0);
  const shippingFee = Number(alpineData?.shippingFee ?? currentDefaultShippingFee);
  const itemSubtotal = Number(alpineData?.itemSubtotal ?? currentCheckoutOrderSummary?.itemSubtotal ?? 0);
  const discount = Number(alpineData?.discount ?? 0);
  const total = Number((itemSubtotal + shippingFee - discount - couponDiscount).toFixed(2));

  return {
    shippingAddress,
    paymentMethod: paymentLabel,
    orders: checkoutDeliveryOrders,
    summary: {
      itemSubtotal: itemSubtotal.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      total: total.toFixed(2),
    },
  };
}

// Confirm Order (from review modal) → backend API + redirect — modül düzeyinde bir kez kayıt
window.addEventListener('checkout:confirm-order', () => {
  const orderCount = checkoutDeliveryOrders.length;

  const selected = document.querySelector<HTMLInputElement>('input[name="payment_method"]:checked');
  const selectedPaymentValue = selected?.value || 'kredi_karti';
  const isCreditCard = selectedPaymentValue === 'kredi_karti';

  const paymentMethodMap: Record<string, string> = {
    elden: 'installment',
    anlasmali: 'negotiated',
    kredi_karti: 'credit_card',
    cek_senet: 'check_promissory',
    banka_havale: 'bank_transfer',
  };
  const paymentMethod = paymentMethodMap[selectedPaymentValue] || 'bank_transfer';
  const newOrders = buildOrdersFromCheckout(paymentMethod);

  orderStore.load();
  orderStore.addOrders(newOrders);

  if (isSampleMode) {
    localStorage.removeItem('tradehub_sample_order');
  }

  const reviewData = gatherReviewData();
  const shippingAddress = reviewData.shippingAddress;

  const backendOrders = checkoutDeliveryOrders.map((deliveryOrder) => {
    const selectedMethod = deliveryOrder.methods.find((m) => m.isDefault) ?? deliveryOrder.methods[0];
    return {
      seller_id: deliveryOrder.sellerId || '',
      seller_name: deliveryOrder.sellerName,
      shipping_fee: selectedMethod?.shippingFee ?? 0,
      shipping_method: selectedMethod?.etaLabel ?? '',
      currency: getSelectedCurrencyInfo().code,
      products: deliveryOrder.products.map((p) => ({
        listing: p.id,
        listing_title: p.title,
        listing_variant: p.skuLines[0]?.listingVariant ?? null,
        variation: p.skuLines.map((s) => s.variantText).filter(Boolean).join(', '),
        unit_price: p.skuLines[0]?.unitPrice ?? 0,
        quantity: p.skuLines.reduce((sum, s) => sum + s.quantity, 0),
        total_price: p.skuLines.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0),
        image: p.image,
      })),
    };
  });

  const orderNumbers = newOrders.map((o) => o.orderNumber).join(',');

  function redirect() {
    if (isCreditCard) {
      window.location.href = `${getBaseUrl()}pages/order/payment-processing.html?count=${orderCount}&method=credit_card&orderNumbers=${encodeURIComponent(orderNumbers)}`;
    } else {
      window.location.href = `${getBaseUrl()}pages/order/order-success.html?status=pending&count=${orderCount}&orderNumbers=${encodeURIComponent(orderNumbers)}`;
    }
  }

  if (isLoggedIn()) {
    apiCreateOrder(backendOrders, shippingAddress, paymentMethod)
      .then(() => { redirect(); })
      .catch(() => { redirect(); });
  } else {
    redirect();
  }
});

// Checkout render'ı async — önce eksik shipping verisi çekilir, sonra sayfa render edilir
async function renderCheckout() {
await initCurrency();
await enrichMissingShippingMethods();

checkoutDeliveryOrders = isSampleMode ? buildSampleDeliveryOrders() : buildDeliveryOrders();
currentDefaultShippingFee = Number(
  checkoutDeliveryOrders.reduce((sum, order) => {
    const defaultMethod = order.methods.find((method) => method.isDefault) ?? order.methods[0];
    return sum + (defaultMethod?.shippingFee ?? 0);
  }, 0).toFixed(2),
);

const sampleSubtotal = sampleOrderData ? sampleOrderData.samplePrice * sampleOrderData.quantity : 0;

currentCheckoutOrderSummary = isSampleMode ? {
  itemCount: 1,
  thumbnails: sampleOrderData?.color?.imageUrl ? [{ image: sampleOrderData.color.imageUrl, quantity: 1 }] : [],
  itemSubtotal: sampleSubtotal,
  shipping: currentDefaultShippingFee,
  subtotal: sampleSubtotal + currentDefaultShippingFee,
  processingFee: 0,
  total: sampleSubtotal + currentDefaultShippingFee,
  currency: getSelectedCurrencyInfo().code,
} : {
  itemCount: cartSummary!.selectedCount || cartSummary!.items.reduce((s, i) => s + i.quantity, 0),
  thumbnails: cartSummary!.items.map(i => ({ image: i.image, quantity: i.quantity })),
  itemSubtotal: cartSummary!.productSubtotal,
  shipping: currentDefaultShippingFee,
  subtotal: cartSummary!.productSubtotal + currentDefaultShippingFee - cartSummary!.discount,
  processingFee: 0,
  total: cartSummary!.productSubtotal + currentDefaultShippingFee - cartSummary!.discount,
  currency: getSelectedCurrencyInfo().code,
};

const appEl = document.querySelector<HTMLDivElement>('#app')!;
appEl.classList.add('relative');
appEl.innerHTML = `
  <!-- Header (Not Sticky for Checkout Page) -->
  <div id="sticky-header" class="relative bg-white border-b border-[#e5e5e5] w-full">
    ${TopBar()}
    ${SubHeader()}
  </div>

  ${MegaMenu()}

  <!-- Main Content -->
  <main>
    <div class="container-boxed">
      ${Breadcrumb([{ label: t('cart.title'), href: '/pages/cart.html' }, { label: t('checkout.paymentMethod') }])}
    </div>
    ${CheckoutLayout({
  leftContent: `
        ${CheckoutHeader()}
        ${ShippingAddressForm()}
        ${PaymentMethodSection({ suppliers: cartStore.getSuppliers().filter(s => s.products.some(p => p.skus.some(sku => sku.selected))), isSupplierCheckout: new URLSearchParams(window.location.search).has('supplier') })}
        ${ItemsDeliverySection({ orders: checkoutDeliveryOrders })}
      `,
  rightContent: `
        ${OrderSummary({ data: currentCheckoutOrderSummary!, protectionItems: protectionSummaryItems, tradeAssuranceText })}
      `
})}
  </main>

  <!-- Footer -->
  <footer>
    ${FooterLinks()}
  </footer>

  <!-- Floating Panel -->
  ${FloatingPanel()}

  <!-- Order Protection Modal -->
  ${OrderProtectionModal({ sections: modalSections, paymentIcons, infoBoxBullets })}

  <!-- Order Review Modal -->
  ${OrderReviewModal()}
`;

// Initialize behaviors
initMegaMenu();
initFlowbite();
startAlpine();
initStickyHeaderSearch();
initMobileDrawer();
initLanguageSelector();
initHeaderCart();
initStickyHeights();

// Place Order → open review modal
const placeOrderBtn = document.getElementById('summary-place-order-btn');
if (placeOrderBtn) {
  placeOrderBtn.addEventListener('click', () => {
    // Validate shipping address before opening review
    const shippingSection = document.getElementById('shipping-address-section');
    if (shippingSection) {
      const alpineData = ((shippingSection as any)._x_dataStack as Record<string, unknown>[] | undefined)?.[0] as any;
      if (alpineData) {
        if (alpineData.showAddressForm) {
          alpineData.handleSubmit();
          if (Object.values(alpineData.errors || {}).some(e => e)) {
            return;
          }
        } else if (!alpineData.selectedAddressId) {
          alpineData.showAddressForm = true;
          return;
        }
      }
    }

    const reviewData = gatherReviewData();
    window.dispatchEvent(new CustomEvent('checkout:open-review', { detail: reviewData }));
  });
}

} // renderCheckout sonu

renderCheckout();
