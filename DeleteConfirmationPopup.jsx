import React from 'react'

const DeleteConfirmationPopup = ({ route, onConfirm, onCancel }) => {
  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  if (!route) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-orp-blue bg-opacity-95 rounded-lg shadow-2xl border border-white border-opacity-30 w-full max-w-md animate-fadeIn">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white border-opacity-20">
          <h2 className="text-xl font-bold text-orp-light-blue">Delete Route</h2>
          <button
            onClick={onCancel}
            className="text-white hover:text-red-300 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🗑️</div>
            <p className="text-white text-lg mb-2">
              Are you sure you want to delete
            </p>
            <p className="text-orp-light-blue text-xl font-semibold mb-4">
              '{route.name}'?
            </p>
            <p className="text-orp-cream text-sm opacity-75">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t border-white border-opacity-20">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-orp-blue bg-opacity-50 text-white rounded-lg border border-white hover:bg-opacity-70 transition-colors font-semibold"
          >
            No, Keep Route
          </button>
          
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationPopup