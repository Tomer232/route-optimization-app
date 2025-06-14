import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useEffect } from 'react'

const LandingPage = () => {
  const navigate = useNavigate()
  const { isLoggedIn, loginAsGuest } = useUser()

  useEffect(() => {
    // If user is already logged in (including guests), redirect to home
    if (isLoggedIn()) {
      navigate('/home')
    }
  }, [isLoggedIn, navigate])

  const handleLogin = () => {
    navigate('/login')
  }

  // NEW: Handle guest mode
  const handleGuest = () => {
    loginAsGuest() // Set user as guest
    navigate('/home') // Go directly to home page
  }

  return (
    // FIXED: Full screen container with proper background and overlay
    <div className="min-h-screen w-full flex items-center justify-center relative" 
         style={{backgroundImage: "url('/images/landing page background.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
      
      {/* FIXED: Full screen overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      {/* Content container with proper z-index */}
      <div className="relative z-10 flex flex-col items-center justify-center p-5 text-center max-w-3xl w-full">
        {/* Logo */}
        <img 
          src="/images/ORP website logo.png" 
          alt="ORP website logo" 
          className="max-w-64 h-auto mb-0"
        />

        {/* Title */}
        <h1 className="text-white text-5xl font-bold my-3">ORP</h1>
        
        {/* Subtitle */}
        <h2 className="text-white text-2xl my-3 mb-8">Create your next perfect adventure</h2>

        {/* Buttons */}
        <div className="flex justify-center flex-wrap gap-5 w-full max-w-2xl">
          <button 
            onClick={handleLogin}
            className="bg-orp-blue text-white border border-white rounded-lg px-6 py-3 text-base cursor-pointer transition-transform hover:scale-110 min-w-40"
          >
            Log in / Sign Up
          </button>
          
          <button 
            onClick={handleGuest}
            className="bg-orp-blue text-white border border-white rounded-lg px-6 py-3 text-base cursor-pointer transition-transform hover:scale-110 min-w-40"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  )
}

export default LandingPage