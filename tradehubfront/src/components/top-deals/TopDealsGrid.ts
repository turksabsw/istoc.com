/**
 * TopDealsGrid Component
 * 5-column product grid with lightweight deal cards
 * Matches Alibaba top-deals reference design
 */

import { t } from '../../i18n';
import { formatStartingPrice } from '../../utils/currency';
import type { TopDealsProduct } from '../../types/topDeals';

export function renderTopDealCard(product: TopDealsProduct): string {
  const imgSrc = product.imageSrc || '';

  // Badge — "Match" green badge on image
  let badgeHtml = '';
  if (product.dealBadge === 'match') {
    badgeHtml = `<span class="inline-flex items-center rounded text-[11px] font-bold leading-none text-white px-1.5 py-0.5 mr-1" style="background-color: #16a34a;" data-i18n="topDealsPage.badgeMatch">${t('topDealsPage.badgeMatch')}</span>`;
  } else if (product.dealBadge === 'top-pick') {
    badgeHtml = `<span class="inline-flex items-center rounded text-[11px] font-bold leading-none text-white px-1.5 py-0.5 mr-1" style="background-color: #DE0505;">Top Pick</span>`;
  }

  // Discount line with fire icon
  let discountLineHtml = '';
  if (product.discountPercent) {
    let label = '';
    if (product.discountLabel === 'lowest') {
      label = t('topDealsPage.lowestPrices');
    } else if (product.discountLabel === 'lower') {
      label = t('topDealsPage.lowerPriced');
    } else {
      label = t('topDealsPage.offPercent', { percent: String(product.discountPercent) });
    }
    discountLineHtml = `
      <div class="flex items-center gap-1 mt-0.5">
        <svg class="w-3 h-3 flex-shrink-0 text-red-500" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0L7.8 4.2L12 4.9L9 7.8L9.7 12L6 10.1L2.3 12L3 7.8L0 4.9L4.2 4.2L6 0Z"/></svg>
        <span class="text-xs font-medium text-red-500">${label}</span>
      </div>
    `;
  }

  // Sold count
  let soldHtml = '';
  if (product.soldCount) {
    soldHtml = `<span class="text-xs text-[#999]">${product.soldCount} sold</span>`;
  }

  // Feature tags — small gray pills at bottom
  let tagsHtml = '';
  if (product.featureTags && product.featureTags.length > 0) {
    tagsHtml = `
      <div class="flex flex-wrap gap-1 mt-2 overflow-hidden max-h-[20px]">
        ${product.featureTags.map(tag => `<span class="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] text-[#999] bg-[#f5f5f5] whitespace-nowrap">${tag}</span>`).join('')}
      </div>
    `;
  }

  return `
    <a href="${product.href}" class="group/deal flex flex-col">
      <!-- Image -->
      <div class="relative aspect-square w-full overflow-hidden rounded-sm bg-gray-100">
        <img
          src="${imgSrc}"
          alt="${product.name}"
          loading="lazy"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Content -->
      <div class="pt-2">
        <!-- Badge + Product name (inline) -->
        <h3 class="text-sm font-normal text-[#333] line-clamp-2 leading-[1.4]">${badgeHtml}${product.name}</h3>

        <!-- Price + MOQ (same line) -->
        <div class="flex items-baseline gap-1.5 mt-1.5">
          <span class="text-xl font-bold text-[#222]">${formatStartingPrice(product.price)}</span>
          <span class="text-xs text-[#999]">MOQ: ${product.moq.replace(/\s*pcs$/i, '')}</span>
        </div>

        <!-- Sold count -->
        ${soldHtml ? `<div class="mt-0.5">${soldHtml}</div>` : ''}

        <!-- Discount info -->
        ${discountLineHtml}

        <!-- Feature tags -->
        ${tagsHtml}
      </div>
    </a>
  `;
}

export function TopDealsGrid(): string {
  return `
    <section class="mt-4" aria-label="Top deals products">
      <!-- Empty state (shown when no products) -->
      <div id="top-deals-grid-empty" x-show="filteredProducts.length === 0" class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <p class="text-sm text-gray-400">Yak\u0131nda yeni \u00fcr\u00fcnler eklenecek</p>
        </div>
      </div>

      <div
        id="top-deals-grid"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-5"
        role="list"
        aria-label="Deal products"
        x-show="filteredProducts.length > 0"
      >
        <template x-for="product in visibleProducts" :key="product.id">
          <div role="listitem" x-html="renderCard(product)"></div>
        </template>
      </div>

      <!-- Load more button -->
      <div class="flex justify-center mt-8" x-show="visibleCount < filteredProducts.length">
        <button
          type="button"
          class="px-8 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          @click="loadMore()"
          data-i18n="topDealsPage.loadMore"
        >${t('topDealsPage.loadMore')}</button>
      </div>
    </section>
  `;
}
