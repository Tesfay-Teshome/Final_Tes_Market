import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, List, ShoppingBag, DollarSign, Home, Wallet } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  const menuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: '/vendor/dashboard'
    },
    {
      title: 'Products',
      icon: <Package className="h-5 w-5" />,
      path: '/vendor/products',
      subItems: [
        { title: 'All Products', path: '/vendor/products' },
        { title: 'Add New', path: '/vendor/products/new' }
      ]
    },
    {
      title: 'Categories',
      icon: <List className="h-5 w-5" />,
      path: '/vendor/categories',
      subItems: [
        { title: 'All Categories', path: '/vendor/categories' },
        { title: 'Add New', path: '/vendor/categories/new' }
      ]
    },
    {
      title: 'Orders',
      icon: <ShoppingBag className="h-5 w-5" />,
      path: '/vendor/orders'
    },
    {
      title: 'Earnings',
      icon: <DollarSign className="h-5 w-5" />,
      path: '/vendor/earnings'
    },
    {
      title: 'Withdraw',
      icon: <Wallet className="h-5 w-5" />,
      path: '/vendor/payout'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Logo/Brand */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">Tes Market</h1>
        <p className="text-sm text-gray-500">Vendor Panel</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                isActive(item.path) 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-gray-500">{item.icon}</span>
              <span className="ml-3">{item.title}</span>
            </Link>
            
            {/* Sub-items */}
            {item.subItems && (
              <div className="ml-8 mt-1 space-y-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    className={`block px-3 py-2 text-sm rounded-md ${
                      isActive(subItem.path)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t">
        <Link 
          to="/" 
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Store
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
