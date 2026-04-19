import { useAuth0 } from '@auth0/auth0-react'
import { User } from 'lucide-react'

interface NavbarProps {
  onToggleOpenSidebar?: () => void
}

const Navbar = ({ onToggleOpenSidebar }: NavbarProps) => {
  const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0()

  return (
    <div className='flex items-center justify-between p-4 sticky top-0 backdrop-blur-md z-10 gap-2'>

      <div className='flex items-center justify-between h-15 px-4 gap-2'>
        <img
          src='/assets/logo.png'
          className='h-full w-auto object-contain'
          alt='SoundCircle logo'
        />
      </div>

      <div className='flex gap-3 items-center shrink-0'>

        {isAuthenticated && (
          <div className='p-1 px-2 rounded-lg border border-white/10 bg-slate-900/90 flex md:hidden'>
            <button
              onClick={onToggleOpenSidebar}
              className="flex items-center justify-center text-indigo-400 hover:text-indigo-300"
            >
              <User className="size-5" />
            </button>
          </div>
        )}

        <div className='flex items-center gap-2'>

          {!isAuthenticated ? (
            <button
              onClick={() => loginWithRedirect()}
              className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white"
            >
              Sign in
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                {user?.name || user?.email}
              </span>

              <button
                onClick={() =>
                  logout({
                    logoutParams: { returnTo: window.location.origin }
                  })
                }
                className="px-3 py-2 text-sm bg-red-500/80 hover:bg-red-500 rounded-lg text-white"
              >
                Logout
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}

export default Navbar