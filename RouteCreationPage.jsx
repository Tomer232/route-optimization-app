import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { routesAPI } from '../services/api'
import Navigation from '../components/Navigation'
import GoogleMapsRouteCreator from '../components/GoogleMapsRouteCreator'
import ProfilePopup from '../components/ProfilePopup'
import GuestSignupPopup from '../components/GuestSignupPopup'

const RouteCreationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isGuest } = useUser()
  // ENHANCED: Add debug logging for route name changes
  const [routeName, setRouteName] = useState('')
  const [currentRoute, setCurrentRoute] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [mapKey, setMapKey] = useState(0)
  const [editRouteData, setEditRouteData] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [originalRouteName, setOriginalRouteName] = useState('') // Track original name
  const [showProfile, setShowProfile] = useState(false) // NEW: For profile popup
  const [showGuestSignup, setShowGuestSignup] = useState(false) // NEW: Guest signup popup

  // Force map refresh when component mounts
  useEffect(() => {
    document.body.style.position = ''
    document.body.style.overflow = ''
    setMapKey(prev => prev + 1)
  }, [])

  // Check if we're in edit mode
  useEffect(() => {
    try {
      if (location.state && location.state.editRoute) {
        const routeToEdit = location.state.editRoute
        console.log('Loading route for editing:', routeToEdit)
        
        setEditRouteData(routeToEdit)
        setIsEditMode(true)
        setRouteName(routeToEdit.name || '')
        setOriginalRouteName(routeToEdit.name || '') // Store original name
        
        // Set current route for display
        setCurrentRoute({
          waypoints: [
            routeToEdit.startPoint || { lat: 0, lng: 0 }, 
            routeToEdit.endPoint || { lat: 0, lng: 0 }
          ],
          optimizedPath: routeToEdit.routePoints || [],
          stats: routeToEdit.routeStats || {}
        })
      }
    } catch (error) {
      console.error('Error loading edit route:', error)
      // Reset to normal mode if there's an error
      setEditRouteData(null)
      setIsEditMode(false)
    }
  }, [location.state])

  // Enhanced debugging for route data
  const handleRouteCreated = (routeData) => {
    if (!routeData) {
      // FIXED: Handle map reset - clear current route
      setCurrentRoute(null);
      setSaveStatus(null);
      return;
    }
    
    console.log('🔍 Route Data Received in RouteCreationPage:', routeData)
    console.log('📊 Stats Object:', routeData.stats)
    console.log('📈 Elevation Values:', {
      netElevationChange: routeData.stats?.netElevationChange,
      elevationGain: routeData.stats?.elevationGain,
      elevationLoss: routeData.stats?.elevationLoss,
      distance: routeData.stats?.distance,
      highestPoint: routeData.stats?.highestPoint,
      lowestPoint: routeData.stats?.lowestPoint
    })
    console.log('🗺️ Route Points Sample (first 3):', routeData.optimizedPath?.slice(0, 3))
    
    setCurrentRoute(routeData)
    setSaveStatus(null)
  }

  const handleRouteError = (error) => {
    console.error('Route creation error:', error)
    setSaveStatus({ type: 'error', message: error })
  }

  // NEW: Handle profile icon click with protection
  const handleProfileClick = () => {
    console.log('👤 Profile clicked, current route name:', routeName);
    setShowProfile(true)
  }

  // SUPER PROTECTION: Actively monitor and clear email auto-fill
  useEffect(() => {
    const interval = setInterval(() => {
      if (routeName && user?.email && routeName === user.email) {
        console.log('🚨 Auto-fill detected and cleared:', routeName);
        setRouteName('');
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [routeName, user?.email]);

  // PROTECTION: Clear route name if it gets set to user email
  useEffect(() => {
    if (routeName && user?.email && routeName === user.email) {
      console.log('🚨 Route name was set to user email, clearing it');
      setRouteName('');
    }
  }, [routeName, user?.email]);

  // FIXED: Enhanced debugging for save process with correct API calls
  const saveRoute = async () => {
    // NEW: Check if user is guest
    if (isGuest) {
      setShowGuestSignup(true) // Show signup popup instead of saving
      return
    }

    if (!currentRoute || !routeName.trim()) {
      setSaveStatus({ type: 'error', message: 'Please generate a route and enter a name' })
      return
    }

    setIsSaving(true)
    setSaveStatus(null)

    try {
      console.log('💾 Saving route with data:', {
        name: routeName.trim(),
        startPoint: currentRoute.waypoints?.[0],
        endPoint: currentRoute.waypoints?.[currentRoute.waypoints.length - 1],
        routePoints: currentRoute.optimizedPath,
        routeStats: currentRoute.stats,
        isEditMode
      })

      // Check if route name already exists (but allow current route name in edit mode)
      let finalRouteName = routeName.trim()
      if (!isEditMode || (isEditMode && routeName.trim() !== originalRouteName)) {
        // This is a new route OR editing with a different name
        const existingRoutes = await routesAPI.getRoutes()
        if (existingRoutes.success) {
          const nameExists = existingRoutes.routes.some(route => 
            route.name === routeName.trim() && 
            (!isEditMode || route._id !== editRouteData?._id)
          )
          
          if (nameExists) {
            finalRouteName = `${routeName.trim()} (edited)`
            console.log(`📝 Route name exists, using: ${finalRouteName}`)
          }
        }
      }

      const routeData = {
        name: finalRouteName,
        startPoint: currentRoute.waypoints?.[0],
        endPoint: currentRoute.waypoints?.[currentRoute.waypoints.length - 1],
        routePoints: currentRoute.optimizedPath,
        routeStats: currentRoute.stats,
        userId: user?.id
      }

      let response
      if (isEditMode && editRouteData?._id) {
        console.log('🔄 Updating existing route:', editRouteData._id)
        response = await routesAPI.updateRoute(editRouteData._id, routeData)
      } else {
        console.log('➕ Creating new route')
        // FIXED: Use saveRoute instead of createRoute
        response = await routesAPI.saveRoute(routeData)
      }

      console.log('💾 Save response:', response)

      if (response.success) {
        setSaveStatus({ 
          type: 'success', 
          message: isEditMode ? 
            'Route updated successfully!' : 'Route saved successfully!' 
        })
        
        // Update the route name in the input if (edited) was added
        if (finalRouteName !== routeName.trim()) {
          setRouteName(finalRouteName)
        }
        
        setTimeout(() => {
          navigate('/home')
        }, 2000)
      } else {
        throw new Error(response.message || 'Failed to save route')
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus({ 
        type: 'error', 
        message: error.message || 'Failed to save route' 
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation - FIXED: Removed gear wheel */}
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

        {/* Right: Guest indicator and Profile - FIXED: Removed gear wheel */}
        <div className="flex items-center gap-5">
          {/* NEW: Guest mode indicator */}
          {isGuest ? (
            <div className="flex items-center gap-3">
              <span className="text-yellow-300 text-sm bg-yellow-600 bg-opacity-20 px-3 py-1 rounded-full">
                👤 Guest Mode
              </span>
            </div>
          ) : (
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
        {/* Left Section - Route Controls */}
        <div className="w-80 p-5 border-r border-orp-blue border-opacity-30">
          <form onSubmit={(e) => e.preventDefault()} autoComplete="off">
            <div className="space-y-5">
              
              {/* Route Name Input */}
              <div className="bg-orp-blue bg-opacity-50 p-4 rounded-lg">
                <h3 className="text-orp-light-blue text-xl mb-3">
                  {isEditMode ? 'Edit Route Details' : 'Route Details'}
                </h3>
                <div>
                  <label className="block text-orp-light-blue text-sm mb-2">Route Name</label>
                  <input
                    type="text"
                    style={{ display: 'none' }}
                    autoComplete="username"
                    tabIndex="-1"
                  />
                  <input
                    type="password"
                    style={{ display: 'none' }}
                    autoComplete="current-password"
                    tabIndex="-1"
                  />
                  <input
                    type="text"
                    value={routeName}
                    onChange={(e) => {
                      if (e.target.value.includes('@') && !routeName.includes('@')) {
                        console.log('🚫 Blocked email auto-fill attempt:', e.target.value);
                        return;
                      }
                      setRouteName(e.target.value);
                    }}
                    onInput={(e) => {
                      if (e.target.value === user?.email) {
                        console.log('🚫 Detected email auto-fill, clearing');
                        e.target.value = '';
                        setRouteName('');
                      }
                    }}
                    placeholder="Enter route name..."
                    className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white bg-opacity-90"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name="route-name-field"
                    id="route-name-unique-input"
                    data-form="route-creation"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                {isEditMode && (
                  <div className="mt-2 text-yellow-300 text-sm">
                    ✏️ You are editing an existing route
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-orp-blue bg-opacity-50 p-4 rounded-lg">
                <h3 className="text-orp-light-blue text-xl mb-3">How to Create Route</h3>
                <div className="text-orp-cream text-sm space-y-2">
                  <p>• <strong>Click</strong> on the map to add waypoints (max 5)</p>
                  <p>• <strong>Drag</strong> markers to adjust positions</p>
                  <p>• <strong>Right-click</strong> markers to delete them</p>
                  <p>• <strong>Generate Route</strong> to optimize the path</p>
                  <p>• <strong>Save</strong> your route when satisfied</p>
                </div>
              </div>

              {/* Route Statistics */}
              {currentRoute && (
                <div className="bg-orp-blue bg-opacity-50 p-4 rounded-lg">
                  <h3 className="text-orp-light-blue text-xl mb-3">Route Statistics</h3>
                  <div className="text-orp-cream text-sm space-y-2">
                    <p><strong>Waypoints:</strong> {currentRoute.waypoints?.length || 0}</p>
                    <p><strong>Path Points:</strong> {currentRoute.optimizedPath?.length || 0}</p>
                    <p><strong>Distance:</strong> {((currentRoute.stats?.distance || 0) / 1000).toFixed(2)} km</p>
                    
                    <p><strong>Elevation:</strong> 
                      <span className={
                        currentRoute.stats?.netElevationChange > 0 ? 'text-green-400' : 
                        currentRoute.stats?.netElevationChange < 0 ? 'text-red-400' : 
                        'text-white'
                      }>
                        {currentRoute.stats?.netElevationChange >= 0 ? '+' : ''}{(currentRoute.stats?.netElevationChange || 0).toFixed(2)} m
                      </span>
                    </p>
                    
                    <p><strong>Highest Point:</strong> {(currentRoute.stats?.highestPoint || 0).toFixed(2)} m</p>
                    <p><strong>Lowest Point:</strong> {(currentRoute.stats?.lowestPoint || 0).toFixed(2)} m</p>
                    <p><strong>Elevation Gain:</strong> {(currentRoute.stats?.elevationGain || 0).toFixed(2)} m</p>
                    <p><strong>Elevation Loss:</strong> {(currentRoute.stats?.elevationLoss || 0).toFixed(2)} m</p>
                  </div>
                </div>
              )}

              {/* Save Controls */}
              <div className="space-y-3">
                <button
                  onClick={saveRoute}
                  disabled={!currentRoute || !routeName.trim() || isSaving}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg border border-white 
                             transition-transform hover:scale-105 disabled:opacity-50 
                             disabled:cursor-not-allowed font-semibold"
                >
                  {isSaving ? '💾 Saving...' : (isEditMode ? '💾 Update Route' : '💾 Save Route')}
                </button>

                <button
                  onClick={() => navigate('/home')}
                  className="w-full px-4 py-3 bg-orp-blue bg-opacity-50 text-white rounded-lg border border-white 
                             transition-transform hover:scale-105"
                >
                  ← Back to Home
                </button>
              </div>

              {/* Save Status */}
              {saveStatus && (
                <div className={`p-3 rounded-lg text-center ${
                  saveStatus.type === 'success' 
                    ? 'bg-green-500 bg-opacity-20 text-green-200' 
                    : 'bg-red-500 bg-opacity-20 text-red-200'
                }`}>
                  {saveStatus.message}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Section - Google Maps */}
        <div className="flex-1">
          <GoogleMapsRouteCreator 
            key={mapKey}
            editRouteData={editRouteData}
            onRouteCreated={handleRouteCreated}
            onError={handleRouteError}
            mapKey={mapKey}
            setMapKey={setMapKey}
          />
        </div>
      </div>

      {/* Profile Popup - Only for registered users */}
      {showProfile && !isGuest && (
        <ProfilePopup
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* NEW: Guest Signup Popup */}
      {showGuestSignup && (
        <GuestSignupPopup
          onClose={() => setShowGuestSignup(false)}
          onContinueAsGuest={() => console.log('Guest continues without saving')}
        />
      )}
    </div>
  )
}

export default RouteCreationPage