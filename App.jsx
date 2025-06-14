import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './App.css'

// Import pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RouteCreationPage from './pages/RouteCreationPage.jsx'

// Context for user authentication
import { UserProvider } from './context/UserContext'

function App() {
  return (
    <UserProvider>
      <Router>
        <div className="min-h-screen bg-landing bg-cover bg-center bg-no-repeat bg-fixed">
          {/* Background overlay */}
          <div className="min-h-screen bg-black bg-opacity-30">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/create-route" element={<RouteCreationPage />} />
            </Routes>
          </div>
        </div>
      </Router>
    </UserProvider>
  )
}

export default App