import { useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'

const ProtectedRoute = () => {
  const { userId } = useAuth()

  if (!userId) return <Navigate to="/" replace />

  return <Outlet />
}

export default ProtectedRoute