import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { routesAPI } from '../services/api'
import Navigation from '../components/Navigation'
import RouteDetailsPopup from '../components/RouteDetailsPopup'
import DeleteConfirmationPopup from '../components/DeleteConfirmationPopup'
import ProfilePopup from '../components/ProfilePopup'

const HomePage = () => {
  const [routes, setRoutes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null) // Add selected route for popup
  const [routeToDelete, setRouteToDelete] = useState(null) // For delete confirmation popup
  const [showProfile, setShowProfile] = useState(false) // NEW: For profile popup
  const navigate = useNavigate()
  const { user, logout, isLoggedIn, isGuest } = useUser()

  useEffect(() => {
    loadRoutes()
  }, [])

  // Cleanup edit mode when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setEditMode(false)
    }
  }, [])

  // Reset edit mode when user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      setEditMode(false)
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      setEditMode(false)
    }
  }, [])

  // Auto-exit edit mode when no routes are available to edit
  useEffect(() => {
    if (editMode && routes.length === 0) {
      console.log('🏁 No routes available for editing, automatically exiting edit mode')
      setEditMode(false)
    }
  }, [routes.length, editMode])

  const loadRoutes = async () => {
    setIsLoading(true)
    setError(null)
    
    // NEW: Guests don't have saved routes
    if (isGuest) {
      setRoutes([])
      setIsLoading(false)
      return
    }
    
    try {
      const response = await routesAPI.getRoutes()
      
      if (response.success) {
        // Sort routes - favorites first, then newest
        const sorted = response.routes.sort((a, b) => {
          if (a.favorite && !b.favorite) return -1
          if (!a.favorite && b.favorite) return 1
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        setRoutes(sorted)
      } else {
        throw new Error(response.message || 'Failed to load routes')
      }
    } catch (error) {
      console.error('Error loading routes:', error)
      setError(error.message || 'Failed to load routes')
      
      // Fallback to localStorage for backward compatibility
      try {
        const savedRoutes = localStorage.getItem('orpRoutes')
        if (savedRoutes) {
          const parsedRoutes = JSON.parse(savedRoutes)
          setRoutes(parsedRoutes)
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoute = () => {
    setEditMode(false) // Reset edit mode before navigating
    navigate('/create-route')
  }

  const handleEditRoute = (route) => {
    setSelectedRoute(null) // Close popup
    navigate('/create-route', { state: { editRoute: route } })
  }

  const handleRouteClick = (route) => {
    if (!editMode) {
      setSelectedRoute(route)
    }
  }

  // NEW: Handle profile icon click
  const handleProfileClick = () => {
    setShowProfile(true)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleFavorite = async (routeId, currentFavoriteStatus) => {
    try {
      const response = await routesAPI.toggleFavorite(routeId)
      
      if (response.success) {
        // Update the local state
        setRoutes(prev => {
          const updated = prev.map(route => 
            route._id === routeId 
              ? { ...route, favorite: !currentFavoriteStatus }
              : route
          )
          
          // Sort again: favorites first, then by creation date
          return updated.sort((a, b) => {
            if (a.favorite && !b.favorite) return -1
            if (!a.favorite && b.favorite) return 1
            return new Date(b.createdAt) - new Date(a.createdAt)
          })
        })
      } else {
        throw new Error(response.message || 'Failed to update favorite')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Handle delete button click (shows popup instead of direct deletion)
  const handleDeleteClick = (e, route) => {
    e.stopPropagation()
    setRouteToDelete(route) // Show delete confirmation popup
  }

  // Remove browser confirm dialog, now called from popup
  const deleteRoute = async (routeId) => {
    try {
      const response = await routesAPI.deleteRoute(routeId)
      
      if (response.success) {
        // Remove from local state
        setRoutes(prev => {
          const updatedRoutes = prev.filter(route => route._id !== routeId)
          
          // AUTO EXIT EDIT MODE: If no routes left, automatically exit edit mode
          if (updatedRoutes.length === 0 && editMode) {
            console.log('🏁 No routes remaining, automatically exiting edit mode')
            setEditMode(false)
          }
          
          return updatedRoutes
        })
        
        // Close the delete confirmation popup
        setRouteToDelete(null)
        
      } else {
        throw new Error(response.message || 'Failed to delete route')
      }
    } catch (error) {
      console.error('Error deleting route:', error)
      alert('Failed to delete route')
      setRouteToDelete(null) // Close popup even on error
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Unknown date'
    }
  }

  const formatStats = (stats) => {
    if (!stats) return 'No stats available'
    
    const distance = stats.distance ? 
      `${(stats.distance / 1000).toFixed(2)}km` : 'Unknown distance'
    
    const elevation = stats.netElevationChange !== undefined ? 
      ` • ${stats.netElevationChange >= 0 ? '↗' : '↘'} ${Math.abs(stats.netElevationChange).toFixed(0)}m` : ''
    
    return distance + elevation
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="flex items-center w-full px-5 py-2 bg-orp-blue bg-opacity-50 h-24">
        {/* Left: Navigation */}
        <div className="flex items-center">
          <Navigation />
        </div>

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center items-center ml-36">
          <img 
            src="/images/ORP website logo.png" 
            alt="ORP logo" 
            className="max-w-36 h-auto"
          />
        </div>

        {/* Right: Guest indicator and Profile */}
        <div className="flex items-center gap-5">
          {/* NEW: Guest mode indicator */}
          {isGuest ? (
            <div className="flex items-center gap-3">
              <span className="text-yellow-300 text-sm bg-yellow-600 bg-opacity-20 px-3 py-1 rounded-full">
                👤 Guest Mode
              </span>
              <span className="text-orp-light-blue text-lg">
                Welcome, Guest!
              </span>
            </div>
          ) : (
            <span className="text-orp-light-blue text-lg">
              Welcome, {user?.firstName || user?.email}
            </span>
          )}
          
          {/* Profile icon - only show for registered users */}
          {!isGuest && (
            <i 
              className="fas fa-user text-2xl text-orp-light-blue cursor-pointer hover:scale-110 transition-transform"
              onClick={handleProfileClick}
              title="Profile Settings"
            ></i>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-0.5 bg-orp-blue"></div>

      {/* Main Content */}
      <div className="flex-1 flex flex-row">
        {/* Left Section - Routes List */}
        <div className="flex-1 p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-orp-light-blue text-3xl">My Routes</h2>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditMode(!editMode)
                }}
                className="px-4 py-2 bg-orp-blue bg-opacity-50 text-white rounded border border-white transition-transform hover:scale-105"
              >
                {editMode ? '✅ Done' : '✏️ Edit'}
              </button>
              
              <button
                onClick={loadRoutes}
                disabled={isLoading}
                className="px-4 py-2 bg-orp-blue bg-opacity-50 text-white rounded border border-white transition-transform hover:scale-105 disabled:opacity-50"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Routes Display */}
          {isLoading ? (
            <div className="text-center py-10">
              <div className="text-orp-light-blue text-xl">Loading routes...</div>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="text-red-300 text-xl mb-3">Failed to load routes</div>
              <div className="text-orp-light-blue text-sm">{error}</div>
              <button 
                onClick={loadRoutes}
                className="mt-4 px-4 py-2 bg-orp-blue bg-opacity-50 text-white rounded border border-white"
              >
                Try Again
              </button>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-orp-light-blue text-2xl mb-4">No routes saved yet</div>
              <div className="text-orp-cream text-base mb-6">
                {isGuest ? 
                  'Create an account to save your routes permanently' :
                  'Create your first route to get started'
                }
              </div>
              {!isGuest && (
                <button
                  onClick={handleCreateRoute}
                  className="px-6 py-3 bg-orp-blue bg-opacity-50 text-white rounded border border-white transition-transform hover:scale-105"
                >
                  Create First Route
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((route, index) => (
                <div
                  key={route._id || index}
                  onClick={() => handleRouteClick(route)}
                  className={`bg-orp-blue bg-opacity-50 rounded-lg shadow-md border border-white border-opacity-30 cursor-pointer transition-transform hover:scale-105 relative ${
                    editMode ? 'hover:shadow-lg' : ''
                  }`}
                >
                  {/* Edit Mode Controls */}
                  {editMode && (
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(route._id, route.favorite)
                        }}
                        className={`p-2 rounded-full bg-black bg-opacity-50 transition-all ${
                          route.favorite 
                            ? 'text-yellow-400 hover:scale-120' 
                            : 'text-gray-300 hover:scale-120'
                        }`}
                      >
                        <i className="fas fa-star text-lg"></i>
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, route)}
                        className="p-2 rounded-full bg-black bg-opacity-50 text-red-400 hover:scale-120 transition-all"
                      >
                        <i className="fas fa-trash-alt text-lg"></i>
                      </button>
                    </div>
                  )}

                  {/* Route Preview Image */}
                  <div className="h-36 bg-gradient-to-br from-green-300 to-blue-400 relative">
                    {route.favorite && (
                      <div className="absolute top-2 left-2">
                        <i className="fas fa-star text-yellow-400 text-xl"></i>
                      </div>
                    )}
                  </div>

                  {/* Route Info */}
                  <div className="p-4 text-orp-light-blue">
                    <h3 className="mb-2 text-lg font-semibold">
                      {route.name || `Route ${index + 1}`}
                    </h3>
                    <p className="text-sm text-orp-cream mb-2">
                      {formatStats(route.routeStats)}
                    </p>
                    <p className="text-xs text-orp-light-blue opacity-75">
                      Created: {formatDate(route.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="w-0.5 bg-orp-blue bg-opacity-50 my-5"></div>

        {/* Right Section - Create Route */}
        <div className="flex-1 p-5 flex flex-col justify-center items-center">
          <div className="text-center p-10 bg-orp-blue bg-opacity-50 rounded-lg">
            <h2 className="text-orp-light-blue text-3xl mb-8 font-normal">
              {isGuest ? 
                'Try creating your first route...' : 
                'Create your next perfect adventure...'
              }
            </h2>
            <button
              onClick={handleCreateRoute}
              className="bg-orp-blue bg-opacity-50 text-white px-8 py-4 text-lg rounded-lg border border-white transition-transform hover:scale-110"
            >
              🗺️ Start New Route
            </button>
            
            {isGuest ? (
              <div className="mt-6 text-yellow-300 text-sm">
                ⚠️ Guest mode: Routes can be created but won't be saved
              </div>
            ) : routes.length > 0 ? (
              <div className="mt-6 text-orp-cream text-sm">
                You have {routes.length} saved route{routes.length !== 1 ? 's' : ''}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Route Details Popup */}
      {selectedRoute && (
        <RouteDetailsPopup 
          route={selectedRoute}
          onClose={() => setSelectedRoute(null)}
          onEdit={handleEditRoute}
        />
      )}

      {/* Delete Confirmation Popup */}
      {routeToDelete && (
        <DeleteConfirmationPopup
          route={routeToDelete}
          onConfirm={() => deleteRoute(routeToDelete._id)}
          onCancel={() => setRouteToDelete(null)}
        />
      )}

      {/* Profile Popup - Only for registered users */}
      {showProfile && !isGuest && (
        <ProfilePopup
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}

export default HomePage