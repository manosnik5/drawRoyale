import { SignedOut, useAuth, UserButton } from '@clerk/clerk-react';
import SignInOAuthButton from './SignInOAuthButton';
import { User } from 'lucide-react';

interface NavbarProps {
  onToggleOpenSidebar?: () => void
}

const Navbar = ({onToggleOpenSidebar}: NavbarProps) => {
  const { userId } = useAuth()
  return (
    <div className='flex items-center justify-between p-4 sticky top-0 backdrop-blur-md z-10 gap-2'>
      
      <div className='flex items-center justify-between h-15 px-4 sticky top-0 backdrop-blur-md z-10 gap-2'>
        <img
          src='/assets/logo.png'
          className='h-full w-auto object-contain'
          alt='SoundCircle logo'
        />
      </div>
      
      <div className='flex gap-3 items-center shrink-0'> 
        {userId && (
           <div className='p-1 px-2 rounded-lg border border-white/10 bg-slate-900/90 flex md:hidden'>
           <button
            onClick={onToggleOpenSidebar}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors py-1"
          >
            <User className="size-5 " />
          </button>
          </div>
        )}
       
       
          <div className='flex items-center gap-2'>
            <SignedOut>
              <SignInOAuthButton />
            </SignedOut>
            <UserButton />
          </div>
        
      </div>
    </div>
  );
  
}

export default Navbar