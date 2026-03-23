import { Loader } from "lucide-react"
import { useEffect, useRef } from "react"
import { useUser } from "@clerk/clerk-react"
import { useNavigate } from "react-router-dom"
import { axiosInstance } from "../../lib/axios"

const AuthCallbackPage = () => {
  console.log('=== AuthCallbackPage mounted ===')
  const { isLoaded, user } = useUser()
  console.log('isLoaded:', isLoaded, 'user:', user?.id)
  const navigate = useNavigate()
  const syncAttempted = useRef(false)
 
  useEffect(() => {
    const syncUser = async () => {
    console.log('syncUser called', { isLoaded, userId: user?.id, attempted: syncAttempted.current })
    if (!isLoaded || !user || syncAttempted.current) return
    
    console.log('syncUser firing, user:', user.id)
    console.log('posting to:', axiosInstance.defaults.baseURL + '/auth/callback')
    
    try {
        syncAttempted.current = true
        const res = await axiosInstance.post("/auth/callback", {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
        })
        console.log('response:', res.data)
    } catch (error) {
        console.error("Error in auth callback:", error)
    } finally {
        navigate("/")
    }
}
 
    syncUser()
  }, [isLoaded, user, navigate])
 
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#eef2ff] to-[#f8fafc]">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/80 w-[90%] max-w-sm p-8 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="text-slate-900 font-semibold text-lg">Logging you in</h3>
          <p className="text-slate-400 text-sm mt-1">Hang tight, redirecting you now...</p>
        </div>
      </div>
    </div>
  )
}
 
export default AuthCallbackPage