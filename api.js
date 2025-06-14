import axios from 'axios'

// Get API base URL from environment variables
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

// Create axios instance with base URL
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orpToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('orpToken')
      localStorage.removeItem('orpUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API functions
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  // NEW: Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData)
    return response.data
  },

  // NEW: Change password
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData)
    return response.data
  },

  // NEW: Get user statistics
  getStats: async () => {
    const response = await api.get('/auth/stats')
    return response.data
  }
}

export const routesAPI = {
  // Get all routes for user
  getRoutes: async () => {
    const response = await api.get('/routes')
    return response.data
  },

  // Save new route
  saveRoute: async (routeData) => {
    const response = await api.post('/routes', routeData)
    return response.data
  },

  // Update existing route
  updateRoute: async (routeId, routeData) => {
    const response = await api.put(`/routes/${routeId}`, routeData)
    return response.data
  },

  // Toggle favorite
  toggleFavorite: async (routeId) => {
    const response = await api.put(`/routes/${routeId}/favorite`)
    return response.data
  },

  // Delete route
  deleteRoute: async (routeId) => {
    const response = await api.delete(`/routes/${routeId}`)
    return response.data
  }
}

export default api