import api from './api'

export const userService = {
  async list() {
    const response = await api.get('/users/')
    return response.data
  },

  async get(id) {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/users/', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.patch(`/users/${id}`, data)
    return response.data
  },

  async delete(id) {
    await api.delete(`/users/${id}`)
  },

  async listJoinRequests() {
    const response = await api.get('/users/join-requests')
    return response.data
  },

  async approveJoinRequest(id) {
    const response = await api.post(`/users/join-requests/${id}/approve`)
    return response.data
  },

  async rejectJoinRequest(id) {
    await api.post(`/users/join-requests/${id}/reject`)
  },
}
