import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, PlusCircle, Search } from 'lucide-react';

export default function Navbar({ account, connectWallet }) {
  const location = useLocation();

  const navItem = (path, label, Icon) => {
    const active = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-2.5 px-1 py-5 border-b-2 text-[10px] uppercase tracking-[0.18em] font-mono font-bold transition-all duration-300
          ${active
            ? 'border-gold text-gold'
            : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
          }`}
      >
        <Icon size={13} strokeWidth={2.5} />
        {label}
      </Link>
    );
  };

  return (
    <nav className="w-full border-b border-zinc-800 bg-noir-elevated/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-4 py-4 group">
            <div className="w-10 h-10 border border-gold/40 flex items-center justify-center text-gold group-hover:border-gold group-hover:shadow-[0_0_12px_rgba(212,168,83,0.2)] transition-all">
              <Shield size={18} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl leading-none tracking-tight text-zinc-100">SBT Core</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-gold mt-1">Immutable Archive</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center h-full gap-6">
            {navItem('/', 'Registry', LayoutDashboard)}
            {navItem('/mint', 'Issue', PlusCircle)}
            {navItem('/verify', 'Verify', Search)}
          </div>
        </div>

        {/* Right: Wallet */}
        <div className="py-4">
          {account ? (
            <div className="font-mono text-[11px] font-medium border border-zinc-700 bg-zinc-900 px-4 py-2.5 flex items-center gap-3 text-zinc-300">
              <span className="w-1.5 h-1.5 bg-verified rounded-full animate-glow-pulse"></span>
              {account.substring(0, 6)}···{account.substring(account.length - 4)}
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-gold text-noir px-5 py-3 hover:shadow-[0_0_24px_rgba(212,168,83,0.3)] transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
