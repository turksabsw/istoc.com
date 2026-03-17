import Swiper from 'swiper';
import { Navigation } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { t } from '../../i18n';

// Seller tipi
interface Seller {
  seller_name: string;
  seller_code: string;
  logo: string | null;
  banner_image: string | null;
  description: string | null;
  city: string | null;
  rating: number;
  total_orders: number;
  health_score: number;
  score_grade: string;
  seller_type: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  product_images: string[];
}

// Frappe API'den satıcıları çek
async function fetchSellers(): Promise<Seller[]> {
  const res = await fetch('/api/method/tradehub_core.api.seller.list_sellers', {
    credentials: 'include',
  });
  if (!res.ok) return [];
  const data = await res.json() as { message: { sellers: Seller[] } };
  return data.message?.sellers ?? [];
}

// Loading iskelet HTML
function renderSkeleton(): string {
  return Array.from({ length: 3 }).map(() => `
    <div class="bg-white rounded-lg p-5 mb-5 animate-pulse">
      <div class="flex items-start gap-3 mb-6">
        <div class="w-[50px] h-[50px] bg-gray-200 rounded shrink-0"></div>
        <div class="flex-1">
          <div class="h-4 bg-gray-200 rounded w-64 mb-2"></div>
          <div class="h-3 bg-gray-100 rounded w-40"></div>
        </div>
      </div>
      <div class="flex gap-3">
        <div class="w-[244px] shrink-0">
          <div class="h-3 bg-gray-200 rounded w-32 mb-3"></div>
          <div class="h-3 bg-gray-100 rounded w-24 mb-2"></div>
          <div class="h-3 bg-gray-100 rounded w-28 mb-2"></div>
        </div>
        <div class="flex gap-3 flex-1">
          ${Array.from({ length: 4 }).map(() => `
            <div class="flex-1 aspect-square bg-gray-100 rounded-lg"></div>
          `).join('')}
        </div>
        <div class="w-[320px] h-[240px] bg-gray-100 rounded shrink-0"></div>
      </div>
    </div>
  `).join('');
}

// Görsel yoksa kullanılan placeholder (tek renk + ikon yerine sade gri)
const PLACEHOLDER_IMAGES = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-size="48" fill="%23d1d5db"%3E📦%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-size="48" fill="%23d1d5db"%3E🏭%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-size="48" fill="%23d1d5db"%3E🛒%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-size="48" fill="%23d1d5db"%3E📷%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-size="48" fill="%23d1d5db"%3E⭐%3C/text%3E%3C/svg%3E',
];

const DEFAULT_LOGO = "/assets/tradehub_core/images/placeholder-logo.png";

// Satıcı tipine göre etiket
function getSellerTypeBadge(seller: Seller): string {
  if (seller.seller_type === 'Corporate') {
    return `<span class="inline-flex items-center gap-1 text-[#1a66ff] font-bold text-[13px]">
      <img src="https://img.icons8.com/fluency/16/verified-badge.png" alt="Doğrulanmış" class="w-4 h-4" />
      ${t('mfr.list.verified')}
    </span>`;
  }
  return `<span class="text-[13px] text-gray-500">Bireysel Satıcı</span>`;
}

// Tek kart HTML
function renderSellerCard(seller: Seller, idx: number): string {
  const logo = seller.logo || DEFAULT_LOGO;
  // Gerçek ürün görselleri varsa kullan, yoksa sade placeholder göster
  const realImages = seller.product_images || [];
  const factoryImages = realImages.length > 0
    ? [...realImages, ...PLACEHOLDER_IMAGES].slice(0, 5)
    : PLACEHOLDER_IMAGES;
  const totalImages = factoryImages.length;
  const city = seller.city || '';
  const ratingText = seller.rating > 0 ? seller.rating.toFixed(1) : '—';
  const reviewCount = seller.total_orders > 0 ? `${seller.total_orders}+ sipariş` : 'Yeni';
  const description = seller.description || 'Satıcı hakkında bilgi bulunmamaktadır.';
  const scoreGrade = seller.score_grade || 'A';
  const healthScore = seller.health_score || 100;
  const storefront = `/pages/seller/seller-storefront.html?seller=${seller.seller_code}`;

  return `
    <div class="bg-white rounded-lg p-3 mb-2 lg:p-5 lg:mb-5"
         data-factory-card="${idx}"
         data-factory-name="${seller.seller_name}"
         data-factory-images='${JSON.stringify(factoryImages).replace(/'/g, "&#39;")}'>

      <!-- Desktop Layout -->
      <div class="hidden lg:flex flex-col">
        <!-- Başlık Satırı -->
        <div class="flex flex-col xl:flex-row gap-4 xl:gap-0 justify-between items-start mb-6 xl:mb-8">

          <!-- Sol: Logo + Bilgi -->
          <div class="flex items-start min-w-0">
            <a href="${storefront}" class="w-[45px] h-[45px] xl:w-[50px] xl:h-[50px] border border-[#ddd] rounded overflow-hidden shrink-0 mr-3 block">
              <img src="${logo}" alt="${seller.seller_name}" class="w-full h-full object-cover" />
            </a>
            <div class="min-w-0 flex-1">
              <a href="${storefront}" class="hover:text-[#1a66ff] transition-colors">
                <h3 class="text-[15px] xl:text-[16px] font-bold text-[#222] truncate max-w-[350px] xl:max-w-[440px]">${seller.seller_name}</h3>
              </a>
              <div class="flex flex-wrap items-center gap-1 xl:gap-1.5 mt-1 text-[12px] xl:text-[14px] text-[#222]">
                ${getSellerTypeBadge(seller)}
                ${city ? `<span class="text-gray-400">·</span><span>${city}</span>` : ''}
                <span class="text-gray-400">·</span>
                <span class="text-xs px-1.5 py-0.5 rounded font-bold ${scoreGrade === 'A' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">Puan: ${scoreGrade}</span>
              </div>
            </div>
          </div>

          <!-- Sağ: Butonlar -->
          <div class="flex items-center gap-2 xl:gap-5 shrink-0">
            <button type="button" class="text-gray-400 hover:text-red-500 transition-colors" aria-label="Favorilere ekle">
              <svg class="w-[20px] h-[20px] xl:w-[25px] xl:h-[25px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
            <button type="button" class="h-8 xl:h-10 px-3 xl:px-4 border border-[#222] rounded-full text-[12px] xl:text-[14px] font-bold text-[#222] bg-white hover:bg-gray-50 transition-colors whitespace-nowrap">
              ${t('mfr.list.chatNow')}
            </button>
            <a href="${storefront}" class="h-8 xl:h-10 px-3 xl:px-4 border border-[#222] rounded-full text-[12px] xl:text-[14px] font-bold text-[#222] bg-white hover:bg-gray-50 transition-colors whitespace-nowrap flex items-center">
              Mağazayı Gör
            </a>
          </div>
        </div>

        <!-- İçerik Satırı -->
        <div class="flex justify-between gap-3 xl:gap-3 2xl:gap-4">

          <!-- Sol: İstatistikler -->
          <div class="w-[180px] xl:w-[244px] shrink-0 pr-1 xl:pr-3">
            <h4 class="text-[12px] xl:text-[14px] font-normal text-[#222] mb-1">${t('mfr.list.rankingsAndReviews')}</h4>
            <div class="mb-4 xl:mb-6 text-[12px] xl:text-[14px]">
              <strong class="text-[#222]">${ratingText}</strong><span class="text-[#222]">/5</span>
              <span class="text-gray-500 ml-1">(${reviewCount})</span>
            </div>
            <h4 class="text-[12px] xl:text-[14px] font-normal text-[#222] mb-2">Mağaza Bilgisi</h4>
            <ul class="space-y-0.5">
              <li class="text-[12px] xl:text-[14px] leading-[20px] xl:leading-[25px] text-[#555] truncate">· Sağlık: %${healthScore.toFixed(0)}</li>
              ${seller.city ? `<li class="text-[12px] xl:text-[14px] leading-[20px] xl:leading-[25px] text-[#555] truncate">· ${seller.city}</li>` : ''}
              <li class="text-[11px] xl:text-[13px] leading-[18px] xl:leading-[22px] text-[#777] line-clamp-3 mt-1">${description}</li>
            </ul>
          </div>

          <!-- Orta: Ürün Görselleri -->
          <div class="flex gap-2 xl:gap-3 flex-1 min-w-0">
            ${factoryImages.slice(0, 4).map((img, i) => `
              <a href="${storefront}" class="flex flex-col group flex-1 min-w-0">
                <div class="w-full aspect-[1/1] rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  <img src="${img}" alt="Ürün ${i + 1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              </a>
            `).join('')}
          </div>

          <!-- Sağ: Ürün Slider -->
          <div class="factory-slider w-[220px] xl:w-[320px] h-[165px] xl:h-[240px] shrink-0 relative lg:ml-2 xl:ml-2" data-slider-root="${idx}">
            <div class="swiper factory-swiper-${idx} w-full h-full overflow-hidden">
              <div class="swiper-wrapper">
                ${factoryImages.map((img, i) => `
                  <div class="swiper-slide">
                    <img src="${img}" alt="Ürün ${i + 1}" class="w-full h-full object-cover cursor-pointer" data-slider-img="${idx}" />
                  </div>
                `).join('')}
              </div>
            </div>
            <button type="button" class="factory-prev-${idx} absolute left-0 top-1/2 -translate-y-1/2 w-[24px] h-[48px] xl:w-[28px] xl:h-[56px] bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors duration-100 z-10" aria-label="Önceki">
              <svg class="w-[20px] h-[20px] xl:w-[24px] xl:h-[24px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button type="button" class="factory-next-${idx} absolute right-0 top-1/2 -translate-y-1/2 w-[24px] h-[48px] xl:w-[28px] xl:h-[56px] bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors duration-100 z-10" aria-label="Sonraki">
              <svg class="w-[20px] h-[20px] xl:w-[24px] xl:h-[24px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <span class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] xl:text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10 pointer-events-none">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span class="factory-counter-${idx}">1/${totalImages}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Mobile Layout -->
      <div class="lg:hidden flex flex-col gap-2">
        <div class="flex items-center gap-2 mb-1.5">
          <img src="${logo}" alt="${seller.seller_name}" class="w-[28px] h-[28px] rounded-sm shrink-0 border border-gray-100 object-cover" />
          <h3 class="text-[14px] font-bold text-[#222] truncate">${seller.seller_name}</h3>
          <span class="text-[12px] text-gray-400 shrink-0 ml-auto">${city}</span>
        </div>
        <div class="text-[11px] text-[#222] mb-1.5 truncate flex items-center">
          <span class="font-bold">Puan: ${scoreGrade}</span>
          <span class="mx-1.5 text-gray-300">|</span>
          <span>Sağlık: %${healthScore.toFixed(0)}</span>
        </div>
        <div class="flex gap-1.5 mb-2.5 flex-wrap">
          <span class="bg-[#f5f5f5] text-[#222] text-[11px] px-2 py-0.5 rounded-sm font-medium">${seller.seller_type === 'Corporate' ? 'Kurumsal' : 'Bireysel'}</span>
          ${city ? `<span class="bg-[#f5f5f5] text-[#222] text-[11px] px-2 py-0.5 rounded-sm font-medium">${city}</span>` : ''}
        </div>
        <div class="grid grid-cols-4 gap-1.5 w-full">
          ${factoryImages.slice(0, 4).map(img => `
            <div class="relative aspect-[1/1.05] w-full bg-gray-50 overflow-hidden rounded-[4px]">
              <img src="${img}" class="w-full h-full object-cover" />
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Boş durum
function renderEmpty(): string {
  return `
    <div class="bg-white rounded-lg p-12 mb-5 text-center">
      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <p class="text-gray-500 text-[15px]">Henüz aktif satıcı bulunmuyor.</p>
    </div>
  `;
}

// İlk render: loading state + lightbox modal container
export function ManufacturerList(): string {
  const lightboxModal = `
    <div id="factory-lightbox" class="fixed inset-0 bg-white z-[9999] hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <span id="factory-lightbox-title" class="text-[15px] text-[#222]"></span>
        <button id="factory-lightbox-close" type="button" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div id="factory-lightbox-body" class="overflow-y-auto p-6" style="height:calc(100vh - 65px)"></div>
    </div>
  `;

  return `
    <div class="flex flex-col">
      <div id="manufacturer-list-container">
        ${renderSkeleton()}
      </div>
    </div>
    ${lightboxModal}
  `;
}

// Sliderları başlat
function initSliders(): void {
  document.querySelectorAll<HTMLDivElement>('[data-slider-root]').forEach(root => {
    const cardIndex = root.dataset.sliderRoot!;
    const swiperEl = root.querySelector<HTMLElement>(`.factory-swiper-${cardIndex}`);
    if (!swiperEl) return;

    const prevBtn = root.querySelector<HTMLButtonElement>(`.factory-prev-${cardIndex}`);
    const nextBtn = root.querySelector<HTMLButtonElement>(`.factory-next-${cardIndex}`);
    const counterEl = root.querySelector<HTMLSpanElement>(`.factory-counter-${cardIndex}`);
    const total = swiperEl.querySelectorAll('.swiper-slide').length;

    const stopPeek = () => root.classList.remove('factory-peek-prev', 'factory-peek-next');

    prevBtn?.addEventListener('mouseenter', () => { root.classList.remove('factory-peek-next'); root.classList.add('factory-peek-prev'); });
    prevBtn?.addEventListener('mouseleave', stopPeek);
    prevBtn?.addEventListener('click', stopPeek);
    nextBtn?.addEventListener('mouseenter', () => { root.classList.remove('factory-peek-prev'); root.classList.add('factory-peek-next'); });
    nextBtn?.addEventListener('mouseleave', stopPeek);
    nextBtn?.addEventListener('click', stopPeek);
    root.addEventListener('mouseleave', stopPeek);

    const swiper = new Swiper(swiperEl, {
      modules: [Navigation],
      slidesPerView: 1,
      loop: true,
      speed: 650,
      navigation: { prevEl: prevBtn, nextEl: nextBtn },
    });

    swiper.on('slideChange', () => {
      if (counterEl) counterEl.textContent = `${swiper.realIndex + 1}/${total}`;
    });
    swiper.on('slideChangeTransitionStart', stopPeek);
  });
}

// Lightbox
function initLightbox(): void {
  const lightbox = document.getElementById('factory-lightbox');
  const lightboxTitle = document.getElementById('factory-lightbox-title');
  const lightboxBody = document.getElementById('factory-lightbox-body');
  const lightboxClose = document.getElementById('factory-lightbox-close');

  function openLightbox(name: string, images: string[]) {
    if (!lightbox || !lightboxTitle || !lightboxBody) return;
    lightboxTitle.textContent = name;
    lightboxBody.innerHTML = images.map(img => `
      <div class="flex justify-center mb-4">
        <img src="${img}" alt="Fabrika" class="max-w-[800px] w-full object-contain" />
      </div>
    `).join('');
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && !lightbox.classList.contains('hidden')) closeLightbox();
  });

  document.querySelectorAll<HTMLImageElement>('[data-slider-img]').forEach(img => {
    img.addEventListener('click', () => {
      const cardIdx = img.dataset.sliderImg!;
      const card = document.querySelector<HTMLDivElement>(`[data-factory-card="${cardIdx}"]`);
      if (!card) return;
      const name = card.dataset.factoryName || '';
      const images: string[] = JSON.parse(card.dataset.factoryImages || '[]');
      openLightbox(name, images);
    });
  });
}

// Ana init fonksiyonu — API'den çekip render eder
export async function initFactorySliders(): Promise<void> {
  const container = document.getElementById('manufacturer-list-container');
  if (!container) return;

  try {
    const sellers = await fetchSellers();
    if (sellers.length === 0) {
      container.innerHTML = renderEmpty();
      return;
    }
    container.innerHTML = sellers.map((s, i) => renderSellerCard(s, i)).join('');
  } catch {
    container.innerHTML = renderEmpty();
  }

  initSliders();
  initLightbox();
}
