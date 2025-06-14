import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const RouteDetailsPopup = ({ route, onClose, onEdit }) => {
  const navigate = useNavigate()
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDownloadOptions && !event.target.closest('.download-dropdown')) {
        setShowDownloadOptions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDownloadOptions])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!route) return null

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown date'
    }
  }

  const formatDistance = (meters) => {
    if (!meters) return '0 km'
    return (meters / 1000).toFixed(2) + ' km'
  }

  // UPDATED: Format elevation with 2 decimal places
  const formatElevation = (meters) => {
    if (!meters) return '0.00 m'
    return meters.toFixed(2) + ' m'
  }

  // UPDATED: Format net elevation change with +/- sign and 2 decimals
  const formatNetElevation = (meters) => {
    if (!meters) return '0.00 m'
    const sign = meters >= 0 ? '+' : ''
    return sign + meters.toFixed(2) + ' m'
  }

  const generateGPX = () => {
    const routePoints = route.routePoints || route.elevationData || []
    
    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ORP Route Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <n>${route.name}</n>
    <desc>Route created with ORP Route Planner</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <n>${route.name}</n>
    <desc>Distance: ${formatDistance(route.routeStats?.distance)} | Elevation Gain: ${formatElevation(route.routeStats?.elevationGain)}</desc>
    <trkseg>`

    const gpxPoints = routePoints.map(point => {
      const elevation = point.elevation ? `<ele>${point.elevation.toFixed(1)}</ele>` : ''
      return `      <trkpt lat="${point.lat.toFixed(7)}" lon="${point.lng.toFixed(7)}">
        ${elevation}
      </trkpt>`
    }).join('\n')

    const gpxFooter = `    </trkseg>
  </trk>
</gpx>`

    return gpxHeader + '\n' + gpxPoints + '\n' + gpxFooter
  }

  const downloadGPX = () => {
    try {
      const gpxContent = generateGPX()
      const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${route.name.replace(/[^a-z0-9]/gi, '_')}.gpx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setShowDownloadOptions(false) // Close dropdown after download
    } catch (error) {
      console.error('Error generating GPX:', error)
      alert('Failed to download route file')
    }
  }

  const downloadJSON = () => {
    try {
      const routeData = {
        name: route.name,
        createdAt: route.createdAt,
        routePoints: route.routePoints || route.elevationData || [],
        statistics: route.routeStats,
        startPoint: route.startPoint,
        endPoint: route.endPoint
      }
      
      const blob = new Blob([JSON.stringify(routeData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${route.name.replace(/[^a-z0-9]/gi, '_')}_data.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setShowDownloadOptions(false) // Close dropdown after download
    } catch (error) {
      console.error('Error generating JSON:', error)
      alert('Failed to download route data')
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(route)
    } else {
      // Navigate to edit page with route data
      navigate('/create-route', { state: { editRoute: route } })
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-orp-blue bg-opacity-95 rounded-lg shadow-2xl border border-white border-opacity-30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white border-opacity-20">
          <h2 className="text-2xl font-bold text-orp-light-blue">{route.name}</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-300 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Route Statistics - UPDATED with proper formatting */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
              <div className="text-orp-cream text-sm">Distance</div>
              <div className="text-white text-xl font-semibold">
                {formatDistance(route.routeStats?.distance)}
              </div>
            </div>
            
            <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
              <div className="text-orp-cream text-sm">Elevation</div>
              <div className={`text-xl font-semibold ${
                route.routeStats?.netElevationChange > 0 ? 'text-green-400' : 
                route.routeStats?.netElevationChange < 0 ? 'text-red-400' : 
                'text-white'
              }`}>
                {formatNetElevation(route.routeStats?.netElevationChange || route.routeStats?.elevationGain)}
              </div>
            </div>
            
            <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
              <div className="text-orp-cream text-sm">Highest Point</div>
              <div className="text-white text-xl font-semibold">
                {formatElevation(route.routeStats?.highestPoint)}
              </div>
            </div>
            
            <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
              <div className="text-orp-cream text-sm">Lowest Point</div>
              <div className="text-white text-xl font-semibold">
                {formatElevation(route.routeStats?.lowestPoint)}
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="space-y-4">
            <h3 className="text-orp-light-blue text-lg font-semibold">Route Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black bg-opacity-20 p-4 rounded-lg">
                <div className="text-orp-cream text-sm mb-1">Created</div>
                <div className="text-white">{formatDate(route.createdAt)}</div>
              </div>
              
              <div className="bg-black bg-opacity-20 p-4 rounded-lg">
                <div className="text-orp-cream text-sm mb-1">Route Points</div>
                <div className="text-white">
                  {(route.routePoints?.length || route.elevationData?.length || 0)} points
                </div>
              </div>
              
              <div className="bg-black bg-opacity-20 p-4 rounded-lg">
                <div className="text-orp-cream text-sm mb-1">Start Coordinates</div>
                <div className="text-white text-xs">
                  {route.startPoint?.lat.toFixed(6)}, {route.startPoint?.lng.toFixed(6)}
                </div>
              </div>
              
              <div className="bg-black bg-opacity-20 p-4 rounded-lg">
                <div className="text-orp-cream text-sm mb-1">End Coordinates</div>
                <div className="text-white text-xs">
                  {route.endPoint?.lat.toFixed(6)}, {route.endPoint?.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </div>

          {/* Route Status */}
          <div className="flex items-center justify-between bg-black bg-opacity-20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-orp-cream">Status:</div>
              <div className="flex items-center gap-2">
                {route.favorite && (
                  <span className="text-yellow-400">
                    <i className="fas fa-star"></i> Favorite
                  </span>
                )}
                <span className="text-green-400">
                  <i className="fas fa-check-circle"></i> Saved
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - REMOVED Close Button */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-white border-opacity-20">
          
          {/* Download Button with Dropdown */}
          <div className="relative flex-1 download-dropdown">
            <button
              onClick={() => setShowDownloadOptions(!showDownloadOptions)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              📁 Download
              <span className={`transform transition-transform ${showDownloadOptions ? 'rotate-180' : 'rotate-0'}`}>
                ▼
              </span>
            </button>

            {/* Download Options Dropdown */}
            {showDownloadOptions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden z-10">
                <button
                  onClick={downloadGPX}
                  className="w-full px-4 py-3 text-left text-gray-800 hover:bg-gray-100 transition-colors border-b border-gray-200"
                >
                  📍 Download as GPX
                  <div className="text-xs text-gray-500">GPS Exchange Format</div>
                </button>
                <button
                  onClick={downloadJSON}
                  className="w-full px-4 py-3 text-left text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  📄 Download as JSON
                  <div className="text-xs text-gray-500">Route Data File</div>
                </button>
              </div>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={handleEdit}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            ✏️ Edit Route
          </button>

          {/* REMOVED: Close Button - only X in header now */}
        </div>
      </div>
    </div>
  )
}

export default RouteDetailsPopup