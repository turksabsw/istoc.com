import Alpine from 'alpinejs'
import { callMethod } from '../utils/api'

Alpine.data('remittanceComponent', () => ({
  step: 'upload' as 'upload' | 'form' | 'submitting' | 'success',
  dragging: false,

  // File state
  file: null as File | null,
  fileName: '',
  fileSize: '',
  filePreviewUrl: '' as string,
  fileType: '' as string,

  // Form data
  form: {
    beneficiaryAccount: '',
    remittanceDate: '',
    currency: 'USD',
    amount: '',
    bankName: '',
    senderName: '',
  },

  // Validation
  errors: {} as Record<string, string>,
  submitted: false,
  apiError: '',

  // Computed
  get isFormValid(): boolean {
    const f = this.form;
    return !!(f.beneficiaryAccount && f.remittanceDate && f.currency && f.amount && f.bankName && f.senderName);
  },

  get hasFile(): boolean {
    return this.file !== null;
  },

  // File handling
  handleFiles(files: FileList) {
    if (!files.length) return;
    const file = files[0];
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (!allowed.includes(file.type)) {
      this.errors = { file: 'Desteklenmeyen dosya formatı' };
      return;
    }
    if (file.size > maxSize) {
      this.errors = { file: 'Dosya boyutu 20MB\'ı aşıyor' };
      return;
    }

    this.file = file;
    this.fileName = file.name;
    this.fileSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    this.fileType = file.type;
    this.errors = {};

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => { this.filePreviewUrl = e.target?.result as string; };
      reader.readAsDataURL(file);
    } else {
      this.filePreviewUrl = '';
    }
  },

  removeFile() {
    this.file = null;
    this.fileName = '';
    this.fileSize = '';
    this.filePreviewUrl = '';
    this.fileType = '';
    this.step = 'upload';
  },

  goToForm() {
    if (!this.file) return;
    this.step = 'form';
  },

  // Validation
  validateField(field: string) {
    const val = (this.form as any)[field];
    if (!val || !String(val).trim()) {
      this.errors[field] = 'required';
    } else {
      delete this.errors[field];
    }
  },

  validateAll(): boolean {
    this.errors = {};
    const required = ['beneficiaryAccount', 'remittanceDate', 'currency', 'amount', 'bankName', 'senderName'];
    required.forEach(f => this.validateField(f));
    return Object.keys(this.errors).length === 0;
  },

  // Submit — API integration
  async submitRemittance() {
    this.submitted = true;
    this.apiError = '';
    if (!this.validateAll()) return;

    this.step = 'submitting';

    try {
      // Find the order number from the page context (ordersListComponent)
      // Use the first unpaid order or pass empty to let backend find it
      let orderNumber = '';
      try {
        const ordersEl = document.querySelector('[x-data*="ordersListComponent"]') as any;
        const alpineData = ordersEl?._x_dataStack?.[0];
        if (alpineData?.orders?.length) {
          const unpaid = alpineData.orders.find((o: any) => o.status === 'Waiting for payment');
          orderNumber = unpaid?.orderNumber || alpineData.orders[0]?.orderNumber || '';
        }
      } catch { /* silent */ }

      await callMethod<{ success: boolean }>(
        'tradehub_core.api.order.submit_remittance',
        {
          order_number: orderNumber,
          beneficiary_account: this.form.beneficiaryAccount,
          remittance_date: this.form.remittanceDate,
          currency: this.form.currency,
          amount: this.form.amount,
          bank_name: this.form.bankName,
          sender_name: this.form.senderName,
        },
        true,
      );

      this.step = 'success';
    } catch (err: any) {
      this.apiError = err?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      this.step = 'form';
    }
  },

  // Reset everything
  reset() {
    this.step = 'upload';
    this.file = null;
    this.fileName = '';
    this.fileSize = '';
    this.filePreviewUrl = '';
    this.fileType = '';
    this.form = { beneficiaryAccount: '', remittanceDate: '', currency: 'USD', amount: '', bankName: '', senderName: '' };
    this.errors = {};
    this.submitted = false;
    this.dragging = false;
    this.apiError = '';

    // Close modal
    const modal = document.getElementById('remittance-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    document.body.style.overflow = '';
  },

  clearForm() {
    this.form = { beneficiaryAccount: '', remittanceDate: '', currency: 'USD', amount: '', bankName: '', senderName: '' };
    this.errors = {};
  },
}));
