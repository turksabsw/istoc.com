# Frappe Framework — Geliştirme Rehberi

_Tarih: 2026-03-16_
_Kaynak: Mevcut frappe-bench kurulumu (Frappe v15.102.1, ERPNext v15.101.0) incelenerek oluşturulmuştur._

---

## 1. Kurulu App'ler

```
apps/
  frappe/     # Frappe Framework v15.102.1
  erpnext/    # ERPNext v15.101.0
```

İki app kurulu: **frappe** (framework çekirdeği) ve **erpnext** (ERP uygulaması).

### Frappe Klasör Yapısı (2 seviye)

| Dizin | Alt Dizinler |
|-------|-------------|
| `api/` | — |
| `automation/` | `doctype/`, `workspace/` |
| `commands/` | — |
| `config/` | — |
| `contacts/` | `doctype/`, `report/` |
| `core/` | `api/`, `doctype/`, `form_tour/`, `page/`, `report/`, `web_form/`, `workspace/` |
| `custom/` | `doctype/`, `fixtures/`, `form_tour/`, `module_onboarding/`, `report/` |
| `data/` | — |
| `database/` | `mariadb/`, `postgres/` |
| `desk/` | `doctype/`, `form/`, `page/`, `report/` |
| `email/` | `assets/`, `doctype/`, `page/` |
| `geo/` | `doctype/`, `report/` |
| `integrations/` | `doctype/`, `frappe_providers/`, `workspace/` |
| `model/` | `utils/` |
| `patches/` | `v10_0/`...`v16_0/` |
| `printing/` | `doctype/`, `form_tour/`, `page/`, `print_style/` |
| `public/` | `css/`, `html/`, `icons/`, `images/`, `js/`, `scss/`, `sounds/` |
| `templates/` | `discussions/`, `emails/`, `includes/`, `pages/`, `print_format/`, `styles/` |
| `utils/` | `telemetry/` |
| `website/` | `css/`, `doctype/`, `js/`, `page_renderers/`, `report/`, `web_form/`, `workspace/` |
| `workflow/` | `doctype/`, `page/` |
| `www/` | `_test/` |

### ERPNext Klasör Yapısı (1 seviye)

`accounts`, `assets`, `bulk_transaction`, `buying`, `commands`, `communication`, `config`, `controllers`, `crm`, `domains`, `edi`, `erpnext_integrations`, `maintenance`, `manufacturing`, `patches`, `portal`, `projects`, `public`, `quality_management`, `regional`, `selling`, `setup`, `shopping_cart`, `startup`, `stock`, `subcontracting`, `support`, `telephony`, `templates`, `tests`, `translations`, `utilities`

---

## 2. Yeni App Oluşturma

### Komut

```bash
# Docker ortamında:
docker compose exec backend bench new-app tradehub_core

# İnteraktif sorular:
# - App Title (varsayılan: Tradehub Core)
# - App Description
# - App Publisher
# - App Email
# - App License (agpl-3.0, gpl-3.0, mit, custom)
# - Create GitHub Workflow (yes/no)

# Site'a yükleme:
docker compose exec backend bench --site tradehub.localhost install-app tradehub_core

# Asset build ve migration:
docker compose exec backend bench build
docker compose exec backend bench migrate
```

### Oluşan Dosya Yapısı

```
tradehub_core/
├── tradehub_core/
│   ├── __init__.py              # __version__ = "0.0.1"
│   ├── hooks.py                 # Hook tanımları
│   ├── modules.txt              # Modül listesi
│   ├── patches.txt              # Patch tanımları
│   ├── tradehub_core/           # İlk modül dizini
│   │   └── __init__.py
│   ├── config/
│   │   └── __init__.py
│   ├── patches/
│   │   └── __init__.py
│   ├── templates/
│   │   ├── __init__.py
│   │   ├── pages/
│   │   │   └── __init__.py
│   │   └── includes/
│   ├── www/
│   └── public/
│       ├── .gitkeep
│       ├── css/
│       └── js/
├── pyproject.toml
├── .pre-commit-config.yaml
├── .editorconfig
├── .eslintrc
├── .gitignore
├── license.txt
└── README.md
```

### apps.txt ve installed_apps İlişkisi

- **`sites/apps.txt`** — Bench seviyesi; hangi app'ler bench'te mevcut (frappe, erpnext). `bench new-app` / `bench get-app` buraya ekler.
- **`tabInstalled Application`** — Site seviyesi; veritabanında tutulan tablo. `bench --site <site> install-app <app>` ile eklenir.
- `frappe.get_installed_apps()` veritabanından okur.

---

## 3. App Klasör Yapısı

Minimal bir Frappe app'i için **zorunlu** dosyalar:

```
my_app/
├── my_app/
│   ├── __init__.py      # ZORUNLU: __version__ tanımı
│   ├── hooks.py         # ZORUNLU: app metadata ve hook'lar
│   └── modules.txt      # ZORUNLU: modül listesi
└── pyproject.toml       # ZORUNLU: Python paket tanımı
```

**Opsiyonel** ama yaygın kullanılan:

```
my_app/
├── my_app/
│   ├── patches/         # Veritabanı migration patch'leri
│   ├── patches.txt      # Patch listesi
│   ├── config/          # App konfigürasyonu
│   ├── templates/       # Jinja şablonları (emails/, pages/)
│   ├── www/             # Web sayfaları
│   ├── public/          # Statik dosyalar (css/, js/)
│   └── api/             # API endpoint'leri
└── .github/workflows/   # CI/CD
```

---

## 4. hooks.py Referansı

### App Metadata Alanları

```python
app_name = "tradehub_core"
app_title = "TradeHub Core"
app_publisher = "TradeHub"
app_description = "TradeHub B2B E-Commerce Backend"
app_email = "dev@tradehub.com"
app_license = "MIT"
app_logo_url = "/assets/tradehub_core/logo.png"
```

### Hook Tipleri (Tam Liste)

| Hook | Açıklama |
|------|----------|
| `before_install` / `after_install` | App kurulum sırasında çalışır |
| `before_uninstall` / `after_uninstall` | App kaldırma sırasında çalışır |
| `app_include_js` / `app_include_css` | Desk (backend) header'a JS/CSS ekler |
| `web_include_js` / `web_include_css` | Website header'a JS/CSS ekler |
| `doctype_js` / `doctype_list_js` | DocType form/list JS dosyası |
| `website_route_rules` | URL routing kuralları |
| `website_redirects` | URL yönlendirmeleri |
| `jinja` | Jinja methods/filters ekleme |
| `doc_events` | DocType olayları (on_update, after_insert vb.) |
| `scheduler_events` | Zamanlı görevler |
| `permission_query_conditions` | SQL WHERE koşulu ile izin kontrolü |
| `has_permission` | Python fonksiyonu ile izin kontrolü |
| `override_whitelisted_methods` | Mevcut endpoint'leri override etme |
| `override_doctype_class` | DocType sınıfını override etme |
| `before_request` / `after_request` | HTTP request yaşam döngüsü |
| `before_job` / `after_job` | Background job yaşam döngüsü |
| `on_session_creation` | Oturum oluşturulduğunda |
| `on_login` / `on_logout` | Giriş/çıkış sırasında |
| `extend_bootinfo` | Boot data'ya ek bilgi ekleme |
| `fixtures` | Sabit veri dışa aktarma (Custom Field vb.) |
| `ignore_links_on_delete` | Silme sırasında link kontrolünü atla |

### doc_events Yapısı

```python
# Tüm DocType'lar için (wildcard):
doc_events = {
    "*": {
        "on_update": "tradehub_core.events.on_update",
        "on_cancel": "tradehub_core.events.on_cancel",
        "on_trash": "tradehub_core.events.on_trash",
    },
    # Belirli bir DocType için:
    "User": {
        "after_insert": "tradehub_core.user_events.after_insert",
        "validate": "tradehub_core.user_events.validate",
    },
    # Birden fazla DocType için (tuple key):
    ("Sales Order", "Sales Invoice"): {
        "validate": "tradehub_core.validate_transaction",
    },
}
```

Kullanılabilir event isimleri: `validate`, `before_insert`, `after_insert`, `on_update`, `on_submit`, `on_cancel`, `on_trash`, `after_rename`, `on_update_after_submit`, `on_change`.

### scheduler_events Yapısı

```python
scheduler_events = {
    # Cron ifadesi ile:
    "cron": {
        "0/15 * * * *": [
            "tradehub_core.tasks.sync_products",
        ],
        "0/10 * * * *": [
            "tradehub_core.tasks.process_queue",
        ],
    },
    # Her ~60 saniyede:
    "all": [
        "tradehub_core.tasks.flush_cache",
    ],
    # Saatlik:
    "hourly": [
        "tradehub_core.tasks.send_pending_emails",
    ],
    # Günlük:
    "daily": [
        "tradehub_core.tasks.cleanup_expired_tokens",
    ],
    # Haftalık:
    "weekly": [
        "tradehub_core.tasks.generate_reports",
    ],
    # Aylık:
    "monthly": [
        "tradehub_core.tasks.monthly_summary",
    ],
}
```

Frekanslar: `cron`, `all`, `hourly`, `hourly_long`, `hourly_maintenance`, `daily`, `daily_long`, `daily_maintenance`, `weekly`, `weekly_long`, `monthly`, `monthly_long`.

### website_route_rules Örneği

```python
website_route_rules = [
    {"from_route": "/orders", "to_route": "Sales Order"},
    {
        "from_route": "/orders/<path:name>",
        "to_route": "order",
        "defaults": {
            "doctype": "Sales Order",
            "parents": [{"label": "Orders", "route": "orders"}],
        },
    },
]
```

---

## 5. @frappe.whitelist() Endpoint Yazımı

### Temel Kullanım

```python
# Sadece giriş yapmış kullanıcılar:
@frappe.whitelist()
def get_logged_user():
    return frappe.session.user

# Guest erişimi (giriş yapmadan):
@frappe.whitelist(allow_guest=True)
def get_appointment_settings():
    settings = frappe.get_cached_value(
        "Appointment Booking Settings",
        None,
        ["advance_booking_days", "appointment_duration"],
        as_dict=True,
    )
    return settings

# HTTP metod kısıtlaması:
@frappe.whitelist(allow_guest=True, methods=["POST"])
def update_password(new_password: str, logout_all_sessions: int = 0,
                    key: str | None = None, old_password: str | None = None):
    ...

@frappe.whitelist(allow_guest=True, methods=["GET"])
def login_via_key(key: str):
    ...
```

### Endpoint URL Formatı

Fonksiyonlar `/api/method/` prefix'i ile çağrılır:

```
POST /api/method/tradehub_core.api.auth.register
POST /api/method/tradehub_core.api.auth.login
GET  /api/method/tradehub_core.api.products.get_list
```

### Parametre Alma

Parametreler fonksiyon argümanları olarak alınır. Frappe `frappe.form_dict`'ten otomatik eşleştirir:

```python
# Basit parametreler (POST body veya query string'den):
@frappe.whitelist(allow_guest=True)
def get_appointment_slots(date, timezone):
    ...

# Typed parametreler:
@frappe.whitelist(allow_guest=True)
def login_via_token(login_token: str):
    ...

# Optional parametreler:
@frappe.whitelist(allow_guest=True, methods=["POST"])
def update_password(new_password: str, logout_all_sessions: int = 0,
                    key: str | None = None, old_password: str | None = None):
    ...

# JSON string parametreler (karmaşık veri):
@frappe.whitelist(allow_guest=True)
def create_appointment(date, time, tz, contact):
    contact = json.loads(contact)  # Manuel parse
    ...
```

### Response Formatı

```python
# 1. Doğrudan return — Frappe {"message": <value>} olarak sarar:
return frappe.session.user                   # string
return settings                              # dict
return converted_timeslots                   # list
return appointment                           # Document (JSON'a serialize edilir)

# 2. Manuel response:
frappe.local.response["message"] = "Password Reset"
frappe.local.response["redirect_to"] = redirect_url
frappe.local.response["home_page"] = "/app"

# 3. Web sayfası response (API dışı):
frappe.respond_as_web_page(
    _("Invalid Request"),
    _("Invalid Login Token"),
    http_status_code=417,
)
```

### Hata Fırlatma

```python
# frappe.throw(mesaj, exception_tipi) kullanımı:

# ValidationError (varsayılan, HTTP 417):
frappe.throw(_("Total contribution percentage should be equal to 100"))

# AuthenticationError (HTTP 401):
frappe.throw(_("Login not allowed."), frappe.AuthenticationError)

# DoesNotExistError (HTTP 404):
frappe.throw(_("User not found"), frappe.DoesNotExistError)

# PermissionError (HTTP 403):
frappe.throw(_("Not permitted"), frappe.PermissionError)

# SecurityException:
frappe.throw(_("Account locked"), frappe.SecurityException)

# TooManyRequestsError (HTTP 429):
frappe.throw(_("Too many requests"), frappe.TooManyRequestsError)

# CSRFTokenError:
frappe.throw(_("Invalid Request"), frappe.CSRFTokenError)

# NameError:
frappe.throw(_("Duplicate name"), frappe.NameError)

# InvalidAuthorizationToken:
frappe.throw(_("Invalid token"), frappe.InvalidAuthorizationToken)
```

### HTTP Status Kodu Ayarlama

```python
# 1. frappe.respond_as_web_page ile:
frappe.respond_as_web_page(_("Not Found"), _("Page not found"), http_status_code=404)

# 2. Doğrudan response üzerinde:
frappe.local.response.http_status_code = 410
frappe.local.response["http_status_code"] = 404

# 3. Exception tipi ile otomatik:
# frappe.AuthenticationError → 401
# frappe.PermissionError → 403
# frappe.DoesNotExistError → 404
# frappe.ValidationError → 417
# frappe.TooManyRequestsError → 429
```

---

## 6. frappe.cache() Kullanımı

`frappe.cache` bir `RedisWrapper` instance'ıdır (Redis client'ı genişletir). Eski `frappe.cache()` çağrısı da hâlâ çalışır (geriye uyumluluk).

### Key Format

```python
# Standart key: {db_name}|{key}
# User-scoped key: {db_name}|user:{user}:{key}
# shared=True: key olduğu gibi kullanılır (prefix yok)

def make_key(self, key, user=None, shared=False):
    if shared:
        return key
    if user:
        if user is True:
            user = frappe.session.user
        key = f"user:{user}:{key}"
    return f"{frappe.conf.db_name}|{key}".encode()
```

### set_value / get_value / delete_value

```python
# SET — Değer kaydetme:
frappe.cache.set_value(key, val, user=None, expires_in_sec=None, shared=False)

# Örnek: TTL ile one-time login key:
frappe.cache.set_value(
    f"one_time_login_key:{key}",
    email,
    expires_in_sec=expiry * 60,  # dakika → saniye
)

# GET — Değer okuma:
frappe.cache.get_value(key, generator=None, user=None, expires=False, shared=False)

# Örnek: TTL'li key okuma (expires=True local cache'e kaydetmez):
sid = frappe.cache.get_value(f"login_token:{login_token}", expires=True)

# Örnek: Generator pattern (cache miss durumunda otomatik üretir):
def _get_enabled_users():
    return frappe.get_all("User", filters={"enabled": "1"}, pluck="name")

enabled_users = frappe.cache.get_value("enabled_users", _get_enabled_users)

# DELETE — Değer silme:
frappe.cache.delete_value(keys, user=None, make_keys=True, shared=False)

# Örnek: One-time use pattern:
cache_key = f"one_time_login_key:{key}"
email = frappe.cache.get_value(cache_key)
if email:
    frappe.cache.delete_value(cache_key)
    frappe.local.login_manager.login_as(email)
```

### hset / hget / hdel (Hash İşlemleri)

```python
# HSET — Hash'e değer yazma:
frappe.cache.hset(name, key, value, shared=False)

# HGET — Hash'ten değer okuma (generator destekli):
frappe.cache.hget(name, key, generator=None, shared=False)

# HDEL — Hash'ten değer silme:
frappe.cache.hdel(name, key, shared=False)

# Gerçek örnek — Login sonrası redirect URL yönetimi:
# Kaydet:
frappe.cache.hset("redirect_after_login", user.name, sanitize_redirect(redirect_to))

# Oku ve sil:
redirect_to = frappe.cache.hget("redirect_after_login", self.user)
if redirect_to:
    frappe.local.response["redirect_to"] = redirect_to
    frappe.cache.hdel("redirect_after_login", self.user)

# Gerçek örnek — Login başarısızlık takibi (LoginAttemptTracker):
frappe.cache.hset("login_failed_count", self.key, count)
count = frappe.cache.hget("login_failed_count", self.key)
frappe.cache.hdel("login_failed_count", self.key)

frappe.cache.hset("login_failed_time", self.key, timestamp)
timestamp = frappe.cache.hget("login_failed_time", self.key)
frappe.cache.hdel("login_failed_time", self.key)
```

### setex (Düşük Seviye TTL)

```python
# Redis setex doğrudan kullanım:
frappe.cache.setex(key, seconds, value)

# Örnek (rate_limiter.py'den):
frappe.cache.setex(cache_key, seconds, 0)
```

---

## 7. frappe.sendmail() Kullanımı

### Fonksiyon İmzası

```python
frappe.sendmail(
    recipients=None,          # list veya string — ZORUNLU (pratik olarak)
    sender="",                # Gönderen adresi (varsayılan: mevcut kullanıcı)
    subject="No Subject",     # Konu
    message="No Message",     # Email gövdesi (veya content=)
    template=None,            # Template adı (templates/emails/ altında)
    args=None,                # Template'e geçirilecek dict
    now=None,                 # True: commit sonrası hemen gönder
    delayed=True,             # True: kuyruğa al (varsayılan)
    cc=None,                  # CC alıcıları
    bcc=None,                 # BCC alıcıları
    attachments=None,         # Ek dosyalar listesi
    reply_to=None,            # Yanıt adresi
    reference_doctype=None,   # Communication'a bağlamak için DocType
    reference_name=None,      # Communication'a bağlamak için belge adı
    header=None,              # [başlık, renk] tuple'ı — renkli başlık ekler
    with_container=False,     # Container div ile sar
    as_markdown=False,        # Markdown olarak işle
    inline_images=None,       # Satır içi görseller
    x_priority=3,             # 1=Yüksek, 3=Normal, 5=Düşük
    retry=1,                  # Tekrar deneme sayısı
)
```

### now=True vs delayed (Kuyruklama)

```python
# delayed=True (varsayılan): Email Queue'ya eklenir, scheduler gönderir
# now=True: DB commit sonrası hemen gönderilir
# delayed=False: İçeride now=True'ya çevrilir

# Kaynak koddan:
if not delayed:
    now = True
# ...
q = builder.process(send_now=False)
if now and q:
    frappe.db.after_commit.add(q.send)
```

### Template Kullanımı

Template dosyaları `templates/emails/{template_adı}.html` altında aranır (tüm kurulu app'lerde).

```python
# Örnek 1: Login link emaili
frappe.sendmail(
    subject=subject,
    recipients=email,
    template="login_with_email_link",
    args={"link": link, "minutes": expiry, "app_name": app_name},
    now=True,
)

# Örnek 2: Kullanıcı hoşgeldin emaili
frappe.sendmail(
    recipients=self.email,
    sender=sender,
    subject=subject,
    template="welcome_email",
    args=args,
    header=[subject, "green"],
    delayed=True,
    retry=3,
)

# Örnek 3: Admin bildirim emaili
frappe.sendmail(
    recipients=get_system_managers(),
    subject=_("Administrator Logged In"),
    template="administrator_logged_in",
    args={"access_message": access_message},
    header=["Access Notification", "orange"],
)

# Örnek 4: Template'siz basit email
frappe.sendmail(
    recipients=args.get("credit_controller_users_list"),
    subject=subject,
    message=message,
)

# Örnek 5: İçerik ile (content parametresi)
frappe.sendmail(
    recipients=[user_email],
    subject=_("Security Alert"),
    content=email_message,
)
```

---

## 8. Rate Limiting

Frappe'de **iki** rate limiting mekanizması vardır:

### 1. Global RateLimiter (Sınıf)

Her HTTP request'te `before_request` hook'u ile çalışır. Site geneli CPU zamanını takip eder.

```python
# site_config.json'da konfigürasyon:
{
    "rate_limit": {
        "limit": 100,    # Saniye cinsinden toplam CPU zamanı
        "window": 3600   # Pencere süresi (saniye)
    }
}
```

Limit aşıldığında `frappe.TooManyRequestsError` (HTTP 429) fırlatır ve `X-RateLimit-*` header'ları set eder.

### 2. @rate_limit Decorator (Endpoint Bazlı)

```python
from frappe.rate_limiter import rate_limit

@rate_limit(
    key=None,           # Form field adı (identity için, opsiyonel)
    limit=5,            # Maksimum istek sayısı (int veya callable)
    seconds=86400,      # Pencere süresi (saniye, varsayılan: 24 saat)
    methods="ALL",      # HTTP metod filtresi ("ALL" veya ["POST"])
    ip_based=True,      # IP bazlı sınırlama
)
```

**İç mekanizma:**
- Redis key formatı: `rl:{cmd}:{identity}` (identity = IP ve/veya key field değeri)
- `frappe.cache.setex()` ile TTL'li counter
- `frappe.cache.incrby()` ile artırma
- Limit aşıldığında `frappe.RateLimitExceededError` fırlatır

### Kullanım Paterni

`@frappe.whitelist()` her zaman üstte (dıştaki decorator), `@rate_limit` altta (içteki decorator):

```python
@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=3, seconds=60 * 60)
def reset_password(user: str) -> str:
    ...

@frappe.whitelist(allow_guest=True)
@rate_limit(limit=5, seconds=60 * 60)
def send_login_link(email: str):
    ...

@frappe.whitelist(allow_guest=True)
@rate_limit(key="reference_name", limit=20, seconds=60 * 60)
def add_comment(comment, comment_email, comment_by, reference_doctype, reference_name, route):
    ...

@frappe.whitelist(allow_guest=True)
@rate_limit(key="web_form", limit=10, seconds=60)
def accept(web_form, data):
    ...

@frappe.whitelist(allow_guest=True)
@rate_limit(limit=10, seconds=60 * 60)
def subscribe(email, email_group=None):
    ...
```

### Frappe'deki Mevcut Rate Limit Örnekleri

| Endpoint | limit | seconds | key |
|----------|-------|---------|-----|
| `send_login_link` | callable (~5) | 3600 | IP |
| `login_via_key` | callable (~5) | 3600 | IP |
| `reset_password` | callable | 3600 | IP |
| `add_comment` | callable | 3600 | `reference_name` |
| `like` | callable | 3600 | `reference_name` |
| `add_feedback` | 5 | 3600 | `article` |
| `send_message` | 1000 | 3600 | IP |
| `accept` (web form) | 10 | 60 | `web_form` |
| `subscribe` (newsletter) | 10 | 3600 | IP |

---

## 9. frappe.db CRUD Operasyonları

### frappe.db.exists()

```python
frappe.db.exists(dt, dn=None, cache=False)
```

Eşleşen belge varsa `name` döndürür, yoksa `None`.

```python
# DocType ve isim ile:
frappe.db.exists("User", "jane@example.org", cache=True)

# Filtre dict ile:
frappe.db.exists({"doctype": "User", "full_name": "Jane Doe"})

# DocType + filtre dict:
frappe.db.exists("User", {"full_name": "Jane Doe"})
```

### frappe.db.get_value()

```python
frappe.db.get_value(
    doctype,
    filters=None,        # İsim (string) veya filtre dict'i
    fieldname="name",    # Alan adı veya alan listesi
    ignore=None,
    as_dict=False,       # True: dict döndürür
    cache=False,         # True: request boyunca cache'ler
    for_update=False,    # True: satırı kilitler (SELECT FOR UPDATE)
)
```

```python
# Tek alan:
frappe.db.get_value("User", "test@example.com", "last_login")
# → "2026-03-15 10:30:00"

# Birden fazla alan:
last_login, last_ip = frappe.db.get_value("User", "test@example.com",
    ["last_login", "last_ip"])

# Dict olarak:
user = frappe.db.get_value("User", "test@example.com",
    ["last_login", "last_ip"], as_dict=True)
# → {"last_login": "...", "last_ip": "..."}

# Single DocType:
frappe.db.get_value("System Settings", None, "date_format")

# Filtre ile:
frappe.db.get_value("Customer", {"name": ("like", "a%")})
```

### frappe.db.set_value()

```python
frappe.db.set_value(dt, dn, field, val=None, update_modified=True)
```

**DİKKAT:** Bu metod Document event'lerini (validate, on_update vb.) tetiklemez! Doğrudan DB günceller. Hook'ların çalışması gerekiyorsa `doc.save()` kullanın.

```python
# Tek alan güncelleme:
frappe.db.set_value("User", "test@example.com", "last_login", now())

# Birden fazla alan (dict ile):
frappe.db.set_value("User", "test@example.com", {
    "last_login": now(),
    "last_ip": frappe.local.request_ip,
})
```

### frappe.new_doc()

```python
frappe.new_doc(
    doctype,
    *,                       # Keyword-only argümanlar
    parent_doc=None,         # Parent belge (child table için)
    parentfield=None,        # Parent field adı
    as_dict=False,           # Dict olarak döndür
    **kwargs,                # Alan değerleri
)
```

```python
# Basit kullanım:
doc = frappe.new_doc("Customer")
doc.customer_name = "Acme Corp"
doc.customer_group = "Commercial"
doc.insert()

# kwargs ile:
doc = frappe.new_doc("Customer", customer_name="Acme Corp", customer_group="Commercial")
doc.insert()
```

### frappe.get_doc()

```python
# Mevcut belgeyi getir:
doc = frappe.get_doc("Customer", "CUST-2026-00001")

# Single DocType:
settings = frappe.get_doc("System Settings")

# for_update (satır kilidi):
doc = frappe.get_doc("Customer", "CUST-2026-00001", for_update=True)

# Dict'ten yeni belge (deprecated — new_doc tercih edin):
doc = frappe.get_doc({"doctype": "ToDo", "description": "test"})
doc.insert()
```

### doc.insert() ve doc.save()

```python
# INSERT — Yeni kayıt oluşturur:
doc.insert(ignore_permissions=False)
# before_insert → validate → after_insert hook'ları çalışır

# SAVE — Mevcut kaydı günceller:
doc.save(ignore_permissions=False)
# validate → on_update hook'ları çalışır

# Ortak parametreler:
doc.insert(ignore_permissions=True)      # İzin kontrolü atla
doc.flags.ignore_mandatory = True        # Zorunlu alan kontrolünü atla
doc.save(ignore_permissions=True)
```

### Tam Örnek: Endpoint'te Kayıt Oluşturma

```python
# ERPNext book_appointment/index.py'den:
@frappe.whitelist(allow_guest=True)
def create_appointment(date, time, tz, contact):
    format_string = "%Y-%m-%d %H:%M:%S"
    scheduled_time = datetime.datetime.strptime(date + " " + time, format_string)
    scheduled_time = scheduled_time.replace(tzinfo=None)
    scheduled_time = convert_to_system_timezone(tz, scheduled_time)
    scheduled_time = scheduled_time.replace(tzinfo=None)

    appointment = frappe.new_doc("Appointment")
    appointment.scheduled_time = scheduled_time

    contact = json.loads(contact)
    appointment.customer_name = contact.get("name", None)
    appointment.customer_phone_number = contact.get("number", None)
    appointment.customer_skype = contact.get("skype", None)
    appointment.customer_details = contact.get("notes", None)
    appointment.customer_email = contact.get("email", None)
    appointment.status = "Open"

    appointment.insert(ignore_permissions=True)
    return appointment
```

---

## 10. Şifre ve Hash Yardımcıları

### passlib CryptContext Konfigürasyonu

```python
from passlib.context import CryptContext

passlibctx = CryptContext(
    schemes=["pbkdf2_sha256", "argon2"],
)
```

- `pbkdf2_sha256`: Varsayılan hashing şeması (yeni şifreler için)
- `argon2`: Desteklenen alternatif (mevcut hash'leri doğrulayabilir)
- `passlibctx.needs_update()`: Hash şeması eski ise True döner → otomatik rehash

### check_password()

```python
check_password(user, pwd, doctype="User", fieldname="password", delete_tracker_cache=True)
```

- `__Auth` tablosundan kullanıcının hash'lenmiş şifresini sorgular (`encrypted=0`)
- `passlibctx.verify(pwd, hashed)` ile doğrular
- Başarısızlıkta `frappe.AuthenticationError` fırlatır
- Başarıda login-failed cache'ini temizler
- Hash güncelleme gerekiyorsa otomatik rehash yapar
- Kullanıcı adını döndürür

```python
# Kullanım:
try:
    user = check_password("test@example.com", "my_password")
except frappe.AuthenticationError:
    frappe.throw(_("Incorrect password"))
```

### update_password()

```python
update_password(user, pwd, doctype="User", fieldname="password", logout_all_sessions=False)
```

- `passlibctx.hash(pwd)` ile hash'ler
- `__Auth` tablosuna upsert yapar (`encrypted=0`)
- `logout_all_sessions=True` ile mevcut oturum hariç tüm oturumları sonlandırır

```python
# Kullanım:
from frappe.utils.password import update_password
update_password("test@example.com", "new_password", logout_all_sessions=True)
```

### encrypt() / decrypt()

Fernet simetrik şifreleme — **tersine çevrilebilir** (API anahtarları, üçüncü parti şifreleri için):

```python
from frappe.utils.password import encrypt, decrypt

# Şifreleme:
encrypted = encrypt("my_api_key")

# Çözme:
original = decrypt(encrypted)
```

Şifreleme anahtarı `site_config.json`'daki `encryption_key` alanından alınır. Yoksa otomatik oluşturulur.

### get_decrypted_password() / set_encrypted_password()

`__Auth` tablosunda `encrypted=1` olarak saklanır:

```python
from frappe.utils.password import get_decrypted_password, set_encrypted_password

# Şifrelenmiş değer kaydet:
set_encrypted_password("Integration Settings", "Stripe", "sk_live_xxx", "api_key")

# Şifrelenmiş değeri oku:
api_key = get_decrypted_password("Integration Settings", "Stripe", "api_key")
```

### frappe.generate_hash()

```python
frappe.generate_hash(txt=None, length=56)
```

- `txt` parametresi **yoksayılır** — her zaman kriptografik olarak güvenli rastgele hex string üretir
- `secrets.token_hex()` kullanır
- Varsayılan: 56 karakter

```python
# Kullanım:
token = frappe.generate_hash()           # 56 karakterlik rastgele hex
short_token = frappe.generate_hash(length=10)  # 10 karakterlik
```

### `__Auth` Tablosu Yapısı

| Kolon | Açıklama |
|-------|----------|
| `doctype` | İlişkili DocType (örn: "User") |
| `name` | Belge adı (örn: "test@example.com") |
| `fieldname` | Alan adı (örn: "password", "api_key") |
| `password` | Hash veya şifreli değer |
| `encrypted` | `0` = one-way hash (şifre), `1` = Fernet encrypted (geri çözülebilir) |

---

## 11. DocType JSON Yapısı

### Üst Seviye JSON Anahtarları

```json
{
    "name": "Contact",
    "doctype": "DocType",
    "module": "Contacts",
    "naming_rule": "By script",
    "autoname": "naming_series:",
    "title_field": "full_name",
    "image_field": "image",
    "search_fields": "email_id, phone, company_name",
    "sort_field": "modified",
    "sort_order": "DESC",
    "allow_import": 1,
    "allow_rename": 1,
    "track_changes": 1,
    "show_name_in_global_search": 1,
    "engine": "InnoDB",
    "field_order": ["first_name", "middle_name", "last_name", ...],
    "fields": [...],
    "permissions": [...],
    "links": [...],
    "actions": [],
    "states": []
}
```

### Field Tipleri

```json
// Section Break — Form bölümü ayırıcı:
{"fieldname": "contact_section", "fieldtype": "Section Break", "label": "Contact Details"}

// Tab Break — Sekme:
{"fieldname": "address_tab", "fieldtype": "Tab Break", "label": "Address & Contact"}

// Column Break — Sütun ayırıcı:
{"fieldname": "cb00", "fieldtype": "Column Break"}

// Data — Metin alanı:
{"fieldname": "first_name", "fieldtype": "Data", "label": "First Name", "reqd": 1}

// Data (Email doğrulamalı):
{"fieldname": "email_id", "fieldtype": "Data", "label": "Email", "options": "Email", "search_index": 1}

// Link — Foreign key referansı:
{"fieldname": "user", "fieldtype": "Link", "label": "User", "options": "User"}

// Link (filtreli):
{
    "fieldname": "customer_group",
    "fieldtype": "Link",
    "label": "Customer Group",
    "options": "Customer Group",
    "link_filters": "[[\"Customer Group\", \"is_group\", \"=\", 0]]"
}

// Check — Boolean:
{"fieldname": "is_primary_contact", "fieldtype": "Check", "default": "0"}

// Select — Dropdown:
{
    "fieldname": "status",
    "fieldtype": "Select",
    "label": "Status",
    "options": "Passive\nOpen\nReplied",
    "default": "Passive",
    "in_list_view": 1,
    "in_standard_filter": 1
}

// Table — Child DocType (alt tablo):
{"fieldname": "links", "fieldtype": "Table", "label": "Links", "options": "Dynamic Link"}

// Attach Image:
{"fieldname": "image", "fieldtype": "Attach Image", "hidden": 1}

// Read Only (fetched):
{
    "fieldname": "mobile_no",
    "fieldtype": "Read Only",
    "fetch_from": "customer_primary_contact.mobile_no"
}

// HTML:
{"fieldname": "address_html", "fieldtype": "HTML", "depends_on": "eval: !doc.__islocal"}
```

Diğer field tipleri: `Text`, `Small Text`, `Long Text`, `Int`, `Float`, `Currency`, `Date`, `Datetime`, `Time`, `Password`, `Color`, `Barcode`, `Geolocation`.

### Önemli Field Özellikleri

| Özellik | Değer | Açıklama |
|---------|-------|----------|
| `reqd` | `1` | Zorunlu alan |
| `unique` | `1` | Benzersiz değer |
| `in_list_view` | `1` | Liste görünümünde göster |
| `in_standard_filter` | `1` | Standart filtre olarak göster |
| `search_index` | `1` | Veritabanı indeksi oluştur |
| `bold` | `1` | Kalın göster |
| `read_only` | `1` | Düzenlenemez |
| `hidden` | `1` | Formda gizle |
| `no_copy` | `1` | Kopyalamada dahil etme |
| `set_only_once` | `1` | Sadece oluştururken ayarlanabilir |
| `default` | `"0"` | Varsayılan değer |
| `depends_on` | `"eval:doc.type=='Company'"` | Koşullu görünürlük |
| `fetch_from` | `"contact.mobile_no"` | Bağlı belgeden otomatik çek |
| `ignore_user_permissions` | `1` | Kullanıcı izin kısıtlamasını atla |
| `collapsible` | `1` | Katlanabilir bölüm |

### Permissions Yapısı

```json
{
    "permissions": [
        {
            "role": "System Manager",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
            "email": 1,
            "print": 1,
            "report": 1,
            "share": 1,
            "export": 1,
            "import": 1
        },
        {
            "role": "Sales User",
            "permlevel": 1,
            "read": 1
        },
        {
            "role": "All",
            "if_owner": 1,
            "read": 1,
            "write": 1,
            "delete": 1
        }
    ]
}
```

- `permlevel`: Alan gruplarına erişim seviyesi
- `if_owner`: Sadece kendi oluşturduğu belgelere erişim

### Controller .py Dosyası

```python
import frappe
from frappe import _
from frappe.model.document import Document


class Contact(Document):
    # Otomatik tip tanımları (export_python_type_annotations hook'u ile):
    # begin: auto-generated types
    from typing import TYPE_CHECKING
    if TYPE_CHECKING:
        from frappe.types import DF
        first_name: DF.Data | None
        email_id: DF.Data | None
        is_primary_contact: DF.Check
        status: DF.Literal["Passive", "Open", "Replied"]
    # end: auto-generated types

    def autoname(self):
        """Özel isimlendirme mantığı"""
        self.name = self.full_name

    def validate(self):
        """Kaydetmeden önce doğrulama (insert ve update'te çalışır)"""
        self.set_primary_email()

    def before_insert(self):
        """Insert'ten önce"""
        pass

    def after_insert(self):
        """Insert'ten sonra"""
        pass

    def on_update(self):
        """Save/update sonrası"""
        pass

    def on_trash(self):
        """Silinirken"""
        pass

    def on_submit(self):
        """Submit edilirken (workflow)"""
        pass

    def on_cancel(self):
        """Cancel edilirken (workflow)"""
        pass
```

### autoname ve naming_rule Patternleri

```json
// 1. Script ile (controller'da autoname() metodu):
{"naming_rule": "By script"}

// 2. Naming Series ile:
{"autoname": "naming_series:", "naming_rule": "By \"Naming Series\" field"}
// Select field: "options": "CUST-.YYYY.-" → CUST-2026-00001

// 3. Alan değeri ile:
{"autoname": "field:customer_name"}

// 4. Hash ile:
{"autoname": "hash"}

// 5. Format string ile:
{"autoname": "format:INV-{customer_name}-{####}"}

// 6. Kullanıcı girişi:
{"autoname": "prompt"}
```

---

## 12. tradehub_core İçin Uygulama Planı

### Adım 1: App Oluşturma

```bash
docker compose exec backend bench new-app tradehub_core
# Title: TradeHub Core
# Description: TradeHub B2B E-Commerce Backend
# Publisher: TradeHub
# Email: dev@tradehub.com
# License: MIT

docker compose exec backend bench --site tradehub.localhost install-app tradehub_core
```

### Adım 2: Modül Yapısı

```
tradehub_core/
├── tradehub_core/
│   ├── __init__.py
│   ├── hooks.py
│   ├── modules.txt
│   ├── patches.txt
│   ├── api/                    # API endpoint'leri
│   │   ├── __init__.py
│   │   ├── auth.py             # register, login, verify_email, forgot_password
│   │   ├── products.py         # ürün listeleme, detay
│   │   └── orders.py           # sipariş oluşturma, takip
│   ├── tradehub_core/          # DocType'lar (modül dizini)
│   │   ├── __init__.py
│   │   └── doctype/
│   │       ├── tradehub_user/
│   │       ├── tradehub_product/
│   │       └── tradehub_order/
│   ├── templates/
│   │   └── emails/             # Email şablonları
│   │       ├── verify_email.html
│   │       └── password_reset.html
│   └── public/
│       ├── css/
│       └── js/
└── pyproject.toml
```

### Adım 3: hooks.py Konfigürasyonu

```python
app_name = "tradehub_core"
app_title = "TradeHub Core"
# ...

# Guest erişimli endpoint'ler için:
# (Endpoint'ler @frappe.whitelist(allow_guest=True) ile tanımlanır)

# Zamanlı görevler:
scheduler_events = {
    "daily": [
        "tradehub_core.tasks.cleanup_expired_tokens",
    ],
}

# Belge olayları:
doc_events = {
    "User": {
        "after_insert": "tradehub_core.events.user_after_insert",
    },
}
```

### Adım 4: API Endpoint Pattern'i

```python
# tradehub_core/api/auth.py

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils.password import check_password, update_password

@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=60 * 60)
def register(email: str, full_name: str, password: str):
    if frappe.db.exists("User", email):
        frappe.throw(_("User already exists"), frappe.DuplicateEntryError)

    user = frappe.new_doc("User")
    user.email = email
    user.first_name = full_name
    user.send_welcome_email = 0
    user.insert(ignore_permissions=True)

    update_password(email, password)

    # Verification token
    token = frappe.generate_hash(length=32)
    frappe.cache.set_value(f"verify_email:{token}", email, expires_in_sec=24 * 60 * 60)

    frappe.sendmail(
        recipients=email,
        subject=_("Verify Your Email"),
        template="verify_email",
        args={"token": token, "full_name": full_name},
        now=True,
    )

    return {"message": _("Registration successful. Please verify your email.")}
```

### Adım 5: DocType Oluşturma

```bash
# Docker içinden bench ile:
docker compose exec backend bench --site tradehub.localhost \
    console  # Python console'u aç

# Veya DocType JSON dosyasını manuel oluşturup:
docker compose exec backend bench migrate
```

### Adım 6: Build ve Deploy

```bash
docker compose exec backend bench build
docker compose exec backend bench migrate
docker compose restart backend worker scheduler
```
