# Route Optimization App

An intelligent route optimization application that uses A* pathfinding algorithm to find optimal routes based on elevation data and multiple waypoints.

## 🚀 Features

- **A* Pathfinding Algorithm**: Optimized route calculation with elevation considerations
- **Interactive Map Interface**: React-based frontend with route visualization
- **Multi-waypoint Support**: Plan routes with multiple stops
- **Elevation Analysis**: Smart routing based on terrain elevation
- **Route Management**: Save, edit, and manage your favorite routes
- **Real-time Processing**: Fast route calculation with Python backend

## 🛠️ Tech Stack

**Backend:**
- Python Flask
- A* Algorithm Implementation
- Pandas for data processing
- Flask-CORS for API handling

**Frontend:**
- React.js
- Interactive mapping components
- Modern UI/UX design

**Database:**
- MongoDB for route storage
- User profile management

## 📁 Project Structure

```
route-optimization-app/
├── server.py              # Flask backend server
├── AStar.py              # A* pathfinding algorithm
├── Route.js              # MongoDB route model
├── ProfilePopup.jsx      # React profile component
├── package.json          # Node.js dependencies
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/route-optimization-app.git
   cd route-optimization-app
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

4. **Set up environment variables:**
   Create a `.env` file with your MongoDB connection string and other config.

5. **Run the application:**
   
   **Backend:**
   ```bash
   python server.py
   ```
   
   **Frontend:**
   ```bash
   npm start
   ```

## 🌐 Deployment

This app is configured for easy deployment on platforms like Railway, Render, or Heroku.

### Deploy to Railway
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Flask app
3. Add MongoDB service in Railway dashboard
4. Set environment variables
5. Deploy!

## 📊 API Endpoints

- `GET /health` - Health check
- `POST /process_csv` - Process elevation data from CSV
- `POST /process_route` - Process route with JSON data

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- A* algorithm implementation for optimal pathfinding
- React community for excellent frontend tools
- Flask community for robust backend framework