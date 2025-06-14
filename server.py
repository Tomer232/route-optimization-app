from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import pandas as pd
import io
from AStar import run_astar
import traceback
import os

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Allow all cross-origin requests

# Serve React frontend
@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # For React Router - serve index.html for all unmatched routes
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "ORP Route Optimization Service",
        "version": "1.0.0"
    })

@app.route('/api/process_csv', methods=['POST'])
def process_csv():
    """Process CSV with elevation data and return optimized route"""
    try:
        # Check if file is present
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
        
        # Read CSV data
        df = pd.read_csv(file)
        
        # Validate required columns
        required_columns = ['lat', 'lng', 'elevation', 'point_type']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({
                "success": False,
                "error": f"Missing required columns: {missing_columns}"
            }), 400
        
        # Run A* algorithm
        result = run_astar(df)
        
        return jsonify({
            "success": True,
            "data": {
                "path": result['path'],
                "stats": result['stats'],
                "pathLength": len(result['path'])
            }
        })
        
    except ValueError as e:
        # Handle algorithm-specific errors (like no path found)
        return jsonify({
            "success": False,
            "error": str(e),
            "type": "algorithm_error"
        }), 422
        
    except Exception as e:
        # Handle unexpected errors
        print(f"Error processing route: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": "Internal server error occurred while processing route",
            "type": "server_error"
        }), 500

@app.route('/api/process_route', methods=['POST'])
def process_route():
    """Alternative endpoint that accepts JSON data instead of CSV file"""
    try:
        data = request.get_json()
        
        if not data or 'elevationData' not in data:
            return jsonify({
                "success": False,
                "error": "No elevation data provided"
            }), 400
        
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
        
        # Run A* algorithm
        result = run_astar(df)
        
        return jsonify({
            "success": True,
            "data": {
                "path": result['path'],
                "stats": result['stats'],
                "pathLength": len(result['path'])
            }
        })
        
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "type": "algorithm_error"
        }), 422
        
    except Exception as e:
        print(f"Error processing route: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": "Internal server error occurred while processing route",
            "type": "server_error"
        }), 500

if __name__ == '__main__':
    import os
    print("🚀 Starting ORP Route Optimization Service...")
    print("📍 Health check: /health")
    print("🗺️  Route processing: /api/process_csv")
    print("🌐 Frontend: /")
    
    # Get port from environment (Railway provides this)
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
