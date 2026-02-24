<template>
  <div class="dashboard">
    <NavBar />
    <main class="dashboard-content">
      <div class="welcome-section">
        <h1>Welcome back, {{ auth.userName }}</h1>
        <p>Here's your TimeBudget dashboard.</p>
      </div>

      <!-- Clock In / Out Card -->
      <div class="clock-card" :class="{ 'clock-card--active': shiftStore.isClockedIn }">
        <div v-if="shiftStore.isClockedIn" class="clock-active">
          <div class="clock-status">
            <span class="clock-pulse"></span>
            <span class="clock-label">Clocked In</span>
          </div>
          <div class="clock-details">
            <span class="clock-project">{{ projectName(shiftStore.activeClockSession?.project_id) }}</span>
            <span class="clock-separator">&#183;</span>
            <span class="clock-started">Started {{ formatDateTime(shiftStore.activeClockSession?.start_time) }}</span>
          </div>
          <div class="clock-elapsed">{{ elapsedTime }}</div>
          <button
            class="btn-clock btn-clock-out"
            :disabled="shiftStore.clockLoading"
            @click="handleClockOut"
          >
            <span v-if="shiftStore.clockLoading" class="spinner spinner-sm"></span>
            Clock Out
          </button>
        </div>
        <div v-else class="clock-idle">
          <div class="clock-idle-row">
            <div class="clock-idle-info">
              <span class="clock-idle-icon">&#9201;</span>
              <div>
                <div class="clock-idle-title">Ready to start?</div>
                <div class="clock-idle-sub">Select a {{ settingsStore.projectDescription.toLowerCase() }} and clock in to begin tracking.</div>
                <div v-if="suggestedShift" class="clock-suggestion">
                  <span class="clock-suggestion-label">Suggested:</span>
                  <span class="clock-suggestion-project">{{ projectName(suggestedShift.project_id) }}</span>
                  <span class="clock-suggestion-time">(planned {{ formatDateTime(suggestedShift.start_time) }})</span>
                  <button type="button" class="clock-suggestion-use" @click="useSuggestedProject">Use</button>
                </div>
              </div>
            </div>
            <div class="clock-idle-actions">
              <select v-model="clockInProjectId" class="clock-select">
                <option value="" disabled>Select {{ settingsStore.projectDescription.toLowerCase() }}...</option>
                <option v-for="p in shiftStore.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button
                class="btn-clock btn-clock-in"
                :disabled="!clockInProjectId || shiftStore.clockLoading"
                @click="handleClockIn"
              >
                <span v-if="shiftStore.clockLoading" class="spinner spinner-sm"></span>
                Clock In
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <router-link to="/shifts" class="stat-card stat-card-link">
          <div class="stat-icon">&#9201;</div>
          <div class="stat-info">
            <span class="stat-label">Shifts</span>
            <span class="stat-value">{{ shiftStore.shiftCount }}</span>
          </div>
        </router-link>
        <router-link to="/tasks" class="stat-card stat-card-link">
          <div class="stat-icon">&#9745;</div>
          <div class="stat-info">
            <span class="stat-label">Tasks</span>
            <span class="stat-value">{{ taskStore.taskCount }}</span>
          </div>
        </router-link>
        <router-link to="/personal-todos" class="stat-card stat-card-link">
          <div class="stat-icon">&#128221;</div>
          <div class="stat-info">
            <span class="stat-label">Personal TODO</span>
            <span class="stat-value">{{ personalTodoStore.todoCount }}</span>
          </div>
        </router-link>
        <router-link to="/reminders" class="stat-card stat-card-link">
          <div class="stat-icon">&#9200;</div>
          <div class="stat-info">
            <span class="stat-label">Reminders</span>
            <span class="stat-value">{{ reminderStore.upcomingCount }}</span>
          </div>
        </router-link>
        <router-link to="/projects" class="stat-card stat-card-link">
          <div class="stat-icon">&#128193;</div>
          <div class="stat-info">
            <span class="stat-label">{{ settingsStore.projectDescriptionPlural }}</span>
            <span class="stat-value">{{ projectCount }}</span>
          </div>
        </router-link>
      </div>

      <!-- Recent clock sessions -->
      <div class="shifts-section">
        <div class="shifts-section-header">
          <h3>Recent clock sessions</h3>
          <router-link to="/clock-ins" class="btn-secondary btn-sm">View all</router-link>
        </div>
        <div v-if="shiftStore.loading && shiftStore.clockSessions.length === 0" class="loading-inline">
          <span class="spinner"></span> Loading...
        </div>
        <div v-else-if="shiftStore.clockSessions.length === 0" class="empty-inline">
          No clock sessions yet. Clock in above to start tracking.
        </div>
        <div v-else class="shifts-table-wrap">
          <table class="shifts-table">
            <thead>
              <tr>
                <th>{{ settingsStore.projectDescription }}</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in recentSessions" :key="session.id" :class="{ 'row-active': !session.end_time }">
                <td>
                  <router-link v-if="session.project_id" :to="`/projects/${session.project_id}`" class="project-link">
                    {{ projectName(session.project_id) }}
                  </router-link>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="td-datetime">{{ formatDateTime(session.start_time) }}</td>
                <td class="td-datetime">
                  <span v-if="session.end_time">{{ formatDateTime(session.end_time) }}</span>
                  <span v-else class="in-progress-badge">In Progress</span>
                </td>
                <td>
                  <span v-if="session.end_time" class="duration-badge">{{ formatDuration(session.start_time, session.end_time) }}</span>
                  <span v-else class="duration-badge duration-badge--live">{{ formatLiveDuration(session.start_time) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="session-info">
        <h3>Session Info</h3>
        <div class="session-details">
          <div class="detail-row">
            <span class="detail-label">User ID</span>
            <span class="detail-value">{{ auth.user?.id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">{{ auth.user?.email }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session Status</span>
            <span class="detail-value session-active">Active</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Member Since</span>
            <span class="detail-value">{{ formatDate(auth.user?.created_at) }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useTaskStore } from '@/stores/tasks'
import { usePersonalTodoStore } from '@/stores/personalTodos'
import { useShiftStore } from '@/stores/shifts'
import { useReminderStore } from '@/stores/reminders'
import projectService from '@/services/projects'
import NavBar from '@/components/NavBar.vue'

function formatMs(ms) {
  if (ms < 0) return '0m'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export default {
  name: 'DashboardView',
  components: { NavBar },
  setup() {
    const auth = useAuthStore()
    const settingsStore = useSettingsStore()
    const taskStore = useTaskStore()
    const personalTodoStore = usePersonalTodoStore()
    const shiftStore = useShiftStore()
    const reminderStore = useReminderStore()
    const projectCount = ref(0)
    const clockInProjectId = ref('')
    const now = ref(new Date())
    let ticker = null

    onMounted(async () => {
      await Promise.all([
        taskStore.fetchTasks(),
        personalTodoStore.fetchTodos(),
        shiftStore.fetchShifts(),
        shiftStore.fetchClockSessions(),
        shiftStore.fetchProjects(),
        reminderStore.fetchReminders(),
        projectService.list().then((res) => {
          projectCount.value = res.data.length
        }),
      ])
      ticker = setInterval(() => {
        now.value = new Date()
      }, 1000)
    })

    onUnmounted(() => {
      if (ticker) clearInterval(ticker)
    })

    function projectName(projectId) {
      const project = shiftStore.projects.find((p) => p.id === projectId)
      return project ? project.name : `#${projectId}`
    }

    function formatDateTime(dateStr) {
      if (!dateStr) return '--'
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    function formatDuration(startStr, endStr) {
      if (!startStr || !endStr) return '--'
      const ms = new Date(endStr) - new Date(startStr)
      return formatMs(ms)
    }

    function formatLiveDuration(startStr) {
      if (!startStr) return '--'
      return formatMs(now.value - new Date(startStr))
    }

    const elapsedTime = computed(() => {
      if (!shiftStore.activeClockSession?.start_time) return '0s'
      return formatMs(now.value - new Date(shiftStore.activeClockSession.start_time))
    })

    const recentSessions = computed(() => shiftStore.clockSessions.slice(0, 5))

    const suggestedShift = computed(() => shiftStore.getSuggestedClockInShift(auth.user?.id))

    watch(suggestedShift, (next) => {
      if (next?.project_id && !clockInProjectId.value) {
        clockInProjectId.value = next.project_id
      }
    }, { immediate: true })

    function useSuggestedProject() {
      if (suggestedShift.value?.project_id) {
        clockInProjectId.value = suggestedShift.value.project_id
      }
    }

    async function handleClockIn() {
      if (!clockInProjectId.value || !auth.user?.id) return
      await shiftStore.clockIn(auth.user.id, clockInProjectId.value)
      clockInProjectId.value = ''
    }

    async function handleClockOut() {
      if (!auth.user?.id) return
      await shiftStore.clockOut(auth.user.id)
    }

    function formatDate(dateStr) {
      if (!dateStr) return '--'
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    return {
      auth,
      settingsStore,
      taskStore,
      personalTodoStore,
      shiftStore,
      reminderStore,
      projectCount,
      clockInProjectId,
      elapsedTime,
      recentSessions,
      suggestedShift,
      useSuggestedProject,
      projectName,
      formatDateTime,
      formatDuration,
      formatLiveDuration,
      formatDate,
      handleClockIn,
      handleClockOut,
    }
  },
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #0f172a;
}

.dashboard-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.welcome-section {
  margin-bottom: 2rem;
}

.welcome-section h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.welcome-section p {
  color: #94a3b8;
  margin: 0;
}

/* Clock card (shared with ShiftsView) */
.clock-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s;
}

.clock-card--active {
  border-color: rgba(52, 211, 153, 0.4);
  background: linear-gradient(135deg, #1e293b 0%, rgba(52, 211, 153, 0.05) 100%);
}

.clock-active {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.clock-status { display: flex; align-items: center; gap: 0.5rem; }

.clock-pulse {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #34d399;
  animation: dash-pulse 1.5s ease-in-out infinite;
}

@keyframes dash-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
}

.clock-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #34d399;
}

.clock-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.clock-project {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clock-separator { color: #475569; font-size: 1.2rem; }

.clock-started {
  font-size: 0.82rem;
  color: #94a3b8;
  white-space: nowrap;
}

.clock-elapsed {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
  min-width: 110px;
  text-align: right;
}

.btn-clock {
  padding: 0.6rem 1.4rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-clock:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-clock-in {
  background: #34d399;
  color: #064e3b;
}

.btn-clock-in:hover:not(:disabled) { background: #2dd4a8; }

.btn-clock-out {
  background: #ef4444;
  color: white;
}

.btn-clock-out:hover:not(:disabled) { background: #dc2626; }

.clock-idle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.clock-idle-info { display: flex; align-items: center; gap: 0.75rem; }

.clock-idle-icon { font-size: 1.5rem; }

.clock-idle-title { font-size: 0.95rem; font-weight: 600; color: #f1f5f9; }

.clock-idle-sub { font-size: 0.82rem; color: #94a3b8; margin-top: 0.15rem; }

.clock-suggestion {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.clock-suggestion-label { color: #94a3b8; }

.clock-suggestion-project { font-weight: 600; color: #93c5fd; }

.clock-suggestion-time { color: #64748b; font-size: 0.8rem; }

.clock-suggestion-use {
  margin-left: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.75rem;
  cursor: pointer;
}

.clock-suggestion-use:hover {
  border-color: #60a5fa;
  color: #60a5fa;
}

.clock-idle-actions { display: flex; align-items: center; gap: 0.75rem; }

.clock-select {
  padding: 0.55rem 0.85rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.88rem;
  min-width: 170px;
  cursor: pointer;
}

.clock-select:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Recent shifts section */
.shifts-section {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.shifts-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.shifts-section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.85rem; }

.loading-inline, .empty-inline {
  color: #94a3b8;
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

.shifts-table-wrap { overflow-x: auto; }

.shifts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.shifts-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  color: #94a3b8;
  font-weight: 600;
  border-bottom: 1px solid #334155;
}

.shifts-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #334155;
  color: #e2e8f0;
}

.shifts-table tbody tr.row-active {
  background: rgba(52, 211, 153, 0.04);
}

.td-datetime { white-space: nowrap; }

.project-link { color: #60a5fa; text-decoration: none; }
.project-link:hover { text-decoration: underline; }

.text-muted { color: #64748b; }

.in-progress-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
}

.duration-badge {
  font-variant-numeric: tabular-nums;
}

.duration-badge--live {
  color: #34d399;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #334155;
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: dash-spin 0.7s linear infinite;
}

.spinner-sm { width: 0.875rem; height: 0.875rem; border-width: 1.5px; }

@keyframes dash-spin {
  to { transform: rotate(360deg); }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card-link {
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}

.stat-card-link:hover {
  border-color: #3b82f6;
  background: #1e293b;
}

.stat-icon {
  font-size: 1.75rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 10px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
}

.session-info {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.5rem;
}

.session-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 1rem;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #334155;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.detail-value {
  font-size: 0.9rem;
  color: #e2e8f0;
  font-weight: 500;
}

.session-active {
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
}
</style>
