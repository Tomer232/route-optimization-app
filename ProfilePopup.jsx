import React, { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { authAPI } from '../services/api'

const ProfilePopup = ({ onClose }) => {
  const { user, updateUser } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile') // 'profile', 'password', 'stats'
  const [message, setMessage] = useState(null)
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  })
  
  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Statistics data
  const [stats, setStats] = useState({
    totalRoutes: 0,
    favoriteRoutes: 0,
    totalDistance: 0,
    longestRoute: 0,
    adventurerSince: null
  })

  // Load user statistics when component mounts
  useEffect(() => {
    loadUserStats()
  }, [])

  const loadUserStats = async () => {
    try {
      const response = await authAPI.getStats()
      if (response.success) {
        setStats(response.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      setMessage({ type: 'error', text: 'Please fill in both first and last name' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await authAPI.updateProfile({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim()
      })

      if (response.success) {
        // Update user context
        updateUser({
          ...user,
          firstName: profileData.firstName.trim(),
          lastName: profileData.lastName.trim()
        })
        
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        throw new Error(response.message || 'Failed to update profile')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })

      if (response.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        throw new Error(response.message || 'Failed to change password')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      })
    } catch {
      return 'Unknown'
    }
  }

  const formatDistance = (meters) => {
    if (!meters) return '0 km'
    return (meters / 1000).toFixed(1) + ' km'
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-orp-blue bg-opacity-95 rounded-lg shadow-2xl border border-white border-opacity-30 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white border-opacity-20">
          <h2 className="text-2xl font-bold text-orp-light-blue">Profile Settings</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-300 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white border-opacity-20">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-orp-light-blue border-b-2 border-orp-light-blue bg-white bg-opacity-10'
                : 'text-orp-cream hover:text-orp-light-blue'
            }`}
          >
            👤 Personal Info
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'password'
                ? 'text-orp-light-blue border-b-2 border-orp-light-blue bg-white bg-opacity-10'
                : 'text-orp-cream hover:text-orp-light-blue'
            }`}
          >
            🔐 Change Password
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-orp-light-blue border-b-2 border-orp-light-blue bg-white bg-opacity-10'
                : 'text-orp-cream hover:text-orp-light-blue'
            }`}
          >
            📊 Statistics
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-center ${
              message.type === 'success' 
                ? 'bg-green-500 bg-opacity-20 text-green-200' 
                : 'bg-red-500 bg-opacity-20 text-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h3 className="text-orp-light-blue text-lg font-semibold mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-orp-cream text-sm mb-2">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white bg-opacity-90"
                    placeholder="Enter first name"
                    autoComplete="given-name"
                    name="profileFirstName"
                    id="profileFirstNameInput"
                  />
                </div>
                
                <div>
                  <label className="block text-orp-cream text-sm mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white bg-opacity-90"
                    placeholder="Enter last name"
                    autoComplete="family-name"
                    name="profileLastName"
                    id="profileLastNameInput"
                  />
                </div>
              </div>

              <div className="bg-black bg-opacity-20 p-4 rounded-lg">
                <div className="text-orp-cream text-sm mb-1">Email Address</div>
                <div className="text-white">{user?.email}</div>
                <div className="text-xs text-orp-cream opacity-75 mt-1">Email cannot be changed</div>
              </div>

              <button
                onClick={handleProfileUpdate}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
              >
                {isLoading ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}

          {/* Password Tab - FIXED: Isolated form inputs */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <h3 className="text-orp-light-blue text-lg font-semibold mb-4">Change Password</h3>
              
              <div>
                <label className="block text-orp-cream text-sm mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white bg-opacity-90"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  name="profileCurrentPassword"
                  id="profileCurrentPasswordInput"
                />
              </div>

              <div>
                <label className="block text-orp-cream text-sm mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white bg-opacity-90"
                  placeholder="Enter new password (min 6 characters)"
                  autoComplete="new-password"
                  name="profileNewPassword"
                  id="profileNewPasswordInput"
                />
              </div>

              <div>
                <label className="block text-orp-cream text-sm mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white bg-opacity-90"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  name="profileConfirmPassword"
                  id="profileConfirmPasswordInput"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
              >
                {isLoading ? '🔐 Changing...' : '🔐 Change Password'}
              </button>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-orp-light-blue text-lg font-semibold mb-4">Your Adventure Statistics</h3>
              
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
                  <div className="text-orp-cream text-sm">Total Routes</div>
                  <div className="text-white text-2xl font-semibold">{stats.totalRoutes}</div>
                </div>
                
                <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
                  <div className="text-orp-cream text-sm">Favorite Routes</div>
                  <div className="text-yellow-400 text-2xl font-semibold">{stats.favoriteRoutes}</div>
                </div>
                
                <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
                  <div className="text-orp-cream text-sm">Total Distance</div>
                  <div className="text-green-400 text-2xl font-semibold">{formatDistance(stats.totalDistance)}</div>
                </div>
                
                <div className="bg-black bg-opacity-20 p-4 rounded-lg text-center">
                  <div className="text-orp-cream text-sm">Longest Route</div>
                  <div className="text-blue-400 text-2xl font-semibold">{formatDistance(stats.longestRoute)}</div>
                </div>
              </div>

              {/* Adventure Info */}
              <div className="bg-black bg-opacity-20 p-6 rounded-lg text-center">
                <div className="text-orp-light-blue text-xl mb-2">🏔️ Adventurer Since</div>
                <div className="text-white text-lg font-semibold">
                  {stats.adventurerSince ? formatDate(stats.adventurerSince) : 'Just getting started!'}
                </div>
                {stats.totalRoutes > 0 && (
                  <div className="text-orp-cream text-sm mt-2 opacity-75">
                    Keep exploring and creating amazing routes!
                  </div>
                )}
              </div>

              {/* Refresh Stats Button */}
              <button
                onClick={loadUserStats}
                className="w-full px-6 py-3 bg-orp-blue bg-opacity-50 text-white rounded-lg border border-white hover:bg-opacity-70 transition-colors"
              >
                🔄 Refresh Statistics
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePopup