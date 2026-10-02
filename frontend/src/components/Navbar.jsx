import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { BookOpen, Feather, Library as LibraryIcon, LogOut, User as UserIcon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="border-b border-[#3e3835] bg-[#1a1715]/90 backdrop-blur sticky top-0 z-50 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-[#292524] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-inner group-hover:border-[#d4af37] transition">
            <Feather className="w-5 h-5 transition-transform group-hover:rotate-12" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-[#d4af37] font-serif">
              The Visual Narrator
            </h1>
            <p className="text-xs text-[#a8a29e] hidden sm:block tracking-wide">
              Where memories become legends
            </p>
          </div>
        </Link>

        {/* Navigation links & User actions */}
        <div className="flex items-center gap-2 sm:gap-6">
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === '/dashboard'
                  ? 'bg-[#2e2926] text-[#d4af37] border border-[#d4af37]/30'
                  : 'text-[#d6d3d1] hover:text-[#d4af37] hover:bg-[#25211f]'
              }`}
            >
              <Feather className="w-4 h-4" />
              <span>Drafting Table</span>
            </Link>

            <Link
              to="/library"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === '/library'
                  ? 'bg-[#2e2926] text-[#d4af37] border border-[#d4af37]/30'
                  : 'text-[#d6d3d1] hover:text-[#d4af37] hover:bg-[#25211f]'
              }`}
            >
              <LibraryIcon className="w-4 h-4" />
              <span>The Bookshelf</span>
            </Link>
          </nav>

          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-[#3e3835]">
              <div className="hidden md:flex items-center gap-2 text-sm text-[#d6d3d1]">
                <UserIcon className="w-4 h-4 text-[#d4af37]" />
                <span className="font-medium truncate max-w-[120px]">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-[#f87171] hover:text-[#ef4444] bg-[#2a1d1d] hover:bg-[#382323] px-3 py-1.5 rounded-lg border border-[#7f1d1d]/40 transition font-medium cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
