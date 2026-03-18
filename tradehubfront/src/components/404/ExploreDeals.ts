/**
 * 404 Page — Explore Top Deals Section
 * Backend API'den dinamik ürünler çeker.
 * Swiper slider ile responsive gösterim.
 */

import Swiper from 'swiper';
import { Navigation } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { searchListings } from '../../services/listingService';
import { initCurrency } from '../../services/currencyService';
import type { ProductListingCard } from '../../types/productListing';

function renderProductCard(p: ProductListingCard): string {
  const imageHtml = p.imageSrc
    ? `<img src="${p.imageSrc}" alt="${p.name}" class="w-full h-full object-cover rounded-md" loading="lazy" />`
    : `<div class="w-full h-full bg-gray-100 rounded-md flex items-center justify-center">
        <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 3h18v18H3z"/></svg>
       </div>`;

  return `
    <div class="swiper-slide">
      <a href="${p.href}" class="group/card relative flex flex-col min-w-0" aria-label="${p.name}">
        <div class="aspect-square w-full mb-2 flex-shrink-0 overflow-hidden rounded-md">
          ${imageHtml}
        </div>
        <p class="text-sm sm:text-[15px] font-bold leading-tight truncate" style="color:var(--color-error-600, #dc2626)">${p.price}</p>
        <p class="mt-1 text-xs sm:text-[13px] font-medium leading-none truncate text-secondary-700 dark:text-secondary-300">${p.moq}</p>
        ${p.supplierCountry ? `<p class="mt-0.5 text-[11px] text-secondary-400">${p.supplierCountry}</p>` : ''}
      </a>
    </div>
  `;
}

function renderLoadingState(): string {
  const skeleton = Array.from({ length: 6 }, () => `
    <div class="swiper-slide">
      <div class="flex flex-col gap-2 animate-pulse">
        <div class="aspect-square w-full bg-gray-200 rounded-md"></div>
        <div class="h-4 bg-gray-200 rounded w-16"></div>
        <div class="h-3 bg-gray-100 rounded w-20"></div>
      </div>
    </div>
  `).join('');

  return `
    <div class="swiper explore-swiper-0 overflow-hidden">
      <div class="swiper-wrapper">${skeleton}</div>
    </div>
  `;
}

export function ExploreDeals(): string {
  return `
    <section id="explore-deals-section" class="py-6 sm:py-8 lg:py-10 border-t border-secondary-100 dark:border-secondary-800">
      <div class="container-boxed">
        <h2 class="text-lg sm:text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">
          En iyi fırsatları keşfedin
        </h2>
        <div id="explore-deals-content">
          ${renderLoadingState()}
        </div>
      </div>
    </section>
  `;
}

export async function initExploreDeals(): Promise<void> {
  const container = document.getElementById('explore-deals-content');
  if (!container) return;

  try {
    await initCurrency();
    const result = await searchListings({ page_size: 12, sort_by: 'modified', sort_order: 'desc' });

    if (!result.products || result.products.length === 0) {
      container.innerHTML = `
        <p class="text-sm text-secondary-400 py-8 text-center">Henüz ürün bulunmuyor.</p>
      `;
      return;
    }

    // Ürün kartlarını render et
    const cardsHtml = result.products.map(p => renderProductCard(p)).join('');

    container.innerHTML = `
      <div class="group/explore relative">
        <div class="swiper explore-swiper overflow-hidden" aria-label="Öne çıkan ürünler">
          <div class="swiper-wrapper">${cardsHtml}</div>
        </div>
        <button aria-label="Önceki" class="explore-prev absolute left-0 top-[calc(50%-40px)] z-10 hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-all hover:text-gray-900 opacity-0 pointer-events-none md:flex group-hover/explore:opacity-100 group-hover/explore:pointer-events-auto disabled:opacity-0 disabled:pointer-events-none">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button aria-label="Sonraki" class="explore-next absolute right-0 top-[calc(50%-40px)] z-10 hidden h-9 w-9 translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-all hover:text-gray-900 opacity-0 pointer-events-none md:flex group-hover/explore:opacity-100 group-hover/explore:pointer-events-auto disabled:opacity-0 disabled:pointer-events-none">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    `;

    // Swiper init
    const swiperEl = container.querySelector<HTMLElement>('.explore-swiper');
    if (swiperEl) {
      new Swiper(swiperEl, {
        modules: [Navigation],
        spaceBetween: 10,
        navigation: {
          nextEl: '.explore-next',
          prevEl: '.explore-prev',
        },
        breakpoints: {
          0: { slidesPerView: 2.3, spaceBetween: 8 },
          400: { slidesPerView: 2.8, spaceBetween: 10 },
          480: { slidesPerView: 3.3, spaceBetween: 10 },
          640: { slidesPerView: 4, spaceBetween: 12 },
          768: { slidesPerView: 4.5, spaceBetween: 12 },
          1024: { slidesPerView: 5.5, spaceBetween: 14 },
          1280: { slidesPerView: 6.5, spaceBetween: 16 },
        },
      });
    }
  } catch {
    // API hatası — bölümü gizle
    const section = document.getElementById('explore-deals-section');
    if (section) section.style.display = 'none';
  }
}
