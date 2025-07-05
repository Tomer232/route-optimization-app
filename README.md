#ORP – Optimal Route Planning
A web-based system for generating optimal off-road routes based on user-defined waypoints.

Live deployment: https://clever-recreation-production.up.railway.app/

Project Overview
ORP enables users to plan multi-day off-road routes by selecting custom start, end, and intermediate points on an interactive map. The system dynamically calculates and displays an optimized walking route between the points. Users can test the system in guest mode or log in to save and revisit their routes.

Technology Stack
Frontend
React.js

JavaScript (ES6+)

HTML5, CSS3

Google Maps JavaScript API

Axios

Backend
Python (Flask)

MongoDB (Atlas)

Railway (deployment)

Core Features
Interactive map-based waypoint selection

Add, reposition, and delete route points

Guest mode for quick use without login

Account-based route saving and history

Dynamic route generation using terrain-aware pathfinding

GPX export for offline use

10 km radius limit per route

Responsive user interface

Route Calculation
The routing algorithm is a customized implementation of A*, adapted to suit off-road walking scenarios. It evaluates nearby points based on elevation data retrieved from the Google Maps Elevation API. The system prioritizes paths that do not exceed a 30% incline, simulating realistic walking conditions across varying terrains.
