/**
 * Cart Page — Entry Point
 * Assembles header, cart content, and footer.
 */

import '../style.css'
import { initFlowbite } from 'flowbite'
import { initStickyHeights } from '../utils/stickyHeights'
import { t } from '../i18n'
import { initCurrency, getSelectedCurrencyInfo } from '../services/currencyService'

// Header components (reuse from main page)
import { TopBar, initMobileDrawer, SubHeader, MegaMenu, initMegaMenu, initHeaderCart } from '../components/header'
import { initLanguageSelector } from '../components/header/TopBar'

// Shared components
import { Breadcrumb } from '../components/shared/Breadcrumb'

// Footer components
import { FooterLinks } from '../components/footer'

// Floating components
import { FloatingPanel } from '../components/floating'

// Alpine.js
import { startAlpine } from '../alpine'

// Cart components
import { CartPage, initCartPage } from '../components/cart/page/CartPage'
import { cartStore } from '../components/cart/state/CartStore'
import { fetchCart, apiMergeGuestCart } from '../services/cartService'
import { getSessionUser } from '../utils/auth'

// Assurance items (static UI content)
const assuranceItems = [
  {
    icon: '🛡️',
    title: t('mockData.cart.assurance1Title'),
    description: t('mockData.cart.assurance1Desc'),
  },
  {
    icon: '📦',
    title: t('mockData.cart.assurance2Title'),
    description: t('mockData.cart.assurance2Desc'),
  },
  {
    icon: '✅',
    title: t('mockData.cart.assurance3Title'),
    description: t('mockData.cart.assurance3Desc'),
  },
];

const appEl = document.querySelector<HTMLDivElement>('#app')!;
appEl.classList.add('relative');

function renderPage(suppliers: ReturnType<typeof cartStore.getSuppliers>, summary: ReturnType<typeof cartStore.getSummary>) {
  appEl.innerHTML = `
    <!-- Header -->
    <div id="sticky-header" class="relative bg-white border-b border-[#e5e5e5] w-full z-40">
      <div class="relative z-50 bg-white">
        ${TopBar()}
        ${SubHeader()}
      </div>
    </div>

    ${MegaMenu()}

    <!-- Main Content -->
    <main class="min-h-screen bg-surface relative z-10 pt-4 flex flex-col">
      <div class="container-boxed">
        ${Breadcrumb([{ label: 'Sepetim' }])}
      </div>

      <!-- Client-side Cart Container -->
      ${CartPage({ suppliers, summary, assuranceItems })}
    </main>

    <!-- Footer -->
    <footer class="relative z-10 mt-12 border-t border-border-default pt-12 pb-8 bg-white">
      <div class="container-boxed">
        ${FooterLinks()}
      </div>
    </footer>

    <!-- Floating Panel -->
    ${FloatingPanel()}
  `;

  initMegaMenu();
  initFlowbite();
  initMobileDrawer();
  initLanguageSelector();
  initStickyHeights();

  initCurrency().then(() => {
    initCartPage();
    initHeaderCart();
  });

  startAlpine();
}

async function initCartPage_async() {
  // 1) localStorage'dan yükle (hızlı, fallback)
  cartStore.load();

  // 2) Önce para birimini yükle — cartStore.init() currency sembolüne ihtiyaç duyar
  await initCurrency();
  const currencySymbol = getSelectedCurrencyInfo().symbol;

  try {
    // 3) Oturum kontrolü
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      // 4a) API'dan sepeti getir
      const apiCart = await fetchCart();

      if (apiCart.suppliers.length > 0) {
        // Backend'deki listing ID'leri
        const backendListingIds = new Set(
          apiCart.suppliers.flatMap(s => s.products.map(p => p.id))
        );

        // localStorage'da olup backend'de olmayan ürünler
        const localOnlyItems = cartStore.getSuppliers().flatMap(s =>
          s.products
            .filter(p => !backendListingIds.has(p.id))
            .flatMap(p =>
              p.skus.map(sku => ({
                listing: p.id,
                quantity: sku.quantity,
                ...(sku.listingVariant ? { listing_variant: sku.listingVariant } : {}),
              }))
            )
        );

        if (localOnlyItems.length > 0) {
          // Fazladan local ürünleri backend'e merge et, sonucu kullan
          const merged = await apiMergeGuestCart(localOnlyItems);
          cartStore.init(
            merged.suppliers.length > 0 ? merged.suppliers : apiCart.suppliers,
            0, currencySymbol, 0
          );
        } else {
          // Sadece backend verisini kullan
          cartStore.init(apiCart.suppliers, 0, currencySymbol, 0);
        }
      } else if (cartStore.getTotalSkuCount() > 0) {
        // Backend boş, localStorage'da ürün var → tümünü merge et
        const localItems = cartStore.getSuppliers().flatMap(s =>
          s.products.flatMap(p =>
            p.skus.map(sku => ({
              listing: p.id,
              quantity: sku.quantity,
              ...(sku.listingVariant ? { listing_variant: sku.listingVariant } : {}),
            }))
          )
        );
        const merged = await apiMergeGuestCart(localItems);
        if (merged.suppliers.length > 0) {
          cartStore.init(merged.suppliers, 0, currencySymbol, 0);
        }
      }
    }
  } catch {
    // API erişilemez ya da misafir kullanıcı — localStorage verisiyle devam et
  }

  renderPage(cartStore.getSuppliers(), cartStore.getSummary());
}

initCartPage_async();
