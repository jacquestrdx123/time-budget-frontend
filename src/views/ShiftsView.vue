<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Shifts</h1>
          <p>What you're supposed to do (planned work).</p>
        </div>
        <div class="page-header-actions">
          <router-link to="/clock-ins" class="btn-secondary">Clock ins</router-link>
          <router-link to="/shifts/create" class="btn-primary">+ New Shift</router-link>
        </div>
      </div>

      <div v-if="shiftStore.loading" class="loading-state">
        <span class="spinner"></span>
        Loading shifts...
      </div>

      <div v-else-if="shiftStore.shifts.length === 0" class="empty-state">
        <div class="empty-icon">&#9201;</div>
        <h3>No shifts yet</h3>
        <p>Create a planned shift or go to Clock ins to log time.</p>
        <div class="empty-actions">
          <router-link to="/shifts/create" class="btn-primary">+ New Shift</router-link>
          <router-link to="/clock-ins" class="btn-secondary">Clock ins</router-link>
        </div>
      </div>

      <div v-else class="shift-table-wrapper">
        <table class="shift-table">
          <thead>
            <tr>
              <th>{{ settingsStore.projectDescription }} / Break</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th class="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="shift in shiftStore.shifts"
              :key="shift.id"
              :class="{ 'row-break': shift.is_break }"
            >
              <td>
                <template v-if="shift.is_break">
                  <span class="break-badge">{{ shift.break_type || 'Break' }}</span>
                </template>
                <template v-else>
                  <router-link v-if="shift.project_id" :to="`/projects/${shift.project_id}`" class="project-link">
                    {{ projectName(shift.project_id) }}
                  </router-link>
                  <span v-else class="text-muted">—</span>
                </template>
              </td>
              <td class="td-datetime">{{ formatDateTime(shift.start_time) }}</td>
              <td class="td-datetime">{{ formatDateTime(shift.end_time) }}</td>
              <td>
                <span class="duration-badge">{{ formatDuration(shift.start_time, shift.end_time) }}</span>
              </td>
              <td class="td-actions">
                <router-link :to="`/shifts/${shift.id}/edit`" class="btn-icon" title="Edit">&#9998;</router-link>
                <button
                  type="button"
                  class="btn-icon btn-danger"
                  title="Delete"
                  @click="confirmDelete(shift)"
                >
                  &#128465;
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Delete confirmation modal -->
      <div v-if="shiftToDelete" class="modal-overlay" @click.self="shiftToDelete = null">
        <div class="modal-card">
          <h3>Delete shift?</h3>
          <p>This will remove this planned shift. Clock ins linked to it are not affected.</p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="shiftToDelete = null">Cancel</button>
            <button type="button" class="btn-danger-solid" :disabled="deleting" @click="handleDelete">
              <span v-if="deleting" class="spinner spinner-sm"></span>
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useShiftStore } from '@/stores/shifts'
import { useSettingsStore } from '@/stores/settings'
import NavBar from '@/components/NavBar.vue'

export default {
  name: 'ShiftsView',
  components: { NavBar },
  setup() {
    const shiftStore = useShiftStore()
    const settingsStore = useSettingsStore()
    const shiftToDelete = ref(null)
    const deleting = ref(false)

    onMounted(async () => {
      await Promise.all([
        shiftStore.fetchShifts(),
        shiftStore.fetchProjects(),
      ])
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

    function formatMs(ms) {
      if (ms < 0) return '0m'
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      if (hours > 0) return `${hours}h ${minutes}m`
      if (minutes > 0) return `${minutes}m`
      return '0m'
    }

    function confirmDelete(shift) {
      shiftToDelete.value = shift
    }

    async function handleDelete() {
      if (!shiftToDelete.value) return
      deleting.value = true
      try {
        const ok = await shiftStore.deleteShift(shiftToDelete.value.id)
        if (ok) shiftToDelete.value = null
      } finally {
        deleting.value = false
      }
    }

    return {
      shiftStore,
      settingsStore,
      shiftToDelete,
      deleting,
      projectName,
      formatDateTime,
      formatDuration,
      confirmDelete,
      handleDelete,
    }
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0f172a;
}

.page-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
}

.page-header p {
  color: #94a3b8;
  margin: 0;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-primary {
  padding: 0.6rem 1.2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-secondary:hover {
  background: #334155;
  color: #f1f5f9;
}

.loading-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #f1f5f9;
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
}

.empty-state p {
  color: #94a3b8;
  margin: 0 0 1.5rem;
}

.empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.shift-table-wrapper {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  overflow: hidden;
}

.shift-table {
  width: 100%;
  border-collapse: collapse;
}

.shift-table th {
  text-align: left;
  padding: 0.85rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.th-actions {
  text-align: right;
}

.shift-table td {
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  color: #e2e8f0;
  border-bottom: 1px solid #334155;
}

.shift-table tbody tr:last-child td {
  border-bottom: none;
}

.shift-table tbody tr:hover {
  background: rgba(59, 130, 246, 0.04);
}

.row-break {
  background: rgba(245, 158, 11, 0.03);
}

.row-break:hover {
  background: rgba(245, 158, 11, 0.06) !important;
}

.break-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.7rem;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.project-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.project-link:hover {
  text-decoration: underline;
  color: #60a5fa;
}

.td-datetime {
  font-size: 0.85rem;
  color: #cbd5e1;
}

.text-muted {
  color: #64748b;
  font-size: 0.9rem;
}

.td-actions {
  text-align: right;
  white-space: nowrap;
}

.duration-badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 500;
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  margin-left: 0.35rem;
}

.btn-icon:hover {
  background: #334155;
  color: #f1f5f9;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
}

.modal-card h3 {
  color: #f1f5f9;
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.modal-card p {
  color: #94a3b8;
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-danger-solid {
  padding: 0.55rem 1rem;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-danger-solid:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger-solid:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-top-color: #94a3b8;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
