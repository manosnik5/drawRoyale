import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";

const AuthCallbackPage = () => {
  const { user, isAuthenticated } = useAuth0()
  const navigate = useNavigate()
  const synced = useRef(false)

  useEffect(() => {
    const syncUser = async () => {
      if (!isAuthenticated || !user || synced.current) return
      synced.current = true

      try {
        // Use fetch directly — bypasses axios interceptor entirely
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: user.sub,
            firstName: user.given_name,
            lastName: user.family_name,
            imageUrl: user.picture,
            email: user.email,
          }),
        })
      } catch (err) {
        console.error('sync failed:', err)
      } finally {
        navigate('/')
      }
    }

    syncUser()
  }, [isAuthenticated, user])

  return <div>Logging you in...</div>
}

export default AuthCallbackPage;