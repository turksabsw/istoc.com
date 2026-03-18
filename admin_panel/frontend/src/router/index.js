import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layout
import AppLayout from '@/layouts/AppLayout.vue'

// Views (lazy-loaded)
const LoginView = () => import('@/views/auth/LoginView.vue')
const DocTypeListView = () => import('@/views/doctype/DocTypeListView.vue')

// Dashboard — simplified for current doctypes
const PlatformOverview = () => import('@/views/dashboard/PlatformOverview.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guest: true },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: PlatformOverview,
        meta: { title: 'Genel Bakış', breadcrumb: 'Genel Bakış', section: 'dashboard' },
      },
      // Generic DocType list/form — works for any existing DocType
      {
        path: 'app/:doctype',
        name: 'DocTypeList',
        component: DocTypeListView,
        meta: { title: 'Liste', breadcrumb: 'Liste', section: 'management' },
      },
      {
        path: 'app/:doctype/:name',
        name: 'DocTypeForm',
        component: () => import('@/views/doctype/DocTypeFormView.vue'),
        meta: { title: 'Detay', breadcrumb: 'Detay', section: 'management' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Storefront URL for redirect
const STOREFRONT_URL = 'http://localhost:5500/'

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated && !to.meta.guest) {
    try { await auth.fetchUser() } catch { }
  }
  if (!to.meta.guest && !auth.isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return next('/dashboard')
  }
  // Only admins can access admin panel
  if (!to.meta.guest && auth.isAuthenticated && !auth.isAdmin) {
    window.location.href = STOREFRONT_URL
    return
  }
  next()
})

export default router
