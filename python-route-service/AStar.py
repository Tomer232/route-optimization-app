# AStar.py - (Fixed Mesh Bug, Good Performance)

import pandas as pd
import math
import heapq

LAT_LON_THRESHOLD = 0.00028
ELEVATION_THRESHOLD = 8

class Point:
    def __init__(self, id, lat, lon, elevation, point_type):
        self.id = id
        self.lat = lat
        self.lon = lon
        self.elevation = elevation
        self.point_type = point_type
        self.neighbors = []

def load_points_from_csv(file_path):
    df = pd.read_csv(file_path)
    points = {}
    for idx, row in df.iterrows():
        points[idx] = Point(idx, row['lat'], row['lng'], row['elevation'], row['point_type'])
    return points

def are_adjacent(p1, p2):
    return (abs(p1.lat - p2.lat) <= LAT_LON_THRESHOLD and 
            abs(p1.lon - p2.lon) <= LAT_LON_THRESHOLD)

def elevation_difference(p1, p2):
    return abs(p1.elevation - p2.elevation)

def build_graph(points):
    print(f"🔗 Building graph with {len(points)} points...")
    connection_count = 0
    
    for i, p1 in points.items():
        for j, p2 in points.items():
            if i != j and are_adjacent(p1, p2):
                elev_diff = elevation_difference(p1, p2)
                p1.neighbors.append((j, elev_diff))
                connection_count += 1
    
    print(f"🔗 Graph built with {connection_count} total connections")
    
    # Check connectivity of key points
    key_points = [p for p in points.values() if p.point_type in ['start', 'end'] or p.point_type.startswith('w')]
    for kp in key_points:
        neighbor_count = len(kp.neighbors)
        print(f"🔑 Key point {kp.point_type} at ({kp.lat:.4f}, {kp.lon:.4f}) has {neighbor_count} neighbors")
    
    return points

def haversine_distance(p1, p2):
    R = 6371000
    phi1 = math.radians(p1.lat)
    phi2 = math.radians(p2.lat)
    d_phi = math.radians(p2.lat - p1.lat)
    d_lambda = math.radians(p2.lon - p1.lon)
    a = math.sin(d_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def reconstruct_path(came_from, start_id, goal_id):
    path = [goal_id]
    current = goal_id
    while current != start_id:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path

def astar(points, start_id, goal_id, alpha=25):
    print(f"🎯 Finding path from {points[start_id].point_type} to {points[goal_id].point_type}")
    
    open_set = []
    heapq.heappush(open_set, (0, start_id))
    came_from = {}
    g_score = {start_id: 0}
    f_score = {start_id: haversine_distance(points[start_id], points[goal_id])}
    closed_set = set()
    
    iterations = 0
    max_iterations = len(points) * 5

    while open_set and iterations < max_iterations:
        iterations += 1
        _, current = heapq.heappop(open_set)
        if current == goal_id:
            path = reconstruct_path(came_from, start_id, goal_id)
            print(f"✅ Path found in {iterations} iterations with {len(path)} points")
            return path
        closed_set.add(current)

        for neighbor_id, _ in points[current].neighbors:
            if neighbor_id in closed_set:
                continue

            dist = haversine_distance(points[current], points[neighbor_id])
            elev = elevation_difference(points[current], points[neighbor_id])
            cost = dist + alpha * elev

            tentative_g = g_score[current] + cost
            if neighbor_id not in g_score or tentative_g < g_score[neighbor_id]:
                came_from[neighbor_id] = current
                g_score[neighbor_id] = tentative_g
                f_score[neighbor_id] = tentative_g + haversine_distance(points[neighbor_id], points[goal_id])
                heapq.heappush(open_set, (f_score[neighbor_id], neighbor_id))

    print(f"❌ No path found after {iterations} iterations")
    return None

def is_direct_connection(p1, p2):
    return are_adjacent(p1, p2) and elevation_difference(p1, p2) <= ELEVATION_THRESHOLD

def smooth_path(path, points):
    if len(path) < 3:
        return path
    smoothed = [path[0]]
    i = 0
    while i < len(path) - 1:
        j = len(path) - 1
        while j > i + 1:
            if is_direct_connection(points[path[i]], points[path[j]]):
                smoothed.append(path[j])
                i = j
                break
            j -= 1
        else:
            smoothed.append(path[i+1])
            i += 1
    
    print(f"🔄 Smoothed path from {len(path)} to {len(smoothed)} points")
    return smoothed

def add_intermediate_points(path, points, density=7):
    """Add intermediate points between path segments for smoother curves"""
    if len(path) < 2:
        return path
    
    enhanced_path = [path[0]]
    
    for i in range(len(path) - 1):
        current_id = path[i]
        next_id = path[i + 1]
        current_point = points[current_id]
        next_point = points[next_id]
        
        # Add intermediate points between current and next
        for j in range(1, density):
            ratio = j / density
            
            # Simple linear interpolation
            lat = current_point.lat + (next_point.lat - current_point.lat) * ratio
            lon = current_point.lon + (next_point.lon - current_point.lon) * ratio
            elevation = current_point.elevation + (next_point.elevation - current_point.elevation) * ratio
            
            interp_id = f"interp_{i}_{j}"
            enhanced_path.append(interp_id)
            points[interp_id] = Point(interp_id, lat, lon, elevation, 'interpolated')
        
        enhanced_path.append(next_id)
    
    print(f"🎨 Enhanced path: {len(path)} → {len(enhanced_path)} points")
    return enhanced_path

def get_sequential_waypoints(points):
    """Get waypoints in the order they were clicked (1, 2, 3, etc.)"""
    start_point = None
    end_point = None
    waypoints = []
    
    # Find start and end points
    for p in points.values():
        if p.point_type == 'start':
            start_point = p
        elif p.point_type == 'end':
            end_point = p
        elif p.point_type.startswith('w'):
            waypoints.append(p)
    
    if not start_point or not end_point:
        raise ValueError("Missing start or end point")
    
    # Sort waypoints by their number (w1, w2, w3, etc.)
    waypoints_sorted = sorted(waypoints, key=lambda p: int(p.point_type[1:]) if p.point_type[1:].isdigit() else 0)
    
    # Create sequential route: start → w1 → w2 → w3 → end
    sequential_route = [start_point] + waypoints_sorted + [end_point]
    
    print(f"🗺️ Sequential route: {' → '.join([p.point_type for p in sequential_route])}")
    return sequential_route

def calculate_route_stats(path, points):
    """Calculate comprehensive route statistics"""
    if not path or len(path) < 2:
        return {
            'distance': 0,
            'elevationGain': 0,
            'elevationLoss': 0,
            'netElevationChange': 0,
            'highestPoint': 0,
            'lowestPoint': 0
        }
    
    total_distance = 0
    elevation_gain = 0
    elevation_loss = 0
    elevations = [points[pid].elevation for pid in path]
    
    # Calculate distance and elevation changes
    for i in range(len(path) - 1):
        p1 = points[path[i]]
        p2 = points[path[i + 1]]
        
        # Add distance
        total_distance += haversine_distance(p1, p2)
        
        # Calculate elevation changes
        elev_diff = p2.elevation - p1.elevation
        if elev_diff > 0:
            elevation_gain += elev_diff
        else:
            elevation_loss += abs(elev_diff)
    
    stats = {
        'distance': total_distance,
        'elevationGain': elevation_gain,
        'elevationLoss': elevation_loss,
        'netElevationChange': elevation_gain - elevation_loss,
        'highestPoint': max(elevations),
        'lowestPoint': min(elevations)
    }
    
    print(f"📊 Route stats: {total_distance:.0f}m distance, {elevation_gain:.1f}m gain, {elevation_loss:.1f}m loss")
    return stats

def smooth_path_preserve_keys(path, points, key_points):
    final_route = []
    for i in range(len(key_points) - 1):
        try:
            start_index = path.index(key_points[i])
            end_index = path.index(key_points[i+1])
        except ValueError:
            continue
        segment = path[start_index:end_index+1]
        
        # Apply your original smoothing
        smoothed_segment = smooth_path(segment, points)
        
        # Add more intermediate points for smoother curves
        enhanced_segment = add_intermediate_points(smoothed_segment, points, density=7)
        
        if i == 0:
            final_route.extend(enhanced_segment)
        else:
            final_route.extend(enhanced_segment[1:])
    
    return final_route

# FIXED: Sequential routing for 3+ waypoints
def astar_sequential_segments(points):
    """Process waypoints in sequential order like GPS navigation (A→B→C→D)"""
    print("🎯 Starting SEQUENTIAL waypoint routing (like GPS)...")
    
    # Get waypoints in clicked order
    waypoints_sequence = get_sequential_waypoints(points)
    print(f"🗺️ Route sequence: {' → '.join([p.point_type for p in waypoints_sequence])}")
    
    full_path = []
    route_ids = []
    
    # Process each segment: A→B, B→C, C→D, etc.
    for i in range(len(waypoints_sequence) - 1):
        start_point = waypoints_sequence[i]
        end_point = waypoints_sequence[i + 1]
        
        print(f"🔄 Processing segment: {start_point.point_type} → {end_point.point_type}")
        
        # Run A* for this specific segment
        segment_path = astar(points, start_point.id, end_point.id, alpha=25)
        
        if not segment_path:
            raise ValueError(f"No path found for segment {start_point.point_type} → {end_point.point_type}")
        
        print(f"✅ Segment path found: {len(segment_path)} points")
        
        # Add to full path (avoid duplicating waypoints between segments)
        if i == 0:
            # First segment: add all points
            full_path.extend(segment_path)
            route_ids.append(0)  # Start point index
        else:
            # Subsequent segments: skip first point (already in previous segment)
            full_path.extend(segment_path[1:])
        
        # Track end point for last segment
        if i == len(waypoints_sequence) - 2:
            route_ids.append(len(full_path) - 1)  # End point index
    
    print(f"🎯 SEQUENTIAL ROUTING COMPLETE: {len(full_path)} total points")
    return full_path, route_ids

# FIXED: Main function that chooses algorithm based on waypoint count
def astar_full_path(points):
    """Choose between simple A* (2 points) or sequential A* (3+ points)"""
    # Count waypoint types
    waypoint_types = [p.point_type for p in points.values()]
    waypoint_count = len([t for t in waypoint_types if t in ['start', 'end'] or t.startswith('w')])
    
    if waypoint_count == 2:
        print("📍 2-waypoint route: Using simple A*")
        return astar_simple_two_points(points)
    else:
        print(f"📍 {waypoint_count}-waypoint route: Using SEQUENTIAL A*")
        return astar_sequential_segments(points)

def astar_simple_two_points(points):
    """Simple A* for 2 waypoints (start→end) - existing working logic"""
    start_point = None
    end_point = None
    
    for p in points.values():
        if p.point_type == 'start':
            start_point = p
        elif p.point_type == 'end':
            end_point = p
    
    if not start_point or not end_point:
        raise ValueError("Missing start or end point")
    
    print(f"🎯 Simple 2-point route: {start_point.point_type} → {end_point.point_type}")
    
    # Run A* 
    path = astar(points, start_point.id, end_point.id, alpha=25)
    if not path:
        raise ValueError("No path found")
    
    # Apply smoothing and enhancement
    smoothed_path = smooth_path(path, points)
    final_path = add_intermediate_points(smoothed_path, points, density=7)
    
    route_ids = [0, len(final_path) - 1]  # Start and end indices
    
    print(f"✅ Simple route complete: {len(final_path)} points")
    return final_path, route_ids

def run_astar(input_df):
    """Main function called by Flask server"""
    print(f"🔄 Processing dataframe with {len(input_df)} points")
    
    points = {}
    for idx, row in input_df.iterrows():
        points[idx] = Point(
            id=idx,
            lat=row['lat'],
            lon=row['lng'],
            elevation=row['elevation'],
            point_type=row['point_type']
        )

    build_graph(points)
    result = astar_full_path(points)
    if result is None or result[0] is None:
        raise ValueError("No valid path found.")
    
    final_path, route_ids = result

    # Convert to coordinates
    path_coordinates = []
    for pid in final_path:
        path_coordinates.append({
            'lat': points[pid].lat,
            'lng': points[pid].lon
        })
    
    # Calculate stats
    stats = calculate_route_stats(final_path, points)
    
    result_data = {
        'path': path_coordinates,
        'stats': stats,
        'pathLength': len(final_path),
        'waypoints': route_ids
    }
    
    print(f"✅ Successfully generated route with {len(path_coordinates)} points")
    return result_data

def export_path_to_csv(path, points, output_file):
    data = []
    for pid in path:
        p = points[pid]
        data.append({
            'lat': p.lat,
            'lng': p.lon,
            'elevation': p.elevation,
            'point_type': p.point_type
        })
    pd.DataFrame(data).to_csv(output_file, index=False)
    print(f"💾 Path exported to {output_file}")

if __name__ == "__main__":
    print("🧪 Testing Sequential Route A* algorithm...")
    try:
        points = load_points_from_csv("elevation_data.csv")
        build_graph(points)
        result = astar_full_path(points)
        if result is None or result[0] is None:
            print("❌ No valid path found!")
        else:
            final_path, route_ids = result
            export_path_to_csv(final_path, points, "sequential_route_path.csv")
            print("✅ Test completed successfully!")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
