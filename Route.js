const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  startPoint: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  endPoint: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  routePoints: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    elevation: { type: Number } // ADD elevation to route points
  }],
  elevationData: [{
    lat: Number,
    lng: Number,
    elevation: Number,
    pointType: String
  }],
  routeStats: {
    distance: Number,
    
    // UPDATED: Support both old and new elevation formats for backward compatibility
    elevationGain: Number,              // OLD format (keep for existing routes)
    elevationLoss: Number,              // OLD format (keep for existing routes) 
    netElevationChange: Number,         // NEW format (net elevation from start to finish)
    
    highestPoint: Number,               // NEW field
    lowestPoint: Number,                // NEW field
    
    // Keep old fields for backward compatibility
    sharpestInclination: Number,
    lowestInclination: Number
  },
  favorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
RouteSchema.index({ userId: 1, createdAt: -1 });
RouteSchema.index({ userId: 1, favorite: -1 });

module.exports = mongoose.model('Route', RouteSchema);