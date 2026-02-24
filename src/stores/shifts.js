import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { shiftService } from '@/services/shifts'
import projectService from '@/services/projects'
import { useToastStore } from '@/stores/toast'

export const useShiftStore = defineStore('shifts', () => {
  const shifts = ref([])
  const clockSessions = ref([])
  const projects = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const activeClockSession = ref(null)
  const clockLoading = ref(false)

  const shiftCount = computed(() => shifts.value.length)
  const isClockedIn = computed(() => !!activeClockSession.value)

  /**
   * Next planned shift for the given user (start_time >= now), or null.
   * Used to suggest a project when clocking in.
   */
  function getSuggestedClockInShift(userId) {
    if (!userId) return null
    const now = new Date()
    const upcoming = shifts.value
      .filter((s) => s.user_id === userId && new Date(s.start_time) >= now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    return upcoming[0] || null
  }

  async function fetchShifts() {
    loading.value = true
    try {
      shifts.value = await shiftService.list()
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load shifts')
    } finally {
      loading.value = false
    }
  }

  async function fetchProjects() {
    try {
      const response = await projectService.list()
      projects.value = response.data
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load projects')
    }
  }

  async function getShift(id) {
    try {
      return await shiftService.get(id)
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load shift')
      return null
    }
  }

  async function createShift(data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const shift = await shiftService.create(data)
      shifts.value.push(shift)
      toast.success('Shift created successfully')
      return shift
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create shift')
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateShift(id, data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const updated = await shiftService.update(id, data)
      const idx = shifts.value.findIndex((s) => s.id === id)
      if (idx !== -1) shifts.value[idx] = updated
      toast.success('Shift updated successfully')
      return updated
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update shift')
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteShift(id) {
    const toast = useToastStore()
    try {
      await shiftService.remove(id)
      shifts.value = shifts.value.filter((s) => s.id !== id)
      toast.success('Shift deleted')
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete shift')
      return false
    }
  }

  async function fetchClockSessions(params = {}) {
    loading.value = true
    try {
      clockSessions.value = await shiftService.listClockSessions(params)
      syncActiveClockSessionFromSessions()
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load clock sessions')
      clockSessions.value = []
      activeClockSession.value = null
    } finally {
      loading.value = false
    }
  }

  function syncActiveClockSessionFromSessions() {
    const inProgress = clockSessions.value.find((s) => !s.end_time)
    activeClockSession.value = inProgress || null
  }

  async function fetchActiveClockSession(userId) {
    try {
      activeClockSession.value = await shiftService.getActive(userId)
    } catch (err) {
      activeClockSession.value = null
    }
  }

  /** Clock in: creates a clock session only (actual work). Does not create a shift (planned work). */
  async function clockIn(userId, projectId, shiftId = null) {
    const toast = useToastStore()
    clockLoading.value = true
    try {
      const payload = { user_id: userId, project_id: projectId }
      if (shiftId) payload.shift_id = shiftId
      const session = await shiftService.clockIn(payload)
      activeClockSession.value = session
      clockSessions.value = [session, ...clockSessions.value]
      toast.success('Clocked in successfully')
      return session
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to clock in')
      return null
    } finally {
      clockLoading.value = false
    }
  }

  async function clockOut(userId) {
    const toast = useToastStore()
    clockLoading.value = true
    try {
      const session = await shiftService.clockOut({ user_id: userId })
      const idx = clockSessions.value.findIndex((s) => s.id === session.id)
      if (idx !== -1) clockSessions.value[idx] = session
      syncActiveClockSessionFromSessions()
      toast.success('Clocked out successfully')
      return session
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to clock out')
      return null
    } finally {
      clockLoading.value = false
    }
  }

  return {
    shifts,
    clockSessions,
    projects,
    loading,
    saving,
    activeClockSession,
    clockLoading,
    shiftCount,
    isClockedIn,
    getSuggestedClockInShift,
    fetchShifts,
    fetchClockSessions,
    fetchProjects,
    getShift,
    createShift,
    updateShift,
    deleteShift,
    fetchActiveClockSession,
    clockIn,
    clockOut,
  }
})
