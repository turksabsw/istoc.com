import Alpine from 'alpinejs'
import { t } from '../i18n'
import { callMethod } from '../utils/api'
import { orderStore } from '../components/orders/state/OrderStore'
import { getOrderTabs, getOrderFilters } from '../components/buyer-dashboard/ordersData'
import { apiGetOrders } from '../services/cartService'
import type { Order, OrderStatus, OrderStatusColor } from '../types/order'

const BACKEND_STATUS_MAP: Record<string, { status: OrderStatus; color: OrderStatusColor; desc: string }> = {
  'Ödeme Bekleniyor': { status: 'Waiting for payment', color: 'text-amber-600', desc: 'Please complete your payment.' },
  'Onaylanıyor':      { status: 'Confirming',          color: 'text-blue-600',  desc: 'Your order is being confirmed.' },
  'Kargoda':          { status: 'Delivering',           color: 'text-green-600', desc: 'Your order is on its way.' },
  'Tamamlandı':       { status: 'Completed',            color: 'text-gray-500',  desc: 'Order completed.' },
  'İptal Edildi':     { status: 'Cancelled',            color: 'text-red-600',   desc: 'Order cancelled.' },
};

export const ORDER_STATUS_MAP: Record<string, string[]> = {
  all: [],
  unpaid: ['Waiting for payment'],
  confirming: ['Confirming'],
  preparing: ['Confirming'],
  delivering: ['Delivering'],
  'refunds-aftersales': ['Cancelled'],
  'completed-review': ['Completed'],
  completed: ['Completed'],
  cancelled: ['Cancelled'],
  closed: ['Cancelled'],
};

Alpine.data('ordersListComponent', () => ({
  activeTab: 'all',
  searchQuery: '',
  dateFilter: 'all',
  dateFrom: '',
  dateTo: '',
  dateOpen: false,
  timeOpen: false,
  selectedOrder: null,
  copiedNumber: false,
  orders: [] as any[],
  loading: true,
  error: '',

  async init() {
    orderStore.load();
    this.orders = orderStore.getOrders();
    orderStore.subscribe(() => {
      this.orders = orderStore.getOrders();
      this.loading = orderStore.isLoading();
    });

    // Backend'den gerçek siparişleri çek ve localStorage ile birleştir
    try {
      const { orders: backendOrders } = await apiGetOrders(1);
      if (backendOrders && backendOrders.length > 0) {
        const existingNumbers = new Set(orderStore.getOrders().map((o) => o.orderNumber));
        const newOrders: Order[] = backendOrders
          .filter((o) => !existingNumbers.has(o.order_number))
          .map((o) => {
            const mapped = BACKEND_STATUS_MAP[o.status] ?? {
              status: 'Waiting for payment' as OrderStatus,
              color: 'text-amber-600' as OrderStatusColor,
              desc: o.status,
            };
            const dateStr = o.order_date
              ? new Date(o.order_date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' })
              : '';
            return {
              id: o.id,
              orderNumber: o.order_number,
              orderDate: dateStr,
              total: String(o.total),
              currency: o.currency || 'USD',
              seller: o.seller_name || o.seller || '',
              status: mapped.status,
              statusColor: mapped.color,
              statusDescription: mapped.desc,
              products: o.products.map((p) => ({
                name: p.name,
                variation: p.variation || '',
                unitPrice: p.unit_price,
                quantity: p.quantity,
                totalPrice: p.total_price,
                image: p.image || '',
              })),
              shipping: {
                trackingStatus: 'Pending',
                address: '',
                shipFrom: '',
                method: '',
                incoterms: '',
              },
              payment: {
                status: mapped.status === 'Waiting for payment' ? 'Unpaid' : 'Paid',
                hasRecord: false,
                subtotal: String(o.subtotal),
                shippingFee: String(o.shipping_fee),
                grandTotal: String(o.total),
              },
              supplier: {
                name: o.seller_name || '',
                contact: '',
                phone: '',
                email: '',
              },
              paymentMethod: o.payment_method || 'bank_transfer',
              createdAt: o.order_date ? new Date(o.order_date).getTime() : Date.now(),
            } satisfies Order;
          });

        if (newOrders.length > 0) {
          orderStore.addOrders(newOrders);
        }

        // Backend'deki mevcut siparişlerin durumunu güncelle
        backendOrders
          .filter((o) => existingNumbers.has(o.order_number))
          .forEach((o) => {
            const mapped = BACKEND_STATUS_MAP[o.status];
            if (mapped) {
              orderStore.updateOrderStatus(o.order_number, mapped.status, mapped.color, mapped.desc);
            }
          });
      }
    } catch {
      // Backend erişilemiyorsa localStorage siparişlerini göstermeye devam et
    }
  },

  get filteredOrders() {
    return this.orders.filter((o: any) => {
      // Status filter
      const allowedStatuses = ORDER_STATUS_MAP[this.activeTab];
      const matchStatus = !allowedStatuses || allowedStatuses.length === 0 || allowedStatuses.includes(o.status);

      // Search filter
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || o.orderNumber.toLowerCase().includes(q) || o.seller.toLowerCase().includes(q) || o.products.some((p: any) => p.name.toLowerCase().includes(q));

      // Date filter
      let matchDate = true;
      if (this.dateFilter !== 'all' && o.createdAt) {
        const orderTime = o.createdAt;
        const now = Date.now();
        if (this.dateFilter === '7d') {
          matchDate = now - orderTime <= 7 * 24 * 60 * 60 * 1000;
        } else if (this.dateFilter === '30d') {
          matchDate = now - orderTime <= 30 * 24 * 60 * 60 * 1000;
        } else if (this.dateFilter === '90d') {
          matchDate = now - orderTime <= 90 * 24 * 60 * 60 * 1000;
        } else if (this.dateFilter === 'custom') {
          if (this.dateFrom) matchDate = orderTime >= new Date(this.dateFrom).getTime();
          if (this.dateTo && matchDate) matchDate = orderTime <= new Date(this.dateTo).getTime() + 24 * 60 * 60 * 1000;
        }
      }

      return matchStatus && matchSearch && matchDate;
    });
  },

  tabCount(tabId: string) {
    const allowedStatuses = ORDER_STATUS_MAP[tabId];
    if (!allowedStatuses || allowedStatuses.length === 0) return this.orders.length;
    return this.orders.filter((o: any) => allowedStatuses.includes(o.status)).length;
  },

  viewDetail(order: any) {
    this.selectedOrder = order;
    window.scrollTo({ top: 0 });
  },

  backToList() {
    this.selectedOrder = null;
    this.copiedNumber = false;
  },

  get dateFilterLabel() {
    if (this.dateFilter === 'custom') return t('orders.customDate');
    if (this.dateFilter === '7d') return t('orders.last7Days');
    if (this.dateFilter === '30d') return t('orders.last30Days');
    if (this.dateFilter === '90d') return t('orders.last90Days');
    return t('orders.orderDate');
  },

  setDateFilter(val: string) {
    this.dateFilter = val;
    if (val !== 'custom') {
      this.dateFrom = '';
      this.dateTo = '';
    }
  },

  clearTimeRange() {
    this.dateFrom = '';
    this.dateTo = '';
    this.dateFilter = 'all';
    this.timeOpen = false;
  },

  applyTimeRange() {
    if (this.dateFrom || this.dateTo) {
      this.dateFilter = 'custom';
      this.timeOpen = false;
    }
  },

  copyOrderNumber() {
    if (!this.selectedOrder) return;
    navigator.clipboard.writeText((this.selectedOrder as any).orderNumber);
    this.copiedNumber = true;
    setTimeout(() => { this.copiedNumber = false; }, 2000);
  },

  // Modal states
  showOperationHistory: false,
  showPaymentHistory: false,
  showTrackPackage: false,
  showModifyShipping: false,
  showAddServices: false,
  showCancelOrder: false,
  paymentHistoryTab: 'records',
  cancelReason: '',
  cancellingOrder: null as any,

  // Payment history data (API-driven)
  paymentRecords: [] as any[],
  refundRecords: [] as any[],
  wireRecords: [] as any[],
  paymentLoading: false,

  openModal(name: string) {
    (this as any)[name] = true;
    document.body.style.overflow = 'hidden';

    // Ödeme geçmişi modal'ı açılırken API'den veri çek
    if (name === 'showPaymentHistory' && this.selectedOrder) {
      this.fetchPaymentRecords((this.selectedOrder as any).orderNumber);
    }
  },

  async fetchPaymentRecords(orderNumber: string) {
    this.paymentLoading = true;
    this.paymentRecords = [];
    this.refundRecords = [];
    this.wireRecords = [];

    try {
      const result = await callMethod<{
        success: boolean;
        payments: any[];
        refunds: any[];
        wire_transfers: any[];
      }>(
        'tradehub_core.api.order.get_payment_records',
        { order_number: orderNumber },
      );

      if (result?.success) {
        this.paymentRecords = result.payments || [];
        this.refundRecords = result.refunds || [];
        this.wireRecords = result.wire_transfers || [];
      }
    } catch (err) {
      console.warn('[Orders] Payment records fetch failed:', err);
    } finally {
      this.paymentLoading = false;
    }
  },

  closeModal(name: string) {
    (this as any)[name] = false;
    document.body.style.overflow = '';
  },

  async confirmCancelOrder() {
    const order = (this.cancellingOrder || this.selectedOrder) as any;
    if (!order || !this.cancelReason) return;

    await orderStore.cancelOrder(order.orderNumber, this.cancelReason);

    this.cancelReason = '';
    this.cancellingOrder = null;
    this.closeModal('showCancelOrder');
    if (this.selectedOrder && (this.selectedOrder as any).orderNumber === order.orderNumber) {
      this.selectedOrder = null;
    }
  },

  getStepIndex(order: any) {
    if (!order) return -1;
    if (order.status === 'Cancelled') return -2;
    if (order.status === 'Waiting for payment') return 0;
    if (order.status === 'Confirming') return 1;
    if (order.status === 'Preparing Shipment') return 2;
    if (order.status === 'Delivering') return 3;
    if (order.status === 'Completed') return 4;
    return 0;
  },

  isCancelled(order: any) {
    return order?.status === 'Cancelled';
  },

  isActionable(order: any) {
    return order && order.status !== 'Cancelled' && order.status !== 'Completed';
  },

  canPay(order: any) {
    return order && (order.status === 'Waiting for payment');
  },

  canCancel(order: any) {
    return order && order.status !== 'Cancelled' && order.status !== 'Completed' && order.status !== 'Delivering';
  }
}));

Alpine.data('ordersSection', () => ({
  activeTabId: getOrderTabs()[0].id,
  selectedFilterId: getOrderFilters()[0].id as string | null,
  dropdownOpen: false,

  selectTab(tabId: string, hasDropdown: boolean) {
    if (hasDropdown) {
      if (this.activeTabId === tabId) {
        this.dropdownOpen = !this.dropdownOpen;
        return;
      }
      this.activeTabId = tabId;
      this.dropdownOpen = true;
    } else {
      this.activeTabId = tabId;
      this.dropdownOpen = false;
    }
  },

  selectFilter(filterId: string) {
    this.selectedFilterId = filterId;
    this.dropdownOpen = false;
  },
}));
