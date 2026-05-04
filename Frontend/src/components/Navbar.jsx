import { Link, useLocation } from 'react-router-dom';
import { Database, PlusSquare, Search, Wallet } from 'lucide-react';

export default function Navbar({ account, connectWallet }) {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'DASHBOARD', icon: Database },
    { path: '/mint', label: 'ISSUE', icon: PlusSquare },
    { path: '/verify', label: 'VERIFY', icon: Search },
  ];

  return (
    <nav className="w-full border-b-2 border-black bg-white sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto flex items-stretch h-20">
        
        {/* Logo Section */}
        <div className="flex items-center px-6 border-r-2 border-black shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-mono font-bold text-xs group-hover:rotate-90 transition-transform duration-300">
              SBT
            </div>
            <span className="font-display font-black text-xl tracking-tighter uppercase hidden sm:block">
              Soulbound
            </span>
          </Link>
        </div>

        {/* Links Section */}
        <div className="flex flex-1 overflow-x-auto hide-scrollbar">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-6 border-r-2 border-black font-mono text-sm font-bold tracking-widest transition-colors ${
                  isActive ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
                }`}
              >
                <Icon size={16} strokeWidth={2.5} />
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Wallet Section */}
        <div className="flex items-center px-4 md:px-6 shrink-0 bg-white">
          {account ? (
            <div className="flex flex-col items-end justify-center h-full">
              <span className="font-mono text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Connected</span>
              <span className="font-mono text-sm font-bold bg-neutral-100 px-2 py-1 border border-black">
                {account.substring(0, 6)}...{account.substring(account.length - 4)}
              </span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="brutal-btn flex items-center gap-2 !py-2 !px-4"
            >
              <Wallet size={16} />
              <span className="hidden sm:inline">CONNECT</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
