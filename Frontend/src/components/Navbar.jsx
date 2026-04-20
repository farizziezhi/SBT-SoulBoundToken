import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, PlusCircle, Search } from 'lucide-react';

export default function Navbar({ account, connectWallet }) {
  const location = useLocation();
  
  const navItem = (path, name, Icon) => {
    const isActive = location.pathname === path;
    return (
      <Link 
        to={path} 
        className={`flex items-center gap-2 px-1 py-6 border-b-2 text-xs uppercase tracking-[0.15em] font-mono font-bold transition-all duration-300 ${isActive ? 'border-institutional text-institutional' : 'border-transparent hover:border-slate-300 text-slate-500 hover:text-slate-900'}`}
      >
        <Icon size={14} className="stroke-2" />
        {name}
      </Link>
    );
  };

  return (
    <nav className="w-full border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-12">
          {/* Logo block */}
          <Link to="/" className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 border border-slate-900 flex items-center justify-center text-slate-900">
              <Shield size={20} className="stroke-[1.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-xl leading-none tracking-tight uppercase">SBT Core</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-institutional mt-1">Immutable</span>
            </div>
          </Link>
          
          {/* Nav links */}
          <div className="hidden md:flex items-center h-full gap-8">
            {navItem('/', 'Dashboard', LayoutDashboard)}
            {navItem('/mint', 'Mint_Access', PlusCircle)}
            {navItem('/verify', 'Verify_Query', Search)}
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="py-4">
          {account ? (
            <div className="font-mono text-xs font-bold border border-slate-200 px-4 py-2 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-institutional animate-pulse"></span>
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold bg-slate-900 text-white px-6 py-3 hover:bg-institutional transition-colors"
            >
              Auth / Connect
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
