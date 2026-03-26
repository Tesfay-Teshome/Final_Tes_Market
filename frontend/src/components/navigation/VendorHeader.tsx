import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

const VendorHeader = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Vendor Dashboard</h1>
        <div className="flex items-center space-x-4">
          <NotificationCenter />
          <Link 
            to="/vendor/settings"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            title="Settings"
          >
            <Settings className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default VendorHeader;