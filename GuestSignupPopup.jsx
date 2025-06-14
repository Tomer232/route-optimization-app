import React from 'react'
import { useNavigate } from 'react-router-dom'

const GuestSignupPopup = ({ onClose, onContinueAsGuest }) => {
  const navigate = useNavigate()

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // FIXED: Add delay and logging to debug the issue
  const handleSignUp = () => {
    console.log('🚀 Sign up button clicked - showing popup first!')
    // Give user time to see the popup before redirecting
    setTimeout(() => {
      console.log('🔄 Redirecting to login page...')
      navigate('/login')
    }, 300) // 300ms delay to ensure popup is visible
  }

  const handleContinueAsGuest = () => {
    console.log('👤 Continue as guest clicked')
    onContinueAsGuest() // Continue as guest
    onClose() // Close popup
  }

  // DEBUGGING: Add console log to confirm popup renders
  console.log('🎭 GuestSignupPopup is rendering!')

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ 
        zIndex: 9999, // Ensure it's on top
        pointerEvents: 'auto' // Ensure it receives clicks
      }}
    >
      <div 
        className="bg-orp-blue bg-opacity-95 rounded-lg shadow-2xl border border-white border-opacity-30 w-full max-w-md animate-fadeIn"
        onClick={(e) => e.stopPropagation()} // Prevent popup close when clicking inside
      >
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white border-opacity-20">
          <h2 className="text-xl font-bold text-orp-light-blue">Save Your Route</h2>
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
            <div className="mx-auto w-16 h-16 bg-yellow-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <i className="fas fa-save text-2xl text-yellow-400"></i>
            </div>
          </div>

          {/* Message */}
          <h3 className="text-orp-light-blue text-lg font-semibold mb-3">
            Sign Up to Save Your Route
          </h3>
          <p className="text-orp-cream text-sm mb-6 leading-relaxed">
            To save your route permanently and access it later, you need to create an account. 
            It's quick and free!
          </p>

          {/* Benefits */}
          <div className="bg-black bg-opacity-20 p-4 rounded-lg mb-6 text-left">
            <p className="text-orp-cream text-xs font-semibold mb-2">With an account you can:</p>
            <ul className="text-orp-cream text-xs space-y-1">
              <li>• Save routes permanently</li>
              <li>• Access your routes from any device</li>
              <li>• Mark favorite routes</li>
              <li>• Track your adventure statistics</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSignUp}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              🚀 Sign Up Now
            </button>
            
            <button
              onClick={handleContinueAsGuest}
              className="w-full px-6 py-3 bg-orp-blue bg-opacity-50 text-white rounded-lg border border-white hover:bg-opacity-70 transition-colors"
            >
              Continue as Guest
            </button>
          </div>

          {/* Small note */}
          <p className="text-orp-cream text-xs mt-4 opacity-75">
            You can continue exploring without signing up, but your routes won't be saved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default GuestSignupPopup