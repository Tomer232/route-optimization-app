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
    return (abs(p1.lat - p2.lat) <= LAT_LON_THRESHOLD and #BETTER THAN 'OR'!!!
            abs(p1.lon - p2.lon) <= LAT_LON_THRESHOLD)

def elevation_difference(p1, p2):
    return abs(p1.elevation - p2.elevation)

# Updated: no elevation threshold filtering
def build_graph(points):
    for i, p1 in points.items():
        for j, p2 in points.items():
            if i != j and are_adjacent(p1, p2):
                elev_diff = elevation_difference(p1, p2)
                p1.neighbors.append((j, elev_diff))
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

# Improved A* with distance + elevation cost
def astar(points, start_id, goal_id, alpha=50):
    open_set = []
    heapq.heappush(open_set, (0, start_id))
    came_from = {}
    g_score = {start_id: 0}
    f_score = {start_id: haversine_distance(points[start_id], points[goal_id])}
    closed_set = set()

    while open_set:
        _, current = heapq.heappop(open_set)
        if current == goal_id:
            return reconstruct_path(came_from, start_id, goal_id)
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
    return smoothed

def smooth_path_preserve_keys(path, points, key_points):
    final_route = []
    for i in range(len(key_points) - 1):
        try:
            start_index = path.index(key_points[i])
            end_index = path.index(key_points[i+1])
        except ValueError:
            continue
        segment = path[start_index:end_index+1]
        smoothed_segment = smooth_path(segment, points)
        if i == 0:
            final_route.extend(smoothed_segment)
        else:
            final_route.extend(smoothed_segment[1:])
    return final_route

def astar_full_path(points):
    start_id = [p.id for p in points.values() if p.point_type == 'start'][0]
    end_id = [p.id for p in points.values() if p.point_type == 'end'][0]
    waypoints = [p for p in points.values() if p.point_type.startswith("w")]
    waypoints_sorted = sorted(waypoints, key=lambda p: int(p.point_type[1:]) if p.point_type[1:].isdigit() else 0)
    route_ids = [start_id] + [p.id for p in waypoints_sorted] + [end_id]

    full_path = []
    for i in range(len(route_ids) - 1):
        seg_start = route_ids[i]
        seg_end = route_ids[i+1]
        seg_path = astar(points, seg_start, seg_end, alpha=10)
        if seg_path is None:
            print(f"Failed to find path from {points[seg_start].point_type} to {points[seg_end].point_type}")
            return None, route_ids
        if full_path:
            full_path.extend(seg_path[1:])
        else:
            full_path.extend(seg_path)
    final_path = smooth_path_preserve_keys(full_path, points, route_ids)
    return final_path, route_ids

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
    print(f"Path exported to {output_file}")

def run_astar(input_df):
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
    if result is None:
        raise ValueError("No valid path found.")
    final_path, route_ids = result

    return pd.DataFrame([
        {'lat': points[pid].lat, 'lng': points[pid].lon}
        for pid in final_path
    ])

if __name__ == "__main__":
    points = load_points_from_csv("elevation_data.csv")
    build_graph(points)
    result = astar_full_path(points)
    if result is None:
        print("No valid path found!")
    else:
        final_path, route_ids = result
        export_path_to_csv(final_path, points, "simple_astar_preserve_keys_path.csv")
