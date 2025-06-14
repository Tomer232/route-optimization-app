from flask import Flask, request, jsonify
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
        "version": "1.0.0"
    })

@app.route('/process_csv', methods=['POST'])
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
    print("🚀 Starting ORP Route Optimization Service...")
    print("📍 Health check: http://localhost:5000/health")
    print("🗺️  Route processing: http://localhost:5000/process_csv")
    app.run(debug=True, host='0.0.0.0', port=5000)