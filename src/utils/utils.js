// Enhanced utility functions for route optimization

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula
 * @param {Object} p1 - First point with lat, lng properties
 * @param {Object} p2 - Second point with lat, lng properties
 * @returns {number} Distance in kilometers
 */
function haversine(p1, p2) {
    const R = 6371; // Earth radius in km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the great-circle distance in meters
 * @param {Object} p1 - First point with lat, lng properties
 * @param {Object} p2 - Second point with lat, lng properties
 * @returns {number} Distance in meters
 */
function haversineMeters(p1, p2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the bearing (direction) from point 1 to point 2
 * @param {Object} p1 - First point with lat, lng properties
 * @param {Object} p2 - Second point with lat, lng properties
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(p1, p2) {
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const deltaLng = (p2.lng - p1.lng) * Math.PI / 180;

    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

/**
 * Create intermediate points between two coordinates
 * @param {Object} start - Starting point with lat, lng properties
 * @param {Object} end - Ending point with lat, lng properties
 * @param {number} numPoints - Number of intermediate points to create
 * @returns {Array} Array of coordinate objects
 */
function interpolatePoints(start, end, numPoints = 10) {
    const points = [];
    
    for (let i = 0; i <= numPoints; i++) {
        const ratio = i / numPoints;
        const lat = start.lat + (end.lat - start.lat) * ratio;
        const lng = start.lng + (end.lng - start.lng) * ratio;
        points.push({ lat, lng });
    }
    
    return points;
}

/**
 * Smooth a path by removing unnecessary intermediate points
 * @param {Array} path - Array of coordinate objects
 * @param {number} tolerance - Tolerance for point removal (smaller = more points kept)
 * @returns {Array} Smoothed path
 */
function smoothPath(path, tolerance = 0.0001) {
    if (path.length <= 2) return path;
    
    const smoothed = [path[0]]; // Always keep first point
    
    for (let i = 1; i < path.length - 1; i++) {
        const prev = smoothed[smoothed.length - 1];
        const current = path[i];
        const next = path[i + 1];
        
        // Calculate if current point significantly changes direction
        const bearing1 = calculateBearing(prev, current);
        const bearing2 = calculateBearing(current, next);
        const bearingDiff = Math.abs(bearing1 - bearing2);
        
        // Keep point if it represents a significant direction change
        if (bearingDiff > tolerance * 1000 || bearingDiff < 360 - tolerance * 1000) {
            smoothed.push(current);
        }
    }
    
    smoothed.push(path[path.length - 1]); // Always keep last point
    return smoothed;
}

/**
 * Format distance for display
 * @param {number} distance - Distance in meters
 * @returns {string} Formatted distance string
 */
function formatDistance(distance) {
    if (!distance) return '0 km';
    
    if (distance < 1000) {
        return `${Math.round(distance)} m`;
    } else {
        return `${(distance / 1000).toFixed(2)} km`;
    }
}

/**
 * Format elevation for display
 * @param {number} elevation - Elevation in meters
 * @returns {string} Formatted elevation string
 */
function formatElevation(elevation) {
    if (typeof elevation !== 'number') return '0m';
    return `${Math.round(elevation)}m`;
}

/**
 * Format net elevation change for display
 * @param {number} netChange - Net elevation change in meters
 * @returns {string} Formatted elevation change string
 */
function formatNetElevation(netChange) {
    if (typeof netChange !== 'number') return '0m';
    const sign = netChange >= 0 ? '+' : '';
    return `${sign}${Math.round(netChange)}m`;
}

/**
 * Format route statistics for display
 * @param {Object} stats - Route statistics object
 * @returns {string} Formatted stats string
 */
function formatRouteStats(stats) {
    if (!stats) return 'No route data';
    
    return {
        distance: formatDistance(stats.distance),
        elevationGain: `+${Math.round(stats.elevationGain || 0)}m`,
        elevationLoss: `-${Math.round(stats.elevationLoss || 0)}m`,
        netElevationChange: `${stats.netElevationChange >= 0 ? '+' : ''}${Math.round(stats.netElevationChange || 0)}m`,
        highestPoint: `${Math.round(stats.highestPoint || 0)}m`,
        lowestPoint: `${Math.round(stats.lowestPoint || 0)}m`
    };
}

/**
 * Validate coordinate object
 * @param {Object} coord - Coordinate to validate
 * @returns {boolean} True if valid coordinate
 */
function isValidCoordinate(coord) {
    return coord &&
           typeof coord.lat === 'number' &&
           typeof coord.lng === 'number' &&
           coord.lat >= -90 && coord.lat <= 90 &&
           coord.lng >= -180 && coord.lng <= 180;
}

/**
 * Create a grid of coordinates within a bounding area
 * @param {Object} bounds - Bounding box object
 * @param {number} density - Grid density (points per degree)
 * @returns {Array} Array of coordinate objects
 */
function createCoordinateGrid(bounds, density = 50) {
    const grid = [];
    const latStep = (bounds.north - bounds.south) / density;
    const lngStep = (bounds.east - bounds.west) / density;
    
    for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
        for (let lng = bounds.west; lng <= bounds.east; lng += lngStep) {
            grid.push({ lat, lng });
        }
    }
    
    return grid;
}

/**
 * Optimize waypoint order using nearest neighbor algorithm
 * @param {Array} waypoints - Array of waypoint objects
 * @param {Object} start - Starting point (optional)
 * @returns {Array} Optimized waypoint order
 */
function optimizeWaypointOrder(waypoints, start = null) {
    if (waypoints.length <= 2) return waypoints;
    
    const unvisited = [...waypoints];
    const optimized = [];
    
    // Start from specified point or first waypoint
    let current = start || unvisited.shift();
    optimized.push(current);
    
    // Find nearest unvisited point for each step
    while (unvisited.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        
        unvisited.forEach((waypoint, index) => {
            const distance = haversineMeters(current, waypoint);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });
        
        current = unvisited.splice(nearestIndex, 1)[0];
        optimized.push(current);
    }
    
    return optimized;
}

/**
 * Calculate bounding box for a set of coordinates
 * @param {Array} coordinates - Array of coordinate objects
 * @returns {Object} Bounding box object
 */
function calculateBounds(coordinates) {
    if (!coordinates || coordinates.length === 0) {
        return { north: 0, south: 0, east: 0, west: 0 };
    }
    
    let north = coordinates[0].lat;
    let south = coordinates[0].lat;
    let east = coordinates[0].lng;
    let west = coordinates[0].lng;
    
    coordinates.forEach(coord => {
        north = Math.max(north, coord.lat);
        south = Math.min(south, coord.lat);
        east = Math.max(east, coord.lng);
        west = Math.min(west, coord.lng);
    });
    
    return { north, south, east, west };
}

/**
 * Calculate elevation statistics for a route
 * @param {Array} pathCoordinates - Array of coordinates with elevation data
 * @returns {Object} Elevation statistics
 */
function calculateElevationStats(pathCoordinates) {
    if (!pathCoordinates || pathCoordinates.length === 0) {
        return {
            elevationGain: 0,
            elevationLoss: 0,
            netElevationChange: 0,
            highestPoint: 0,
            lowestPoint: 0
        };
    }
    
    const elevations = pathCoordinates
        .map(point => point.elevation)
        .filter(elevation => typeof elevation === 'number');
    
    if (elevations.length === 0) {
        return {
            elevationGain: 0,
            elevationLoss: 0,
            netElevationChange: 0,
            highestPoint: 0,
            lowestPoint: 0
        };
    }
    
    let elevationGain = 0;
    let elevationLoss = 0;
    
    for (let i = 1; i < elevations.length; i++) {
        const change = elevations[i] - elevations[i - 1];
        if (change > 0) {
            elevationGain += change;
        } else {
            elevationLoss += Math.abs(change);
        }
    }
    
    return {
        elevationGain,
        elevationLoss,
        netElevationChange: elevationGain - elevationLoss,
        highestPoint: Math.max(...elevations),
        lowestPoint: Math.min(...elevations)
    };
}

// Export functions for use in other modules
export {
    haversine,
    haversineMeters,
    calculateBearing,
    interpolatePoints,
    smoothPath,
    formatDistance,
    formatElevation,
    formatNetElevation,
    formatRouteStats,
    isValidCoordinate,
    createCoordinateGrid,
    optimizeWaypointOrder,
    calculateBounds,
    calculateElevationStats
};
