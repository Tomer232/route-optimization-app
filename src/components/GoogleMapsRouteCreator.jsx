import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [allowedAreaCenter, setAllowedAreaCenter] = useState(null);
  const [rangeWarning, setRangeWarning] = useState(null);
  
  // FIXED: Single route line instead of segments
  const [routeLine, setRouteLine] = useState(null);
  const [originalRouteLine, setOriginalRouteLine] = useState(null);
  
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

  // Helper function for direction
  const getDirection = (bearing) => {
    if (bearing >= 337.5 || bearing < 22.5) return 'N';
    if (bearing >= 22.5 && bearing < 67.5) return 'NE';
    if (bearing >= 67.5 && bearing < 112.5) return 'E';
    if (bearing >= 112.5 && bearing < 157.5) return 'SE';
    if (bearing >= 157.5 && bearing < 202.5) return 'S';
    if (bearing >= 202.5 && bearing < 247.5) return 'SW';
    if (bearing >= 247.5 && bearing < 292.5) return 'W';
    if (bearing >= 292.5 && bearing < 337.5) return 'NW';
    return '?';
  };

  // FIXED: Draw single route line
  const drawSingleRouteLine = useCallback((pathCoordinates, isOriginal = false) => {
    if (!map || !pathCoordinates || pathCoordinates.length < 2) {
      console.log('❌ Cannot draw route line - missing requirements');
      return;
    }

    console.log(`🎨 Drawing ${isOriginal ? 'ORIGINAL' : 'CURRENT'} single route line`);
    console.log(`📍 Path has ${pathCoordinates.length} coordinates`);

    // Clear existing route lines
    if (routeLine) {
      console.log('🗑️ Removing existing current route line');
      routeLine.setMap(null);
      setRouteLine(null);
    }
    
    if (originalRouteLine) {
      console.log('🗑️ Removing existing original route line');
      originalRouteLine.setMap(null);
      setOriginalRouteLine(null);
    }

    // Create new polyline
    console.log('✨ Creating NEW polyline...');
    
    const polylineOptions = {
      path: pathCoordinates,
      geodesic: true,
      strokeColor: isOriginal ? '#FF0000' : '#2563eb',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: map,
      zIndex: isOriginal ? 1 : 2
    };

    const newRouteLine = new window.google.maps.Polyline(polylineOptions);
    
    if (isOriginal) {
      setOriginalRouteLine(newRouteLine);
      console.log('✅ Set as ORIGINAL route line');
    } else {
      setRouteLine(newRouteLine);
      console.log('✅ Set as CURRENT route line');
    }
    
    console.log(`✅ SUCCESS: Created single continuous ${isOriginal ? 'red' : 'blue'} route line`);

  }, [map, routeLine, originalRouteLine]);

  // FIXED: Clear route lines
  const clearRouteLines = useCallback(() => {
    console.log('🧹 Clearing route lines from map');
    
    if (routeLine) {
      routeLine.setMap(null);
      setRouteLine(null);
    }
    
    if (originalRouteLine) {
      originalRouteLine.setMap(null);
      setOriginalRouteLine(null);
    }
    
    console.log('✅ Route lines cleared');
  }, [routeLine, originalRouteLine]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Check range restriction
  const checkRangeRestriction = useCallback((position) => {
    if (!allowedAreaCenter) return true;
    
    const distance = calculateDistance(
      allowedAreaCenter.lat, allowedAreaCenter.lng,
      position.lat, position.lng
    );
    
    const maxDistance = 5000; // 5km limit
    if (distance > maxDistance) {
      setRangeWarning({
        message: `Point is ${Math.round((distance - maxDistance) / 1000 * 10) / 10}km outside allowed area`,
        severity: 'warning'
      });
      return false;
    }
    
    setRangeWarning(null);
    return true;
  }, [allowedAreaCenter]);

  // Map event handlers
  const onMapLoad = useCallback((mapInstance) => {
    console.log('🗺️ Map loaded successfully');
    setMap(mapInstance);
    setIsMapLoaded(true);
  }, []);

  const onMapClick = useCallback((event) => {
    if (markers.length >= 5) {
      console.log('⚠️ Maximum 5 waypoints allowed');
      return;
    }

    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    if (!checkRangeRestriction(newPosition)) {
      return;
    }

    const newMarker = {
      id: Date.now(),
      position: newPosition,
      index: markers.length
    };

    setMarkers(prev => [...prev, newMarker]);
    
    // Clear existing route
    setRoutePath([]);
    setRouteStats(null);
    clearRouteLines();
    onRouteCreated?.(null);
    
    console.log('📍 Added marker:', newMarker);
  }, [markers.length, checkRangeRestriction, clearRouteLines, onRouteCreated]);

  const onMarkerRightClick = useCallback((markerId) => {
    setMarkers(prev => {
      const filtered = prev.filter(m => m.id !== markerId);
      return filtered.map((marker, index) => ({ ...marker, index }));
    });
    
    // Clear route when marker is deleted
    setRoutePath([]);
    setRouteStats(null);
    clearRouteLines();
    onRouteCreated?.(null);
    
    console.log('🗑️ Deleted marker:', markerId);
  }, [clearRouteLines, onRouteCreated]);

  const onMarkerDragEnd = useCallback((markerId, event) => {
    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    if (!checkRangeRestriction(newPosition)) {
      return;
    }

    setMarkers(prev =>
      prev.map(marker =>
        marker.id === markerId ? { ...marker, position: newPosition } : marker
      )
    );
    
    // Clear route when marker is moved
    setRoutePath([]);
    setRouteStats(null);
    clearRouteLines();
    onRouteCreated?.(null);
    
    console.log('🚚 Marker moved to:', newPosition);
  }, [checkRangeRestriction, onRouteCreated, clearRouteLines]);

  // Helper function to get elevation data in batches
  const getElevationDataBatch = async (elevationPoints) => {
    const elevationService = new window.google.maps.ElevationService();
    const elevationData = [];
    const batchSize = 512; // Google's limit

    for (let start = 0; start < elevationPoints.length; start += batchSize) {
      const batch = elevationPoints.slice(start, start + batchSize);
      const locations = batch.map(p => ({ lat: p.lat, lng: p.lng }));

      try {
        const results = await new Promise((resolve, reject) => {
          elevationService.getElevationForLocations(
            { locations },
            (results, status) => {
              if (status === 'OK') {
                resolve(results);
              } else {
                reject(new Error(`Elevation API error: ${status}`));
              }
            }
          );
        });

        results.forEach((result, i) => {
          elevationData.push({
            lat: result.location.lat(),
            lng: result.location.lng(),
            elevation: result.elevation,
            point_type: batch[i].type
          });
        });

        console.log(`Processed elevation batch ${Math.floor(start/batchSize) + 1}/${Math.ceil(elevationPoints.length/batchSize)}`);

      } catch (error) {
        console.error('Elevation batch error:', error);
        // Add fallback data for this batch
        batch.forEach(point => {
          elevationData.push({
            lat: point.lat,
            lng: point.lng,
            elevation: 100, // Fallback elevation
            point_type: point.type
          });
        });
      }
    }

    return elevationData;
  };

  // Helper function to calculate route stats
  const calculateRouteStatsFromPath = (pathCoords) => {
    if (!pathCoords || pathCoords.length < 2) {
      return {
        distance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        netElevationChange: 0,
        highestPoint: 0,
        lowestPoint: 0
      };
    }

    let totalDistance = 0;
    for (let i = 1; i < pathCoords.length; i++) {
      totalDistance += calculateDistance(
        pathCoords[i-1].lat, pathCoords[i-1].lng,
        pathCoords[i].lat, pathCoords[i].lng
      );
    }

    return {
      distance: totalDistance,
      elevationGain: 150, // Mock for now
      elevationLoss: 100,
      netElevationChange: 50,
      highestPoint: 250,
      lowestPoint: 100
    };
  };

  // ROUTE GENERATION WITH BACKEND DATA ANALYSIS
  const generateRoute = async () => {
    if (markers.length < 2) {
      onError?.('Please add at least 2 waypoints');
      return;
    }

    setIsProcessing(true);
    console.log('🔄 Generating route with backend analysis...');

    try {
      // Step 1: Create labeled points (waypoints)
      const labeledPoints = markers.map((marker, index, arr) => {
        const type = index === 0 ? 'start' : 
                     index === arr.length - 1 ? 'end' : 
                     `w${index}`;
        return {
          lat: marker.position.lat,
          lng: marker.position.lng,
          type: type
        };
      });

      // Step 2: Create dense elevation grid
      const BUFFER_KM = 0.2;
      const STEP_SIZE = 0.00027;
      
      const lats = markers.map(m => m.position.lat);
      const lngs = markers.map(m => m.position.lng);
      
      const minLat = Math.min(...lats) - 0.009 * BUFFER_KM;
      const maxLat = Math.max(...lats) + 0.009 * BUFFER_KM;
      const minLng = Math.min(...lngs) - 0.009 * BUFFER_KM;
      const maxLng = Math.max(...lngs) + 0.009 * BUFFER_KM;

      console.log(`Creating grid: ${minLat} to ${maxLat}, ${minLng} to ${maxLng}`);
      
      const elevationPoints = [];
      
      // Add grid points
      for (let lat = minLat; lat <= maxLat; lat += STEP_SIZE) {
        for (let lng = minLng; lng <= maxLng; lng += STEP_SIZE) {
          elevationPoints.push({ lat, lng, type: 'grid' });
        }
      }
      
      // Add labeled points (waypoints)
      elevationPoints.push(...labeledPoints);
      
      console.log(`Created ${elevationPoints.length} elevation points`);

      // Step 3: Get elevation data using Google's service
      const elevationData = await getElevationDataBatch(elevationPoints);
      console.log(`Got elevation data for ${elevationData.length} points`);

      // Step 4: Create CSV format
      const csvContent = "lat,lng,elevation,point_type\n" + 
        elevationData.map(point => 
          `${point.lat.toFixed(15)},${point.lng.toFixed(15)},${point.elevation},${point.point_type}`
        ).join("\n");

      // Step 5: Send CSV to backend
      const blob = new Blob([csvContent], { type: "text/csv" });
      const formData = new FormData();
      formData.append("file", blob, "elevation_data.csv");

      console.log('📤 Sending CSV to backend...');

      const response = await fetch('http://localhost:5000/process_csv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Step 6: Server returns clean line data
      const responseText = await response.text();
      console.log('📥 Backend response received');

      // Parse CSV response to coordinates
      const lines = responseText.trim().split('\n').slice(1); // Skip header
      const pathCoords = lines.map(line => {
        const [lat, lng] = line.split(',').map(Number);
        return { lat, lng };
      });

      console.log(`✅ Server provided ${pathCoords.length} points for route`);

      // BACKEND DATA ANALYSIS - CRITICAL DIAGNOSTIC CODE
      console.log('🔍 ===== BACKEND DATA ANALYSIS =====');
      console.log(`📊 Total points received: ${pathCoords.length}`);
      console.log(`📊 Number of waypoints: ${markers.length}`);

      // Analysis 1: Check first 20 points
      console.log('📍 FIRST 20 COORDINATES:');
      pathCoords.slice(0, 20).forEach((point, index) => {
        console.log(`  ${index}: lat=${point.lat.toFixed(8)}, lng=${point.lng.toFixed(8)}`);
      });

      // Analysis 2: Check last 20 points  
      console.log('📍 LAST 20 COORDINATES:');
      pathCoords.slice(-20).forEach((point, index) => {
        const actualIndex = pathCoords.length - 20 + index;
        console.log(`  ${actualIndex}: lat=${point.lat.toFixed(8)}, lng=${point.lng.toFixed(8)}`);
      });

      // Analysis 3: Check middle section
      const middleStart = Math.floor(pathCoords.length / 2) - 10;
      const middleEnd = Math.floor(pathCoords.length / 2) + 10;
      console.log(`📍 MIDDLE SECTION (around point ${Math.floor(pathCoords.length / 2)}):`);
      pathCoords.slice(middleStart, middleEnd).forEach((point, index) => {
        const actualIndex = middleStart + index;
        console.log(`  ${actualIndex}: lat=${point.lat.toFixed(8)}, lng=${point.lng.toFixed(8)}`);
      });

      // Analysis 4: Calculate distances between consecutive points
      console.log('📏 CONSECUTIVE POINT DISTANCES (first 10):');
      for (let i = 0; i < Math.min(10, pathCoords.length - 1); i++) {
        const p1 = pathCoords[i];
        const p2 = pathCoords[i + 1];
        const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        console.log(`  ${i} → ${i+1}: ${distance.toFixed(2)}m`);
      }

      // Analysis 5: Check for "jumps" - large distances that indicate mesh connections
      console.log('🚨 CHECKING FOR LARGE JUMPS (distance > 500m):');
      let jumpCount = 0;
      let maxJump = 0;
      let jumpLocations = [];

      for (let i = 0; i < pathCoords.length - 1; i++) {
        const p1 = pathCoords[i];
        const p2 = pathCoords[i + 1];
        const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        
        if (distance > 500) { // 500m is arbitrary threshold for "jump"
          jumpCount++;
          maxJump = Math.max(maxJump, distance);
          jumpLocations.push({
            from: i,
            to: i + 1,
            distance: distance.toFixed(2),
            fromCoord: `${p1.lat.toFixed(6)}, ${p1.lng.toFixed(6)}`,
            toCoord: `${p2.lat.toFixed(6)}, ${p2.lng.toFixed(6)}`
          });
          
          // Only log first 5 jumps to avoid spam
          if (jumpCount <= 5) {
            console.log(`  Jump ${jumpCount}: Point ${i} → ${i+1} = ${distance.toFixed(2)}m`);
            console.log(`    From: ${p1.lat.toFixed(6)}, ${p1.lng.toFixed(6)}`);
            console.log(`    To: ${p2.lat.toFixed(6)}, ${p2.lng.toFixed(6)}`);
          }
        }
      }

      console.log(`🚨 JUMP SUMMARY: Found ${jumpCount} jumps > 500m`);
      console.log(`🚨 LARGEST JUMP: ${maxJump.toFixed(2)}m`);

      // Analysis 6: Check if path goes near your waypoints
      console.log('📍 WAYPOINT PROXIMITY CHECK:');
      markers.forEach((marker, markerIndex) => {
        let closestDistance = Infinity;
        let closestPointIndex = -1;
        
        pathCoords.forEach((pathPoint, pathIndex) => {
          const distance = calculateDistance(
            marker.position.lat, marker.position.lng,
            pathPoint.lat, pathPoint.lng
          );
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPointIndex = pathIndex;
          }
        });
        
        console.log(`  Waypoint ${markerIndex + 1}: Closest path point is ${closestPointIndex} (${closestDistance.toFixed(2)}m away)`);
      });

      // Analysis 7: Path direction analysis
      console.log('🧭 PATH DIRECTION ANALYSIS (first 10 segments):');
      for (let i = 0; i < Math.min(10, pathCoords.length - 1); i++) {
        const p1 = pathCoords[i];
        const p2 = pathCoords[i + 1];
        
        // Calculate bearing
        const lat1 = p1.lat * Math.PI / 180;
        const lat2 = p2.lat * Math.PI / 180;
        const deltaLng = (p2.lng - p1.lng) * Math.PI / 180;
        
        const y = Math.sin(deltaLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
        
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        const normalizedBearing = (bearing + 360) % 360;
        
        console.log(`  Segment ${i}: ${normalizedBearing.toFixed(1)}° (${getDirection(normalizedBearing)})`);
      }

      // Analysis 8: Mesh detection summary
      if (jumpCount > 10) {
        console.log('🚨 CONCLUSION: HIGH PROBABILITY OF MESH DATA');
        console.log('🚨 ISSUE: Backend is returning mesh connections');
        console.log('🚨 SOLUTION NEEDED: Fix backend A* algorithm');
      } else if (jumpCount === 0) {
        console.log('✅ CONCLUSION: CLEAN SEQUENTIAL DATA');
        console.log('✅ BACKEND LOOKS GOOD');
        console.log('🚨 ISSUE: Frontend drawing logic problem');
      } else {
        console.log('⚠️ CONCLUSION: BORDERLINE - NEEDS MORE INVESTIGATION');
        console.log(`⚠️ Found ${jumpCount} jumps - could be normal or could indicate issue`);
      }

      console.log('🔍 ===== END BACKEND ANALYSIS =====');

      // Step 7: Set the path data - this will trigger drawing
      setRoutePath(pathCoords);
      
      // Calculate stats
      const stats = calculateRouteStatsFromPath(pathCoords);
      setRouteStats(stats);

      // Return route data
      onRouteCreated?.({
        waypoints: markers.map(m => m.position),
        optimizedPath: pathCoords,
        stats: stats
      });

    } catch (error) {
      console.error('❌ Route generation failed:', error);
      onError?.(`Route generation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetMap = () => {
    console.log('🧹 Resetting map - clearing all elements');
    
    // Clear all route lines
    clearRouteLines();
    
    // Clear state
    setMarkers([]);
    setRoutePath([]);
    setOriginalRoutePath([]);
    setRouteStats(null);
    setAllowedAreaCenter(null);
    setRangeWarning(null);
    setIsEditMode(false);
    
    // Notify parent component that route is cleared
    if (onRouteCreated) {
      onRouteCreated(null);
    }
  };

  // TEST FUNCTIONS
  const runFrontendTest = () => {
    console.log('🧪 FRONTEND TEST: Drawing simple hardcoded path');
    
    if (!map) {
      console.log('❌ No map available for test');
      return;
    }
    
    // Clear any existing lines first
    clearRouteLines();
    
    // Create a simple 3-point path manually
    // This simulates what backend SHOULD return for a clean path
    const testPath = [
      // Start point (near your first marker)
      { lat: 32.714100, lng: 34.977660 },
      { lat: 32.714105, lng: 34.977665 },
      { lat: 32.714110, lng: 34.977670 },
      { lat: 32.714115, lng: 34.977675 },
      { lat: 32.714120, lng: 34.977680 },
      
      // Moving toward middle point
      { lat: 32.714000, lng: 34.980000 },
      { lat: 32.713950, lng: 34.982000 },
      { lat: 32.713900, lng: 34.984000 },
      { lat: 32.713850, lng: 34.986000 },
      
      // Moving toward end point  
      { lat: 32.713800, lng: 34.988000 },
      { lat: 32.713750, lng: 34.990000 },
      { lat: 32.713700, lng: 34.992000 },
      { lat: 32.713650, lng: 34.994000 },
      { lat: 32.713600, lng: 34.996000 },
      
      // End point (near your last marker)
      { lat: 32.713550, lng: 34.998000 }
    ];
    
    console.log(`🧪 Test path has ${testPath.length} points`);
    console.log('🧪 First point:', testPath[0]);
    console.log('🧪 Last point:', testPath[testPath.length - 1]);
    
    // Draw this test path using our drawing function
    drawSingleRouteLine(testPath, false);
    
    console.log('🧪 Frontend test complete - check map for result');
    console.log('🧪 Expected: Single blue line from start to end');
    console.log('🧪 If you see mesh: Frontend has drawing issue');
    console.log('🧪 If you see clean line: Backend has data issue');
  };

  const analyzeCurrentRoute = () => {
    console.log('🔍 BACKEND DATA COMPARISON TEST');
    
    if (routePath.length === 0) {
      console.log('❌ No route data to analyze. Generate a route first.');
      return;
    }
    
    console.log('📊 ROUTE DATA SUMMARY:');
    console.log(`Total points: ${routePath.length}`);
    
    // Quick mesh detection
    let suspiciousJumps = 0;
    let maxDistance = 0;
    
    for (let i = 0; i < routePath.length - 1; i++) {
      const p1 = routePath[i];
      const p2 = routePath[i + 1];
      const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      
      maxDistance = Math.max(maxDistance, distance);
      
      if (distance > 1000) { // 1km jump suggests mesh
        suspiciousJumps++;
      }
    }
    
    console.log(`Max distance between consecutive points: ${maxDistance.toFixed(2)}m`);
    console.log(`Suspicious jumps (>1km): ${suspiciousJumps}`);
    
    if (suspiciousJumps > 0) {
      console.log('🚨 LIKELY MESH DATA: Backend is returning mesh connections');
      console.log('🚨 Fix needed: Backend algorithm');
    } else if (maxDistance < 100) {
      console.log('✅ CLEAN SEQUENTIAL DATA: Backend looks good');
      console.log('🚨 Fix needed: Frontend drawing logic');
    } else {
      console.log('⚠️ BORDERLINE: Need more investigation');
    }
  };

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
          setLoadError('Failed to load Google Maps. Please check your internet connection and API key.');
          setIsInitializing(false);
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
    };
  }, [apiKey]);

  // Load edit route data
  useEffect(() => {
    if (editRouteData && map) {
      console.log('📝 Loading edit route data:', editRouteData);
      setIsEditMode(true);
      
      // Set up markers from start/end points
      const editMarkers = [];
      if (editRouteData.startPoint) {
        editMarkers.push({
          id: 0,
          position: editRouteData.startPoint,
          index: 0
        });
      }
      if (editRouteData.endPoint) {
        editMarkers.push({
          id: 1,
          position: editRouteData.endPoint,
          index: 1
        });
      }
      setMarkers(editMarkers);
      
      // Draw original route if available
      if (editRouteData.routePoints && editRouteData.routePoints.length > 0) {
        setOriginalRoutePath(editRouteData.routePoints);
      }
    }
  }, [editRouteData, map]);

  // Effect to draw single route line when routePath changes
  useEffect(() => {
    if (routePath.length > 0 && map) {
      drawSingleRouteLine(routePath, false);
    }
  }, [routePath, map]);

  // Effect to draw original route line when originalRoutePath changes
  useEffect(() => {
    if (originalRoutePath.length > 0 && map) {
      drawSingleRouteLine(originalRoutePath, true);
    }
  }, [originalRoutePath, map, drawSingleRouteLine]);

  const forceRetry = useCallback(() => {
    console.log('🔄 Force retrying map initialization...');
    setLoadError(null);
    setIsScriptLoaded(false);
    setIsMapLoaded(false);
    setIsInitializing(true);
    
    // Force reload the script
    window.googleMapsLoading = false;
    if (window.google) {
      delete window.google;
    }
    
    // Remove existing script tags
    const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    existingScripts.forEach(script => script.remove());
    
    // Trigger re-initialization
    setMapKey(prev => prev + 1);
  }, [setMapKey]);

  // Error boundary for missing API key
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
        {/* Single line drawn by native API */}
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

            {/* NO POLYLINE COMPONENTS - Single continuous line drawn by drawSingleRouteLine */}
          </GoogleMap>
        )}
      </div>

      {/* Control Panel with Test Buttons */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left side - Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={generateRoute}
              disabled={markers.length < 2 || isProcessing}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                markers.length < 2 || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing Route...
                </div>
              ) : (
                'Generate Route'
              )}
            </button>

            <button
              onClick={resetMap}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
            >
              Reset
            </button>

            {/* TEST BUTTONS */}
            <button
              onClick={runFrontendTest}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              🧪 Frontend Test
            </button>

            <button
              onClick={analyzeCurrentRoute}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              🔍 Analyze Route
            </button>

            <button
              onClick={clearRouteLines}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              🧹 Clear Lines
            </button>

            {/* Stats display */}
            {routeStats && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>📏 {(routeStats.distance / 1000).toFixed(2)} km</span>
                <span>📈 +{routeStats.elevationGain?.toFixed(0) || 0}m</span>
                <span>📉 -{routeStats.elevationLoss?.toFixed(0) || 0}m</span>
              </div>
            )}
          </div>

          {/* Right side - Info */}
          <div className="text-sm text-gray-500">
            {isEditMode ? (
              <div>
                <span>🔧 Editing mode • </span>
                <span className="text-red-400">Red = Original route</span>
                <span> • </span>
                <span className="text-blue-400">Blue = New route</span>
              </div>
            ) : (
              <div>
                <span>Click to add points • Right-click to delete • Drag to move</span>
                <span> • </span>
                <span className="text-blue-400">🔍 DIAGNOSTIC MODE</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsRouteCreator;
