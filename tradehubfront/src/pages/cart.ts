/**
 * Cart Page — Entry Point
 * Assembles header, cart content, and footer.
 */

import '../style.css'
import { initFlowbite } from 'flowbite'
import { initStickyHeights } from '../utils/stickyHeights'
import { t } from '../i18n'
import { initCurrency } from '../services/currencyService'

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

// localStorage'dan sepet verisini yükle
cartStore.load();
const cartSuppliers = cartStore.getSuppliers();
const cartSummary = cartStore.getSummary();

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
    ${CartPage({
  suppliers: cartSuppliers,
  summary: cartSummary,
  assuranceItems
})}
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

// Initialize all behaviors
initMegaMenu();
initFlowbite();
initMobileDrawer();
initLanguageSelector();

// Currency init → cart page → header cart (sıralı, currency load sonrası fiyat hesaplaması)
initCurrency().then(() => {
  initCartPage();
  initHeaderCart();
});
initStickyHeights();

// Start Alpine LAST — after innerHTML is set so it can find all x-data directives in the DOM
startAlpine();
