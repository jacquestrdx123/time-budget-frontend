<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Timeline</h1>
          <p>View tasks and {{ settingsStore.projectDescriptionPlural.toLowerCase() }} on a timeline.</p>
        </div>
        <div class="header-controls">
          <div class="view-toggle">
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode === 'week' }"
              @click="viewMode = 'week'"
            >
              Week
            </button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: viewMode === 'month' }"
              @click="viewMode = 'month'"
            >
              Month
            </button>
          </div>
          <div class="header-date">
            <button type="button" class="date-btn" @click="prev">&larr;</button>
            <span class="date-display">{{ headerLabel }}</span>
            <button type="button" class="date-btn" @click="next">&rarr;</button>
            <button v-if="!isCurrent" type="button" class="date-btn today-btn" @click="goToday">Today</button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        Loading...
      </div>

      <div v-else class="timeline-layout">
        <div class="timeline-left">
          <div class="timeline-row timeline-row-header">
            <span class="row-label">Name</span>
          </div>
          <template v-for="row in scheduledRows" :key="row.key">
            <div class="timeline-row" :class="{ 'row-project': row.type === 'project', 'row-task': row.type === 'task' }">
              <span class="row-label" :class="{ indent: row.type === 'task' }">{{ row.label }}</span>
            </div>
          </template>
          <div v-if="unscheduledRows.length > 0" class="unscheduled-section">
            <div class="timeline-row timeline-row-header unscheduled-header">
              <span class="row-label">Unscheduled</span>
            </div>
            <template v-for="row in unscheduledRows" :key="row.key">
              <div class="timeline-row" :class="{ 'row-project': row.type === 'project', 'row-task': row.type === 'task' }">
                <span class="row-label" :class="{ indent: row.type === 'task' }">{{ row.label }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="timeline-right">
          <div class="timeline-grid-header" :style="{ width: (dayColumns.length * 72) + 'px' }">
            <div
              v-for="day in dayColumns"
              :key="day.dateStr"
              class="day-cell"
            >
              {{ day.label }}
            </div>
          </div>
          <div class="timeline-grid-body" :style="{ width: (dayColumns.length * 72) + 'px' }">
            <template v-for="row in scheduledRows" :key="row.key">
              <div class="timeline-bar-row">
                <div
                  v-if="row.bar"
                  class="timeline-bar"
                  :style="{
                    left: row.bar.left + '%',
                    width: row.bar.width + '%',
                    backgroundColor: row.bar.color,
                  }"
                  :title="row.bar.title"
                >
                  <span v-if="row.bar.width >= 8" class="bar-label">{{ row.label }}</span>
                </div>
              </div>
            </template>
            <template v-if="unscheduledRows.length > 0">
              <div class="unscheduled-spacer"></div>
              <template v-for="row in unscheduledRows" :key="row.key">
                <div class="timeline-bar-row">
                  <!-- no bar for unscheduled -->
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import projectService from '@/services/projects'
import { taskService } from '@/services/tasks'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6', '#e11d48', '#84cc16',
]

function projectColor(id) {
  return PALETTE[id % PALETTE.length]
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default {
  name: 'TimelineView',
  components: { NavBar },
  setup() {
    const settingsStore = useSettingsStore()
    const toast = useToastStore()

    const projects = ref([])
    const tasks = ref([])
    const loading = ref(true)
    const viewMode = ref('week')
    const selectedDate = ref(stripTime(new Date()))

    const rangeStart = computed(() => {
      const d = new Date(selectedDate.value)
      if (viewMode.value === 'week') {
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        d.setDate(diff)
      } else {
        d.setDate(1)
      }
      return stripTime(d).getTime()
    })

    const rangeEnd = computed(() => {
      const d = new Date(rangeStart.value)
      if (viewMode.value === 'week') {
        d.setDate(d.getDate() + 6)
      } else {
        d.setMonth(d.getMonth() + 1)
        d.setDate(0)
      }
      return stripTime(d).getTime()
    })

    const totalDays = computed(() => Math.round((rangeEnd.value - rangeStart.value) / 86400000) + 1)

    const dayColumns = computed(() => {
      const cols = []
      const start = new Date(rangeStart.value)
      for (let i = 0; i < totalDays.value; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        cols.push({
          dateStr: toDateStr(d),
          label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        })
      }
      return cols
    })

    function barForItem(item, type, label, projectId) {
      const startDate = item.start_date ? stripTime(new Date(item.start_date)).getTime() : null
      const endDate = item.end_date ? stripTime(new Date(item.end_date)).getTime() : null
      if (!startDate && !endDate) return null
      const start = startDate || endDate
      const end = endDate || startDate
      const rangeLen = rangeEnd.value - rangeStart.value
      const clipStart = Math.max(start, rangeStart.value)
      const clipEnd = Math.min(end, rangeEnd.value)
      if (clipStart > clipEnd) return null
      const left = ((clipStart - rangeStart.value) / rangeLen) * 100
      const width = Math.max(((clipEnd - clipStart) / rangeLen) * 100, 100 / totalDays.value)
      const color = type === 'project' ? projectColor(item.id) : (projectId ? projectColor(projectId) : '#64748b')
      return { left, width, color, title: label }
    }

    const scheduledRows = computed(() => {
      const rows = []
      let key = 0
      const projectMap = {}
      for (const p of projects.value) {
        projectMap[p.id] = p
      }
      const tasksByProject = {}
      for (const t of tasks.value) {
        if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = []
        tasksByProject[t.project_id].push(t)
      }

      for (const project of projects.value) {
        const hasProjectDates = project.start_date || project.end_date
        const projectTasks = tasksByProject[project.id] || []
        const hasAnyTaskDates = projectTasks.some(t => t.start_date || t.end_date)
        if (!hasProjectDates && !hasAnyTaskDates) continue

        rows.push({
          key: 'p-' + project.id,
          type: 'project',
          label: project.name,
          item: project,
          bar: barForItem(project, 'project', project.name, project.id),
        })
        key++

        for (const task of projectTasks) {
          if (!task.start_date && !task.end_date) continue
          rows.push({
            key: 't-' + task.id,
            type: 'task',
            label: task.title,
            item: task,
            bar: barForItem(task, 'task', task.title, task.project_id),
          })
        }
      }
      return rows
    })

    const unscheduledRows = computed(() => {
      const rows = []
      const projectMap = {}
      for (const p of projects.value) {
        projectMap[p.id] = p
      }
      const tasksByProject = {}
      for (const t of tasks.value) {
        if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = []
        tasksByProject[t.project_id].push(t)
      }

      for (const project of projects.value) {
        if (project.start_date || project.end_date) continue
        const projectTasks = tasksByProject[project.id] || []
        const allTaskUnscheduled = projectTasks.every(t => !t.start_date && !t.end_date)
        if (projectTasks.length === 0 || allTaskUnscheduled) {
          rows.push({ key: 'up-' + project.id, type: 'project', label: project.name })
        }
        for (const task of projectTasks) {
          if (!task.start_date && !task.end_date) {
            rows.push({ key: 'ut-' + task.id, type: 'task', label: task.title })
          }
        }
      }
      return rows
    })

    const headerLabel = computed(() => {
      const start = new Date(rangeStart.value)
      const end = new Date(rangeEnd.value)
      if (viewMode.value === 'week') {
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' – ' +
          end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    })

    const isCurrent = computed(() => {
      const now = stripTime(new Date()).getTime()
      return now >= rangeStart.value && now <= rangeEnd.value
    })

    function prev() {
      const d = new Date(selectedDate.value)
      if (viewMode.value === 'week') d.setDate(d.getDate() - 7)
      else d.setMonth(d.getMonth() - 1)
      selectedDate.value = d
    }

    function next() {
      const d = new Date(selectedDate.value)
      if (viewMode.value === 'week') d.setDate(d.getDate() + 7)
      else d.setMonth(d.getMonth() + 1)
      selectedDate.value = d
    }

    function goToday() {
      selectedDate.value = stripTime(new Date())
    }

    onMounted(async () => {
      loading.value = true
      try {
        const [projectRes, taskRes] = await Promise.allSettled([
          projectService.list(),
          taskService.list(),
        ])
        if (projectRes.status === 'fulfilled') {
          projects.value = projectRes.value.data
        } else {
          toast.error('Failed to load projects')
        }
        if (taskRes.status === 'fulfilled') {
          tasks.value = taskRes.value
        } else {
          toast.error('Failed to load tasks')
        }
      } finally {
        loading.value = false
      }
    })

    return {
      settingsStore,
      loading,
      viewMode,
      headerLabel,
      isCurrent,
      dayColumns,
      scheduledRows,
      unscheduledRows,
      prev,
      next,
      goToday,
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-toggle {
  display: flex;
  border: 1px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  background: #1e293b;
  border: none;
  color: #94a3b8;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #3b82f6;
  color: white;
}

.toggle-btn:hover:not(.active) {
  background: #334155;
  color: #e2e8f0;
}

.header-date {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.date-btn {
  padding: 0.5rem 0.75rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.date-btn:hover {
  background: #334155;
  border-color: #475569;
}

.today-btn {
  margin-left: 0.5rem;
  color: #3b82f6;
}

.date-display {
  min-width: 180px;
  text-align: center;
  font-size: 0.95rem;
  color: #f1f5f9;
  font-weight: 500;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem;
  color: #94a3b8;
  font-size: 0.95rem;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-top-color: #94a3b8;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.timeline-layout {
  display: flex;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  overflow: hidden;
  min-height: 300px;
}

.timeline-left {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
}

.timeline-row {
  min-height: 36px;
  padding: 0.4rem 0.75rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #334155;
  font-size: 0.88rem;
}

.timeline-row:last-child {
  border-bottom: none;
}

.timeline-row-header {
  background: #0f172a;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.timeline-row-header.unscheduled-header {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #475569;
}

.row-label {
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-label.indent {
  padding-left: 1.25rem;
  color: #cbd5e1;
}

.row-project .row-label {
  font-weight: 600;
  color: #f1f5f9;
}

.unscheduled-section .row-label {
  color: #64748b;
}

.timeline-right {
  flex: 1;
  overflow-x: auto;
  min-width: 0;
}

.timeline-grid-header {
  display: flex;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  min-width: min-content;
}

.day-cell {
  min-width: 72px;
  width: 72px;
  padding: 0.4rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: center;
}

.timeline-grid-body {
  min-width: min-content;
}

.timeline-bar-row {
  min-height: 36px;
  height: 36px;
  border-bottom: 1px solid #334155;
  position: relative;
  min-width: min-content;
}

.timeline-bar-row:last-child {
  border-bottom: none;
}

.timeline-bar {
  position: absolute;
  top: 6px;
  height: 24px;
  border-radius: 6px;
  min-width: 4px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  box-sizing: border-box;
}

.bar-label {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unscheduled-spacer {
  min-height: 12px;
  height: 12px;
  background: #1e293b;
}

.timeline-bar-row:empty {
  min-height: 36px;
}
</style>
