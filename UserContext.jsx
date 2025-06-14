import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api.js'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false) // NEW: Guest mode state

  useEffect(() => {
    // Check if user is logged in by checking for token and validating it
    const checkAuth = async () => {
      const token = localStorage.getItem('orpToken')
      const guestMode = localStorage.getItem('orpGuestMode')
      
      if (guestMode === 'true') {
        // User is in guest mode
        setIsGuest(true)
        setUser({ 
          id: 'guest', 
          email: 'guest@example.com', 
          firstName: 'Guest', 
          lastName: 'User' 
        })
      } else if (token) {
        try {
          const response = await authAPI.getMe()
          if (response.success) {
            setUser(response.user)
            setIsGuest(false)
          } else {
            // Invalid token, remove it
            localStorage.removeItem('orpToken')
            localStorage.removeItem('orpUser')
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          localStorage.removeItem('orpToken')
          localStorage.removeItem('orpUser')
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password)
      
      if (response.success) {
        // Store token and user data
        localStorage.setItem('orpToken', response.token)
        localStorage.setItem('orpUser', JSON.stringify(response.user))
        localStorage.removeItem('orpGuestMode') // Clear guest mode
        setUser(response.user)
        setIsGuest(false)
        return response.user
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw new Error(error.response?.data?.message || error.message || 'Login failed')
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      
      if (response.success) {
        // Store token and user data
        localStorage.setItem('orpToken', response.token)
        localStorage.setItem('orpUser', JSON.stringify(response.user))
        localStorage.removeItem('orpGuestMode') // Clear guest mode
        setUser(response.user)
        setIsGuest(false)
        return response.user
      } else {
        throw new Error(response.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw new Error(error.response?.data?.message || error.message || 'Registration failed')
    }
  }

  // NEW: Guest mode login
  const loginAsGuest = () => {
    localStorage.setItem('orpGuestMode', 'true')
    localStorage.removeItem('orpToken') // Clear any existing tokens
    localStorage.removeItem('orpUser')
    setIsGuest(true)
    setUser({ 
      id: 'guest', 
      email: 'guest@example.com', 
      firstName: 'Guest', 
      lastName: 'User' 
    })
  }

  // Add updateUser function
  const updateUser = (updatedUserData) => {
    if (isGuest) {
      // Guests can't update profile
      return
    }
    const newUser = { ...user, ...updatedUserData }
    setUser(newUser)
    // Also update localStorage to keep it in sync
    localStorage.setItem('orpUser', JSON.stringify(newUser))
  }

  const logout = () => {
    localStorage.removeItem('orpToken')
    localStorage.removeItem('orpUser')
    localStorage.removeItem('orpGuestMode')
    setUser(null)
    setIsGuest(false)
  }

  const isLoggedIn = () => {
    return user !== null // This includes both registered users and guests
  }

  const isRegisteredUser = () => {
    return user !== null && !isGuest
  }

  const value = {
    user,
    login,
    register,
    logout,
    isLoggedIn,
    isLoading,
    updateUser,
    isGuest, // NEW: Guest mode indicator
    loginAsGuest, // NEW: Guest login function
    isRegisteredUser // NEW: Check if user is registered (not guest)
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}