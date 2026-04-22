import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, PlusCircle, Search } from 'lucide-react';

export default function Navbar({ account, connectWallet }) {
  const location = useLocation();

  const navItem = (path, label, Icon) => {
    const active = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium font-body transition-all
          ${active
            ? 'bg-primary/10 text-primary'
            : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
          }`}
      >
        <Icon size={16} />
        {label}
      </Link>
    );
  };

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-card bg-gradient-to-br from-secondary to-primary-container flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-on-surface tracking-tight">SBT Core</span>
              <p className="font-label text-[10px] text-on-surface-variant tracking-wide uppercase">Ethereal Archive</p>
            </div>
          </Link>

          {/* Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navItem('/', 'Dashboard', LayoutDashboard)}
            {navItem('/mint', 'Mint', PlusCircle)}
            {navItem('/verify', 'Verify', Search)}
          </div>
        </div>

        {/* Wallet */}
        {account ? (
          <div className="flex items-center gap-3 bg-surface-lowest rounded-btn px-4 py-2.5 shadow-ambient">
            <span className="w-2 h-2 rounded-full bg-verified animate-pulse"></span>
            <span className="font-label text-xs font-medium text-on-surface">
              {account.substring(0, 6)}···{account.substring(account.length - 4)}
            </span>
          </div>
        ) : (
          <button onClick={connectWallet} className="btn-gradient text-sm">
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
