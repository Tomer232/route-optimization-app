import React from 'react'

const MarkerLimitPopup = ({ onClose }) => {
  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-orp-blue bg-opacity-95 rounded-lg shadow-2xl border border-white border-opacity-30 w-full max-w-md animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white border-opacity-20">
          <h2 className="text-xl font-bold text-orp-light-blue">Marker Limit Reached</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-300 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-orange-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <i className="fas fa-map-marker-alt text-2xl text-orange-400"></i>
            </div>
          </div>

          {/* Message */}
          <h3 className="text-orp-light-blue text-lg font-semibold mb-3">
            Oops! You can only place up to 5 markers for each route.
          </h3>
          <p className="text-orp-cream text-sm mb-6 leading-relaxed">
            To add a new marker, please remove an existing one first by right-clicking on it.
          </p>

          {/* Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-orp-blue bg-opacity-50 text-white rounded-lg border border-white hover:bg-opacity-70 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

export default MarkerLimitPopup