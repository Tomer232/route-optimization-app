# server.py - COMPLETE FIXED VERSION

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import pandas as pd
import io
from AStar import run_astar
import traceback

app = Flask(__name__)
CORS(app)  # Allow all cross-origin requests

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "ORP Route Optimization Service",
        "version": "2.1.0-FIXED",
        "features": [
            "Sequential A* pathfinding (FIXED MESH BUG)",
            "Elevation-aware routing", 
            "CSV processing",
            "Multi-waypoint sequential routing"
        ]
    })

@app.route('/process_csv', methods=['POST'])
def process_csv():
    """FIXED: Process CSV with elevation data and return sequential route as CSV"""
    try:
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "No file provided"
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400
        
        print(f"📄 Processing uploaded CSV: {file.filename}")
        
        df = pd.read_csv(file)
        print(f"📊 CSV contains {len(df)} rows")
        
        required_columns = ['lat', 'lng', 'elevation', 'point_type']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({
                "success": False,
                "error": f"Missing required columns: {missing_columns}"
            }), 400
        
        print(f"📊 Processing {len(df)} elevation points...")
        
        # Count waypoints to determine routing strategy
        waypoint_types = df['point_type'].unique()
        waypoint_count = len([t for t in waypoint_types if t in ['start', 'end'] or t.startswith('w')])
        
        print(f"🎯 Detected {waypoint_count} waypoints: {sorted(waypoint_types)}")
        
        if waypoint_count == 2:
            print("📍 2-waypoint route: Using simple A* (works perfectly)")
        else:
            print(f"📍 {waypoint_count}-waypoint route: Using FIXED SEQUENTIAL A* (no more mesh!)")
        
        # Run the FIXED A* algorithm (auto-detects 2-point vs multi-point)
        print("🔄 Running FIXED A* algorithm...")
        result = run_astar(df)
        
        print(f"✅ Generated SEQUENTIAL route with {result['pathLength']} points")
        
        # Return as CSV format (same as working 2-point version)
        path_coordinates = result['path']
        
        # Create CSV response
        csv_lines = ['lat,lng']  # Header
        for coord in path_coordinates:
            csv_lines.append(f"{coord['lat']:.10f},{coord['lng']:.10f}")
        
        csv_content = '\n'.join(csv_lines)
        
        print(f"✅ Returning CSV with {len(path_coordinates)} sequential path points")
        
        # Return as plain text CSV (same format as working version)
        return csv_content, 200, {'Content-Type': 'text/plain'}
        
    except ValueError as e:
        print(f"❌ Algorithm error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "type": "algorithm_error"
        }), 422
        
    except Exception as e:
        print(f"❌ Error processing route: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": "Internal server error occurred while processing route",
            "type": "server_error"
        }), 500

@app.route('/process_route', methods=['POST'])
def process_route():
    """Alternative endpoint that accepts JSON data instead of CSV file"""
    try:
        data = request.get_json()
        
        if not data or 'elevationData' not in data:
            return jsonify({
                "success": False,
                "error": "No elevation data provided"
            }), 400
        
        print("🔄 Processing JSON elevation data...")
        
        # Convert JSON to DataFrame
        df = pd.DataFrame(data['elevationData'])
        
        # Validate required columns
        required_columns = ['lat', 'lng', 'elevation', 'point_type']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({
                "success": False,
                "error": f"Missing required columns: {missing_columns}"
            }), 400
        
        print(f"📊 Processing {len(df)} elevation points...")
        
        # Run A* algorithm
        result = run_astar(df)
        
        print(f"✅ Generated route with {result['pathLength']} points")
        
        return jsonify({
            "success": True,
            "data": result
        })
        
    except ValueError as e:
        print(f"❌ Algorithm error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "type": "algorithm_error"
        }), 422
        
    except Exception as e:
        print(f"❌ Error processing route: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": "Internal server error occurred while processing route",
            "type": "server_error"
        }), 500

@app.route('/optimize_route', methods=['POST'])
def optimize_route():
    """Simplified endpoint for quick route optimization with waypoints"""
    try:
        data = request.get_json()
        waypoints = data.get('waypoints', [])
        
        if len(waypoints) < 2:
            return jsonify({
                "success": False,
                "error": "At least 2 waypoints required"
            }), 400
        
        print(f"🔄 Quick optimization for {len(waypoints)} waypoints")
        
        # Create a simple elevation dataset without dense grid
        elevation_data = []
        for i, wp in enumerate(waypoints):
            point_type = 'start' if i == 0 else 'end' if i == len(waypoints) - 1 else f'w{i}'
            elevation_data.append({
                'lat': wp['lat'],
                'lng': wp['lng'],
                'elevation': wp.get('elevation', 100.0),  # Use provided elevation or default
                'point_type': point_type
            })
        
        df = pd.DataFrame(elevation_data)
        result = run_astar(df)
        
        return jsonify({
            "success": True,
            "data": result,
            "message": "Route optimized with FIXED sequential pathfinding"
        })
        
    except Exception as e:
        print(f"❌ Error in optimize_route: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "type": "optimization_error"
        }), 500

if __name__ == '__main__':
    print("🚀 Starting ORP Route Optimization Service - PRODUCTION")
    print("🔧 MESH BUG FIXED: Sequential waypoint routing implemented")
    
    # Railway will set the PORT environment variable
    import os
    port = int(os.environ.get('PORT', 8080))
    
    print(f"📡 Server starting on port {port}")
    print("🗺️  Production Endpoints:")
    print("   - GET  /health - Service health check")
    print("   - POST /process_csv - Process uploaded CSV with elevation data")
    print("   - POST /process_route - Process JSON elevation data")
    print("   - POST /optimize_route - Quick route optimization")
    print("🔧 Configuration:")
    print("   - ✅ 2-waypoint routes: Simple A*")
    print("   - ✅ 3+ waypoint routes: Sequential A*")
    print("   - ✅ Production mode: debug=False")
    
    # Production configuration
    app.run(
        debug=False,        # Production mode
        host='0.0.0.0',    # Accept external connections
        port=port          # Use Railway's assigned port
    )
