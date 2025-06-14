import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { logout, isLoggedIn, isGuest } = useUser()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleMenu = (e) => {
    e.stopPropagation()
    setIsMenuOpen(!isMenuOpen)
  }

  const handleNavigation = (path) => {
    setIsMenuOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    logout()
    navigate('/')
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Burger Menu Icon */}
      <button 
        onClick={toggleMenu}
        className="text-2xl text-orp-light-blue cursor-pointer hover:text-white transition-colors"
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-orp-blue bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg border border-white border-opacity-10 z-50 overflow-hidden animate-fadeIn">
          
          {/* Home Page */}
          <button
            onClick={() => handleNavigation('/home')}
            className="w-full px-4 py-3 text-left text-white hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-3 border-b border-white border-opacity-10"
          >
            <i className="fas fa-home w-5 text-center"></i>
            <span>Home Page</span>
          </button>

          {/* Route Creation */}
          <button
            onClick={() => handleNavigation('/create-route')}
            className="w-full px-4 py-3 text-left text-white hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-3 border-b border-white border-opacity-10"
          >
            <i className="fas fa-map-marked-alt w-5 text-center"></i>
            <span>{isGuest ? 'Try Route Creation' : 'Create Route'}</span>
          </button>

          {/* Logout/Exit */}
          {isLoggedIn() && (
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-white hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-3"
            >
              <i className="fas fa-sign-out-alt w-5 text-center"></i>
              <span>{isGuest ? 'Exit Guest Mode' : 'Logout'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Navigation