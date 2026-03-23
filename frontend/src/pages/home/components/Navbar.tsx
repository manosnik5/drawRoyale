import { SignedOut, UserButton } from '@clerk/clerk-react';
import SignInOAuthButton from './SignInOAuthButton';
import { User } from 'lucide-react';

interface NavbarProps {
  onToggleOpenSidebar?: () => void
}

const Navbar = ({onToggleOpenSidebar}: NavbarProps) => {
  return (
    <div className='flex items-center justify-between p-4 sticky top-0 backdrop-blur-md z-10 gap-2'>
      
      <div className='flex gap-2 items-center shrink-0'>
        <img src='/favicon.svg' className='size-15' alt='SoundCircle logo' />
      </div>
      
      <div className='flex gap-3 items-center shrink-0'> 
        <div className='p-1 px-2 rounded-lg border border-white/10 bg-slate-900/90 flex md:hidden'>
           <button
          onClick={onToggleOpenSidebar}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors py-1"
        >
          <User className="size-5 " />
        </button>
        </div>
       
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