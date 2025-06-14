import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import MarkerLimitPopup from './MarkerLimitPopup';

// BULLETPROOF APPROACH: Use global script loading instead of LoadScript
const loadGoogleMapsScript = (apiKey) => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    if (window.googleMapsLoading) {
      // Wait for existing loading to complete
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      return;
    }

    window.googleMapsLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      window.googleMapsLoading = false;
      resolve();
    };
    
    script.onerror = () => {
      window.googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
};

const GoogleMapsRouteCreator = ({ onRouteCreated, onError, editRouteData = null, mapKey, setMapKey }) => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [originalRoutePath, setOriginalRoutePath] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [routeStats, setRouteStats] = useState(null);
  const elevationService = useRef(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [allowedAreaCenter, setAllowedAreaCenter] = useState(null);
  const [rangeWarning, setRangeWarning] = useState(null);
  const [showMarkerLimitPopup, setShowMarkerLimitPopup] = useState(false);
  
  // FORCE REFRESH KEY: Add a refresh counter to force re-render of polylines
  const [polylineKey, setPolylineKey] = useState(0);
  
  // BULLETPROOF: Enhanced loading states
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '500px'
  };

  const center = {
    lat: 32.713377762147665,
    lng: 34.97913820047218
  };

  const mapOptions = {
    zoom: 14,
    mapTypeId: 'terrain',
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    disableDefaultUI: false
  };

  const markerColors = [
    'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/purple-dot.png'
  ];

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // BULLETPROOF: Aggressive script loading on mount
  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      if (!apiKey) {
        setLoadError('Google Maps API key is missing. Please check your environment variables.');
        setIsInitializing(false);
        return;
      }

      try {
        console.log('🚀 Starting Google Maps initialization...');
        setIsInitializing(true);
        setLoadError(null);

        await loadGoogleMapsScript(apiKey);
        
        if (mounted) {
          console.log('✅ Google Maps script loaded successfully');
          setIsScriptLoaded(true);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('❌ Failed to load Google Maps:', error);
        if (mounted) {
          setLoadError('Failed to load Google Maps. Please check your internet connection and try again.');
          setIsInitializing(false);
          
          // Auto-retry after 2 seconds
          setTimeout(() => {
            if (mounted) {
              initializeMap();
            }
          }, 2000);
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
    };
  }, [apiKey]);

  // BULLETPROOF: Load edit route data only when everything is ready
  useEffect(() => {
    if (editRouteData && map && isScriptLoaded && isMapLoaded) {
      console.log('🔄 Loading existing route in edit mode:', editRouteData);
      loadExistingRoute(editRouteData);
    }
  }, [editRouteData, map, isScriptLoaded, isMapLoaded]);

  useEffect(() => {
    if (rangeWarning) {
      const timer = setTimeout(() => setRangeWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [rangeWarning]);

  const loadExistingRoute = (routeData) => {
    if (!routeData) return;
    try {
      console.log('📍 Setting up edit mode with route data:', routeData);
      setIsEditMode(true);
      const waypoints = [];

      if (routeData.startPoint) {
        waypoints.push({ id: Date.now(), position: routeData.startPoint, index: 0 });
        setAllowedAreaCenter(routeData.startPoint);
      }
      if (routeData.endPoint) {
        waypoints.push({ id: Date.now() + 1, position: routeData.endPoint, index: 1 });
      }

      setMarkers(waypoints);
      if (routeData.routePoints) setOriginalRoutePath(routeData.routePoints);
      if (routeData.routeStats) setRouteStats(routeData.routeStats);
      
      if (routeData.startPoint && map) {
        console.log('🎯 Centering map on start point:', routeData.startPoint);
        setTimeout(() => {
          map.setCenter(routeData.startPoint);
          map.setZoom(14);
        }, 100);
      }
    } catch (error) {
      console.error('Error loading route:', error);
    }
  };

  // BULLETPROOF: Enhanced onMapLoad
  const onMapLoad = useCallback((mapInstance) => {
    console.log('🗺️ Map instance loaded successfully');
    setMap(mapInstance);
    setIsMapLoaded(true);
    
    // Initialize elevation service
    try {
      if (window.google?.maps?.ElevationService) {
        elevationService.current = new window.google.maps.ElevationService();
        console.log('📈 Elevation service initialized');
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize elevation service:', error);
    }
    
    setLoadError(null);
  }, []);

  const haversineDistance = (pos1, pos2) => {
    const R = 6371e3;
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const isWithinAllowedRange = (newPoint) => {
    if (!allowedAreaCenter) return true;
    return haversineDistance(allowedAreaCenter, newPoint) <= 10000;
  };

  const onMapClick = useCallback((event) => {
    if (!isScriptLoaded || !isMapLoaded) {
      console.warn('⚠️ Map not fully loaded yet, ignoring click');
      return;
    }

    if (markers.length >= 5) {
      setShowMarkerLimitPopup(true);
      return;
    }

    const newPosition = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    
    if (markers.length === 0) {
      setAllowedAreaCenter(newPosition);
    } else if (!isWithinAllowedRange(newPosition)) {
      setRangeWarning({ 
        message: 'Point is outside the 10km allowed area. Please place your point within the allowed range.', 
        type: 'warning' 
      });
      return;
    }

    const newMarker = {
      id: Date.now(),
      position: newPosition,
      index: markers.length
    };

    setMarkers(prev => [...prev, newMarker]);
    setRoutePath([]);
    setRouteStats(null);
    setRangeWarning(null);
  }, [markers.length, allowedAreaCenter, isScriptLoaded, isMapLoaded]);

  const onMarkerRightClick = useCallback((markerId) => {
    const markerToRemove = markers.find(marker => marker.id === markerId);
    const isRemovingFirst = markerToRemove?.index === 0;
    
    const remainingMarkers = markers.filter(marker => marker.id !== markerId);
    const reindexedMarkers = remainingMarkers.map((marker, index) => ({
      ...marker,
      index
    }));
    
    setMarkers(reindexedMarkers);

    if (reindexedMarkers.length === 0) {
      setAllowedAreaCenter(null);
    } else if (isRemovingFirst) {
      setAllowedAreaCenter(reindexedMarkers[0].position);
    }

    setRoutePath([]);
    setRouteStats(null);
    setRangeWarning(null);
    // FIXED: DON'T exit edit mode when removing markers - stay in edit mode
    // setIsEditMode(false); // REMOVED - keep edit mode active
  }, [markers]);

  const onMarkerDragEnd = useCallback((markerId, event) => {
    if (!isScriptLoaded || !isMapLoaded) return;

    const newPosition = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    const markerIndex = markers.findIndex(marker => marker.id === markerId);
    const isDraggingFirst = markerIndex === 0;

    if (isDraggingFirst) {
      const others = markers.filter(m => m.id !== markerId);
      const wouldExceed = others.some(m => haversineDistance(newPosition, m.position) > 10000);
      if (wouldExceed) {
        setRangeWarning({ 
          message: 'Cannot move the center point here as it would place other markers outside the 10km range.', 
          type: 'warning' 
        });
        return;
      }
      setAllowedAreaCenter(newPosition);
    } else if (!isWithinAllowedRange(newPosition)) {
      setRangeWarning({ 
        message: 'Cannot move marker outside the 10km allowed area.', 
        type: 'warning' 
      });
      return;
    }

    setMarkers(prev => prev.map(m => m.id === markerId ? { ...m, position: newPosition } : m));
    setRoutePath([]);
    setRouteStats(null);
    setRangeWarning(null);
  }, [markers, allowedAreaCenter, isScriptLoaded, isMapLoaded]);

  const generateRoute = async () => {
    if (markers.length < 2) {
      alert('Add at least 2 points to create a route');
      return;
    }

    setIsProcessing(true);
    
    try {
      setRoutePath([]);
      setRouteStats(null);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const detailedPath = await createDetailedPath(markers.map(m => m.position));
      setRoutePath(detailedPath);
      const elevationData = await getElevationData(detailedPath);
      const stats = calculateRouteStats(detailedPath, elevationData);
      setRouteStats(stats);
      onRouteCreated?.({
        waypoints: markers.map(m => m.position),
        optimizedPath: elevationData.length > 0 ? elevationData : detailedPath,
        stats
      });
    } catch (error) {
      console.error('Route generation failed:', error);
      onError?.('Failed to generate route');
      setRoutePath([]);
      setRouteStats(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetMap = () => {
    console.log('🧹 Resetting map - clearing all elements');
    
    // AGGRESSIVE CLEAR: Force state updates with delays to ensure rendering
    setMarkers([]);
    setRoutePath([]);
    setOriginalRoutePath([]);
    setRouteStats(null);
    setAllowedAreaCenter(null);
    setRangeWarning(null);
    // FIXED: DON'T exit edit mode when resetting - stay in edit mode if we were editing
    // setIsEditMode(false); // REMOVED - preserve edit mode state
    
    // FORCE POLYLINE RE-RENDER: Change key to force complete re-render
    setPolylineKey(prev => prev + 1);
    
    // FORCE RE-RENDER: Add a small delay to ensure state updates are processed
    setTimeout(() => {
      setRoutePath([]);
      setOriginalRoutePath([]);
      setPolylineKey(prev => prev + 1);
      console.log('🔄 Force cleared route paths');
    }, 50);
    
    // DOUBLE CHECK: Another force clear after a longer delay
    setTimeout(() => {
      setRoutePath([]);
      setOriginalRoutePath([]);
      setPolylineKey(prev => prev + 1);
      console.log('🔄 Double force cleared route paths');
    }, 200);
    
    // Notify parent component that route is cleared
    if (onRouteCreated) {
      onRouteCreated(null);
    }
  };

  const createDetailedPath = async (waypoints) => {
    if (waypoints.length < 2) return waypoints;
    const detailed = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      const interpolated = interpolatePoints(start, end, 50);
      detailed.push(...interpolated);
    }
    return detailed;
  };

  const interpolatePoints = (start, end, numPoints) => {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      points.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio
      });
    }
    return points;
  };

  const getElevationData = async (path) => {
    if (!path || path.length === 0) return [];
    
    try {
      const service = new window.google.maps.ElevationService();
      const maxPointsPerRequest = 512;
      const elevationPromises = [];
      
      for (let i = 0; i < path.length; i += maxPointsPerRequest) {
        const batch = path.slice(i, i + maxPointsPerRequest);
        elevationPromises.push(
          new Promise((resolve, reject) => {
            service.getElevationForLocations({
              locations: batch
            }, (results, status) => {
              if (status === 'OK' && results) {
                resolve(results.map((result, index) => ({
                  lat: result.location.lat(),
                  lng: result.location.lng(),
                  elevation: result.elevation
                })));
              } else {
                console.warn('Elevation request failed:', status);
                resolve(batch.map(point => ({ ...point, elevation: 0 })));
              }
            });
          })
        );
      }
      
      const elevationBatches = await Promise.all(elevationPromises);
      return elevationBatches.flat();
    } catch (error) {
      console.error('Error getting elevation data:', error);
      return path.map(point => ({ ...point, elevation: 0 }));
    }
  };

  const calculateRouteStats = (path, elevationData) => {
    if (!path || path.length < 2) return null;
    
    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let highestPoint = -Infinity;
    let lowestPoint = Infinity;
    
    const dataToUse = elevationData.length > 0 ? elevationData : path;
    
    for (let i = 0; i < dataToUse.length - 1; i++) {
      const current = dataToUse[i];
      const next = dataToUse[i + 1];
      
      totalDistance += haversineDistance(current, next);
      
      if (current.elevation !== undefined) {
        if (current.elevation > highestPoint) highestPoint = current.elevation;
        if (current.elevation < lowestPoint) lowestPoint = current.elevation;
        
        if (next.elevation !== undefined) {
          const elevDiff = next.elevation - current.elevation;
          if (elevDiff > 0) {
            elevationGain += elevDiff;
          } else {
            elevationLoss += Math.abs(elevDiff);
          }
        }
      }
    }
    
    const netElevationChange = highestPoint !== -Infinity && lowestPoint !== Infinity ? 
      highestPoint - lowestPoint : 0;
    
    return {
      distance: totalDistance,
      elevationGain: elevationGain || 0,
      elevationLoss: elevationLoss || 0,
      netElevationChange: netElevationChange || 0,
      highestPoint: highestPoint !== -Infinity ? highestPoint : 0,
      lowestPoint: lowestPoint !== Infinity ? lowestPoint : 0
    };
  };

  // BULLETPROOF: Force retry function
  const forceRetry = () => {
    setIsInitializing(true);
    setIsScriptLoaded(false);
    setIsMapLoaded(false);
    setLoadError(null);
    window.googleMapsLoading = false;
    
    // Remove existing script if any
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Force reload after cleanup
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // BULLETPROOF: Error states with retry options
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-red-100 text-red-800 p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Configuration Error</h3>
          <p>Google Maps API key is missing.</p>
          <p className="text-sm mt-2">Please add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-yellow-100 text-yellow-800 p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Map Loading Error</h3>
          <p>{loadError}</p>
          <div className="mt-4 space-x-2">
            <button 
              onClick={forceRetry}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Force Reload
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* BULLETPROOF: Enhanced loading indicator */}
      {(isInitializing || !isScriptLoaded || (isScriptLoaded && !isMapLoaded)) && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg mb-2">
              {isInitializing ? 'Initializing Google Maps...' : 
               !isScriptLoaded ? 'Loading Google Maps API...' : 
               'Setting up map...'}
            </p>
            <p className="text-gray-500 text-sm">This should only take a moment</p>
            <button 
              onClick={forceRetry}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Force Retry
            </button>
          </div>
        </div>
      )}

      {/* Range warning */}
      {rangeWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 p-3 rounded-lg bg-yellow-600 max-w-md text-center">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="text-sm font-medium text-white">{rangeWarning.message}</span>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {/* BULLETPROOF: Only render map when script is loaded */}
        {isScriptLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            options={mapOptions}
            onLoad={onMapLoad}
            onClick={onMapClick}
          >
            {/* Render markers only when map is fully loaded */}
            {isMapLoaded && markers.map(marker => (
              <Marker
                key={marker.id}
                position={marker.position}
                draggable
                onRightClick={() => onMarkerRightClick(marker.id)}
                onDragEnd={e => onMarkerDragEnd(marker.id, e)}
                label={(marker.index + 1).toString()}
                icon={{
                  url: markerColors[marker.index] || markerColors[4],
                  scaledSize: new window.google.maps.Size(40, 40)
                }}
              />
            ))}

            {/* Original route path for edit mode - ENHANCED: Force re-render with key */}
            {isMapLoaded && isEditMode && originalRoutePath.length > 0 && (
              <Polyline
                key={`original-${polylineKey}`}
                path={originalRoutePath}
                options={{ 
                  strokeColor: '#FF0000', 
                  strokeOpacity: 0.8, 
                  strokeWeight: 3, 
                  geodesic: true 
                }}
              />
            )}

            {/* Current route path - ENHANCED: Force re-render with key */}
            {isMapLoaded && routePath.length > 0 && (
              <Polyline
                key={`current-${polylineKey}`}
                path={routePath}
                options={{
                  strokeColor: isEditMode ? '#8B5CF6' : '#FF0000',
                  strokeOpacity: 1.0,
                  strokeWeight: 3,
                  geodesic: true,
                  ...(isEditMode && {
                    icons: [{
                      icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                      offset: '0',
                      repeat: '20px'
                    }]
                  })
                }}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-orp-blue bg-opacity-20 border-t border-white border-opacity-20">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={generateRoute}
              disabled={markers.length < 2 || isProcessing || !isMapLoaded}
              className="px-4 py-2 bg-orp-blue text-white rounded border border-white transition-transform hover:scale-105 disabled:opacity-50"
            >
              {isProcessing ? '⏳ Processing...' : '🗺️ Generate Route'}
            </button>
            
            <button
              onClick={resetMap}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-600 text-white rounded border border-white transition-transform hover:scale-105 disabled:opacity-50"
            >
              🔄 Reset
            </button>

            {/* MOVED: Refresh Map button from top-right to here */}
            {setMapKey && (
              <button
                onClick={() => setMapKey(prev => prev + 1)}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                title="Refresh map if it's not loading"
              >
                🔄 Refresh Map
              </button>
            )}
          </div>

          {/* Route stats */}
          {routeStats && (
            <div className="text-sm text-white bg-black bg-opacity-30 px-3 py-2 rounded">
              Distance: {(routeStats.distance / 1000).toFixed(2)}km
              {routeStats.elevationGain > 0 && (
                <span className="ml-2">
                  ↗ {routeStats.elevationGain.toFixed(0)}m
                </span>
              )}
            </div>
          )}
        </div>

        {/* Edit mode indicator */}
        <div className="text-sm text-orp-light-blue mt-2">
          {isEditMode ? (
            <div>
              <span>🔧 Editing mode • </span>
              <span className="text-red-400">Red = Original route</span>
              <span> • </span>
              <span className="text-purple-400">Purple line = New route</span>
            </div>
          ) : (
            <div>
              <span>Click to add points • Right-click to delete • Drag to move</span>
              <span> • </span>
              <span className="text-yellow-400">10km range limit applies</span>
            </div>
          )}
        </div>
      </div>

      {/* Marker Limit Popup */}
      {showMarkerLimitPopup && (
        <MarkerLimitPopup
          onClose={() => setShowMarkerLimitPopup(false)}
        />
      )}
    </div>
  );
};

export default GoogleMapsRouteCreator;