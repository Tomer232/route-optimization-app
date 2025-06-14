import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true) // Toggle between login and register
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login, register } = useUser()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isLogin) {
        await login(formData.email, formData.password)
      } else {
        await register(formData)
      }
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md w-full bg-orp-blue bg-opacity-50 rounded-xl">
        {/* Logo */}
        <img 
          src="/images/ORP website logo.png" 
          alt="ORP website logo" 
          className="max-w-48 h-auto mb-0"
        />

        {/* Title */}
        <h1 className="text-white text-4xl font-bold my-3">ORP</h1>
        <h2 className="text-white text-lg mb-6">
          {isLogin ? 'Welcome Back!' : 'Create Your Account'}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          {/* Registration Fields */}
          {!isLogin && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                name="firstName"
                placeholder="First Name (optional)"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg text-base"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name (optional)"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg text-base"
              />
            </div>
          )}

          {/* Email and Password */}
          <div className="mb-5">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg text-base"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg text-base"
              required
              minLength="6"
            />
            
            {error && (
              <div className="text-red-300 text-sm mb-4 p-2 bg-red-500 bg-opacity-20 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`btn-primary w-full mb-4 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Please wait...' : (isLogin ? 'Log in' : 'Create Account')}
          </button>

          {/* Toggle Login/Register */}
          <div className="text-center">
            <span className="text-white text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setFormData({
                  email: '',
                  password: '',
                  firstName: '',
                  lastName: ''
                })
              }}
              className="text-orp-cream text-sm underline bg-transparent border-none cursor-pointer"
            >
              {isLogin ? 'Sign up here' : 'Login here'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage