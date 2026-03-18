/**
 * Seller Storefront — Page Orchestrator
 * All seller data is fetched dynamically from API via Alpine.js sellerStorefront store
 */
import '../style.css';
import '../styles/seller/seller-storefront.css';
import { initFlowbite } from 'flowbite';
import 'swiper/swiper-bundle.css';
import { startAlpine } from '../alpine';

// Components
import { TopBar } from '../components/header';
import { initLanguageSelector } from '../components/header/TopBar'
import { StoreHeader, StoreNav } from '../components/seller';
import { CompanyProfileComponent } from '../components/seller/CompanyProfile';

// Interactions
import { initSellerStorefront } from '../utils/seller/interactions';

// Minimal static nav structure (page-level navigation, not seller data)
import { getNavData } from '../data/seller/mockData';
const navData = getNavData();

// ─── Render ─────────────────────────────────────────────
const appEl = document.querySelector<HTMLDivElement>('#app')!;

appEl.innerHTML = `
  <!-- MAIN PLATFORM HEADER -->
  ${TopBar()}

  <main class="seller-storefront flex flex-col min-h-screen" x-data="sellerStorefront">
    ${StoreHeader()}
    ${StoreNav(navData)}

    <!-- PROFILE VIEW -->
    ${CompanyProfileComponent()}

  </main>

  <!-- SITE FOOTER PLACEHOLDER -->
`;

// ─── Initialize ─────────────────────────────────────────
initFlowbite();
initLanguageSelector();
initSellerStorefront();

// Start Alpine.js (must be called AFTER innerHTML is set)
startAlpine();
