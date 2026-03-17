/**
 * Seller Storefront — Page Orchestrator
 * Fetches real seller data from API, renders into #app
 */
import '../style.css';
import '../styles/seller/seller-storefront.css';
import { initFlowbite } from 'flowbite';
import 'swiper/swiper-bundle.css';
import { startAlpine } from '../alpine';
import { t } from '../i18n';

// Components
import { TopBar } from '../components/header';
import { initLanguageSelector } from '../components/header/TopBar';
import { StoreHeader, StoreNav } from '../components/seller';
import { CompanyProfileComponent } from '../components/seller/CompanyProfile';

// Interactions
import { initSellerStorefront } from '../utils/seller/interactions';

// Stats still partially mock; reviews now from API
import { getSellerStats } from '../data/seller/mockData';

const API = (import.meta.env.VITE_API_URL ?? '') as string;

// Renk paleti for category cards
const CAT_COLORS = ['#d4e157','#90caf9','#bdbdbd','#80deea','#a5d6a7','#ffcc80','#f48fb1','#ce93d8','#ffab91'];
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&h=600&q=80';

async function main() {
  const appEl = document.querySelector<HTMLDivElement>('#app')!;

  // Show topbar immediately + loading
  appEl.innerHTML = `
    ${TopBar()}
    <div class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-3 text-gray-400">
        <svg class="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span class="text-sm">Yükleniyor...</span>
      </div>
    </div>
  `;
  initLanguageSelector();

  // Extract seller_code from URL  (?seller=SLR-XXXX)
  const params = new URLSearchParams(window.location.search);
  const sellerCode = params.get('seller');

  if (!sellerCode) {
    appEl.innerHTML += `<p class="text-center text-red-500 mt-20">Satıcı kodu bulunamadı.</p>`;
    return;
  }

  let d: any;
  try {
    const res = await fetch(`${API}/method/tradehub_core.api.seller.get_public_profile?seller_code=${encodeURIComponent(sellerCode)}`);
    const json = await res.json();
    d = json.message;
  } catch {
    appEl.innerHTML += `<p class="text-center text-red-500 mt-20">Bağlantı hatası.</p>`;
    return;
  }

  if (!d) {
    appEl.innerHTML += `<p class="text-center text-red-500 mt-20">Mağaza bulunamadı.</p>`;
    return;
  }

  // ─── Map: SellerProfile ──────────────────────────────────────
  const categories: any[] = d.categories || [];
  const products: any[] = d.products || [];

  const sellerProfile = {
    name: d.seller_name || '',
    slug: d.seller_code || '',
    logo: d.logo || '/assets/placeholder-logo.png',
    verificationType: 'Verified' as 'Verified' | 'Verified PRO',
    verificationBadgeType: 'standard' as const,
    yearsOnPlatform: d.founded_year ? (new Date().getFullYear() - Number(d.founded_year)) : 0,
    location: [d.city, d.country].filter(Boolean).join(', '),
    mainCategories: categories.slice(0, 3).map((c: any) => c.category_name),
    email: d.email || '',
    phone: d.phone || '',
    website: d.website || '',
    city: d.city || '',
    district: d.district || '',
    address: [d.address_line1, d.address_line2].filter(Boolean).join(', '),
    company_name: d.company_name || '',
    description: d.description || '',
    business_type: d.business_type || '',
    main_markets: d.main_markets || '',
    staff_count: d.staff_count || 0,
    annual_revenue: d.annual_revenue || '',
    founded_year: d.founded_year ? Number(d.founded_year) : 0,
    deliveryBadge: t('sellerMock.deliveryBadge'),
    assessmentBadge: t('sellerMock.assessmentBadge'),
    verificationDate: '',
    hasCategoryGrid: categories.length > 0,
    hasCategoryListing: categories.length > 0,
  };

  // ─── Map: StoreNavData ───────────────────────────────────────
  const navData = {
    items: [
      { label: t('sellerMock.navHome'), href: '#overview', isActive: true },
      { label: t('sellerMock.navProducts'), href: '#products', isActive: false, dropdownType: 'products' as const },
      { label: t('sellerMock.navCompanyProfile'), href: '#company', isActive: false, dropdownType: 'company' as const },
      { label: t('sellerMock.navContact'), href: '#contact', isActive: false },
    ],
    productCategories: categories.map((c: any) => ({
      name: c.category_name,
      slug: c.name,
      hasSubcategories: false,
    })),
    companyProfileLinks: [
      { label: t('sellerMock.cpOverview'), href: '#company' },
      { label: t('sellerMock.cpReviews'), href: '#reviews' },
    ],
    searchPlaceholder: t('sellerMock.searchPlaceholder'),
  };

  // ─── Map: CategoryCard[] (Kategoriler tab) ───────────────────
  const categoryCards = categories.map((c: any, i: number) => ({
    id: c.name,
    name: c.category_name,
    bgColor: CAT_COLORS[i % CAT_COLORS.length],
    image: c.image || PLACEHOLDER_IMG,
  }));

  // ─── Map: SimpleProduct[] (Ana Ürünler) ──────────────────────
  const mappedProducts = products.map((p: any) => ({
    id: p.name,
    name: p.product_name,
    image: p.image || PLACEHOLDER_IMG,
    priceMin: p.price_min || 0,
    priceMax: p.price_max || 0,
    moq: p.moq || 1,
    moqUnit: p.moq_unit || 'Adet',
    badges: p.is_featured ? [{ type: 'main-product', label: t('sellerMock.badgeMainProduct') }] : [],
    soldCount: 0,
    link: '/pages/product-detail.html',
  }));

  // ─── Map: ProductCategory[] (Ürünler tab — grouped by category) ─
  const catNameMap = new Map<string, string>(
    categories.map((c: any) => [c.name as string, c.category_name as string])
  );
  const groupMap: Map<string, any[]> = new Map();
  for (const p of mappedProducts) {
    const catKey = (products.find((x: any) => x.name === p.id)?.category) || null;
    const catLabel = (catKey && catNameMap.get(catKey)) || 'Diğer';
    if (!groupMap.has(catLabel)) groupMap.set(catLabel, []);
    groupMap.get(catLabel)!.push(p);
  }
  const categoryListings = Array.from(groupMap.entries()).map(([name, prods]) => ({
    id: name,
    name,
    bannerImage: '',
    products: prods,
  }));

  // ─── Map: CompanyInfoCell[] ──────────────────────────────────
  const companyInfoCells = [
    d.city        && { icon: 'globe',    label: 'Şehir',     value: d.city,            verified: true },
    d.founded_year && { icon: 'calendar', label: 'Kuruluş',  value: String(d.founded_year), verified: true },
    d.business_type && { icon: 'factory', label: 'İş Türü',  value: d.business_type,   verified: true },
    d.main_markets && { icon: 'map',      label: 'Pazarlar', value: d.main_markets,    verified: true },
    d.annual_revenue && { icon: 'chart',  label: 'Ciro',     value: d.annual_revenue,  verified: true },
    d.staff_count  && { icon: 'users',    label: 'Çalışan',  value: String(d.staff_count), verified: true },
  ].filter(Boolean) as any[];

  // ─── Assemble SellerStorefrontData ───────────────────────────
  const sellerData = {
    seller: sellerProfile,
    navData,
    heroBanner: { slides: [], autoplayDelay: 5000, showPagination: false },
    categoryCards,
    hotProducts: mappedProducts.slice(0, 9),
    categoryListings,
    company: {
      heroImage: d.banner_image || '',
      heroTitle: d.seller_name || '',
      heroSubtitle: d.description || '',
      description: d.description || '',
      descriptionExtended: '',
      factoryPhotos: [],
      carouselPhotos: [],
      locations: [],
    },
    certificates: [],
    advantages: [],
    features: [],
    companyInfoCells,
    companyPhotos: [],
    galleryPhotos: [],
    contactForm: {
      title: t('sellerMock.contactTitle'),
      recipient: { name: d.seller_name, title: '', department: '' },
      placeholder: t('sellerMock.contactPlaceholder'),
      maxLength: 8000,
      businessCardDefault: true,
    },
    floatingActions: { buttons: [], topPosition: '40%' },
  };

  // Fetch reviews from API
  let reviewData: any = { reviews: [], total: 0, avg_rating: 0 };
  try {
    const rRes = await fetch(`${API}/method/tradehub_core.api.seller.get_reviews?seller_code=${encodeURIComponent(sellerCode)}&page_size=20`);
    const rJson = await rRes.json();
    if (rJson.message) reviewData = rJson.message;
  } catch { /* reviews remain empty */ }

  const reviews = (reviewData.reviews || []).map((r: any) => ({
    id: String(r.name),
    reviewerName: r.reviewer_name,
    country: r.country || '',
    countryFlag: r.country_flag || '',
    date: r.date ? new Date(r.date).toLocaleString('tr-TR') : '',
    comment: r.comment || '',
    productName: r.product_name || '',
    productImage: r.product_image || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=100&h=100&fit=crop',
    productPrice: r.product_price || '',
  }));

  const mockStats = getSellerStats();
  const apiAvg = reviewData.avg_rating || 0;
  const stats = {
    ...mockStats,
    rating: apiAvg > 0 ? apiAvg : (d.rating > 0 ? d.rating : mockStats.rating),
    reviewCount: reviewData.total > 0 ? reviewData.total : mockStats.reviewCount,
    transactions: d.total_orders > 0 ? d.total_orders : mockStats.transactions,
    supplierServiceScore: d.health_score > 0 ? +(d.health_score / 20).toFixed(1) : mockStats.supplierServiceScore,
    onTimeShipmentScore: d.health_score > 0 ? +(d.health_score / 20).toFixed(1) : mockStats.onTimeShipmentScore,
    productQualityScore: d.health_score > 0 ? +(d.health_score / 20).toFixed(1) : mockStats.productQualityScore,
  };

  // ─── Render ──────────────────────────────────────────────────
  appEl.innerHTML = `
    ${TopBar()}
    <main class="seller-storefront flex flex-col min-h-screen" data-seller-slug="${sellerProfile.slug}" x-data="sellerStorefront">
      ${StoreHeader(sellerProfile)}
      ${StoreNav(navData)}
      ${CompanyProfileComponent(sellerData as any, stats, reviews)}
    </main>
  `;

  initFlowbite();
  initLanguageSelector();
  initSellerStorefront();
  startAlpine();
}

main();
