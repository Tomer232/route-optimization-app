const express = require('express');
const jwt = require('jsonwebtoken');
const Route = require('../models/Route');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// @route   GET /api/routes
// @desc    Get all routes for the authenticated user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const routes = await Route.find({ userId: req.userId })
      .sort({ favorite: -1, createdAt: -1 }); // Favorites first, then newest

    res.json({
      success: true,
      routes
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching routes'
    });
  }
});

// @route   POST /api/routes
// @desc    Create a new route
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      startPoint,
      endPoint,
      routePoints = [],
      elevationData = [],
      routeStats = {}
    } = req.body;

    const route = new Route({
      userId: req.userId,
      name,
      startPoint,
      endPoint,
      routePoints,
      elevationData,
      routeStats
    });

    await route.save();

    res.status(201).json({
      success: true,
      message: 'Route saved successfully',
      route
    });
  } catch (error) {
    console.error('Error saving route:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving route'
    });
  }
});

// @route   PUT /api/routes/:id
// @desc    Update an existing route
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      startPoint,
      endPoint,
      routePoints = [],
      elevationData = [],
      routeStats = {}
    } = req.body;

    // Find the route and verify ownership
    const route = await Route.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or you do not have permission to update it'
      });
    }

    // Update the route
    route.name = name;
    route.startPoint = startPoint;
    route.endPoint = endPoint;
    route.routePoints = routePoints;
    route.elevationData = elevationData;
    route.routeStats = routeStats;

    await route.save();

    res.json({
      success: true,
      message: 'Route updated successfully',
      route
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating route'
    });
  }
});

// @route   PUT /api/routes/:id/favorite
// @desc    Toggle route favorite status
// @access  Private
router.put('/:id/favorite', authMiddleware, async (req, res) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    route.favorite = !route.favorite;
    await route.save();

    res.json({
      success: true,
      message: 'Route updated successfully',
      route
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating route'
    });
  }
});

// @route   DELETE /api/routes/:id
// @desc    Delete a route
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const route = await Route.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting route'
    });
  }
});

module.exports = router;