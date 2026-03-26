import { Link } from 'react-router-dom';
import { ChevronDown, Settings } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { resolveMediaUrl } from '@/services/api';
import NotificationCenter from './NotificationCenter';
import tesLogo from '@/pages/images/ChatGPT Image Nov 17, 2025, 04_28_14 PM.png';

const AdministratorHeader = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const profileImage = resolveMediaUrl(user?.profile_image);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="relative border-b border-[rgba(0,255,180,0.10)] bg-[rgba(20,30,40,0.55)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/5" />
        <div className="mx-auto flex h-16 items-center justify-between pl-6 pr-4 md:pr-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center h-full transition-all duration-300 group">
              <div className="relative flex-shrink-0">
                <img
                  src={tesLogo}
                  alt="TesMarket"
                  className="block h-16 w-auto object-contain drop-shadow-xl scale-150 origin-left"
                />
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-[rgba(20,30,40,0.55)] border border-[rgba(0,255,180,0.10)] px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-200">Live</span>
            </div>

            <NotificationCenter />

            <Link
              to="/administrator/settings"
              className="p-2 rounded-xl border border-[rgba(0,255,180,0.10)] bg-[rgba(20,30,40,0.55)] hover:bg-[rgba(20,30,40,0.75)] hover:border-[rgba(0,255,180,0.18)] transition-all duration-300"
              title="Settings"
            >
              <Settings className="h-5 w-5 text-[#E6EDF3]" />
            </Link>

            <Link
              to="/profile"
              className="hidden md:flex items-center gap-2 rounded-xl border border-[rgba(0,255,180,0.10)] bg-[rgba(20,30,40,0.55)] px-3 py-2 text-xs font-semibold text-[#E6EDF3] hover:bg-[rgba(20,30,40,0.75)] transition"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user?.first_name || 'Admin'}
                  className="h-6 w-6 rounded-full object-cover border border-emerald-400/20"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-400/20" />
              )}
              <span className="max-w-[140px] truncate">Account</span>
              <ChevronDown className="h-4 w-4 text-[#9AA4AF]" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdministratorHeader;