import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Lazy-load a view. On chunk load failure (e.g. after deploy, old chunk gone),
 * reload the page so the user gets the new assets.
 */
function lazyLoad(importFn) {
  return () =>
    importFn().catch((err) => {
      const isChunkLoadError =
        err?.message?.includes('Failed to fetch dynamically imported module') ||
        err?.name === 'ChunkLoadError'
      if (isChunkLoadError) {
        window.location.reload()
        return
      }
      throw err
    })
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: lazyLoad(() => import('@/views/LoginView.vue')),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: lazyLoad(() => import('@/views/RegisterView.vue')),
    meta: { guest: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: lazyLoad(() => import('@/views/DashboardView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects',
    name: 'Projects',
    component: lazyLoad(() => import('@/views/ProjectsView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/new',
    name: 'ProjectCreate',
    component: lazyLoad(() => import('@/views/ProjectFormView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:id',
    name: 'ProjectShow',
    component: lazyLoad(() => import('@/views/ProjectShowView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:id/edit',
    name: 'ProjectEdit',
    component: lazyLoad(() => import('@/views/ProjectFormView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: lazyLoad(() => import('@/views/TasksView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/create',
    name: 'TaskCreate',
    component: lazyLoad(() => import('@/views/TaskCreateView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/:id/edit',
    name: 'TaskEdit',
    component: lazyLoad(() => import('@/views/TaskEditView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/personal-todos',
    name: 'PersonalTodos',
    component: lazyLoad(() => import('@/views/PersonalTodosView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/personal-todos/create',
    name: 'PersonalTodoCreate',
    component: lazyLoad(() => import('@/views/PersonalTodoCreateView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/personal-todos/:id/edit',
    name: 'PersonalTodoEdit',
    component: lazyLoad(() => import('@/views/PersonalTodoEditView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/planner',
    name: 'Planner',
    component: lazyLoad(() => import('@/views/PlannerView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: lazyLoad(() => import('@/views/TimelineView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/team',
    name: 'Team',
    component: lazyLoad(() => import('@/views/TeamView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/team/members',
    name: 'TeamMembers',
    component: lazyLoad(() => import('@/views/TeamMembersView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/shifts',
    name: 'Shifts',
    component: lazyLoad(() => import('@/views/ShiftsView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/clock-ins',
    name: 'ClockIns',
    component: lazyLoad(() => import('@/views/ClockInsView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/shifts/create',
    name: 'ShiftCreate',
    component: lazyLoad(() => import('@/views/ShiftCreateView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/shifts/:id/edit',
    name: 'ShiftEdit',
    component: lazyLoad(() => import('@/views/ShiftEditView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/reminders',
    name: 'Reminders',
    component: lazyLoad(() => import('@/views/RemindersView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/reminders/create',
    name: 'ReminderCreate',
    component: lazyLoad(() => import('@/views/ReminderCreateView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/reminders/:id/edit',
    name: 'ReminderEdit',
    component: lazyLoad(() => import('@/views/ReminderEditView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: lazyLoad(() => import('@/views/NotificationsView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications/preferences',
    name: 'NotificationPreferences',
    component: lazyLoad(() => import('@/views/NotificationPreferencesView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: lazyLoad(() => import('@/views/SettingsView.vue')),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.meta.guest && auth.isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
