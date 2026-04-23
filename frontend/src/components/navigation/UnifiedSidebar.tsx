import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
  CreditCard,
  MessageSquare,
  Home,
  ShoppingBag,
  FolderTree,
  ListTree,
  Menu,
  X,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  User,
  Search
} from 'lucide-react';
import { RootState } from '@/store';
import { messagingAPI } from '@/services/api';

interface MenuItem {
  to: string;
  icon: any;
  label: string;
  subItems?: MenuItem[];
  badge?: number;
}

interface Conversation {
  id: string;
  participants: any[];
  last_message?: any;
  updated_at: string;
}

const UnifiedSidebar = () => {
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');

  // Fetch conversations for messaging
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await messagingAPI.getConversations();
      return response.data || [];
    },
    enabled: !!user,
    retry: false, // Don't retry on 401 errors
  });

  const getMenuItems = (): MenuItem[] => {
    if (!user) return [];

    const baseItems = [
      {
        to: '/',
        icon: Home,
        label: 'Home',
      }
    ];

    if (user.user_type === 'administrator') {
      return [
        ...baseItems,
        {
          to: '/administrator',
          icon: LayoutDashboard,
          label: 'Dashboard',
        },
        {
          to: '/administrator/users',
          icon: Users,
          label: 'Users',
        },
        {
          to: '/administrator/vendors',
          icon: Building2,
          label: 'Vendors',
        },
        {
          to: '/administrator/products',
          icon: ShoppingBag,
          label: 'Products',
        },
        {
          to: '/administrator/categories',
          icon: FolderTree,
          label: 'Categories',
        },
        {
          to: '/administrator/transactions',
          icon: CreditCard,
          label: 'Transactions',
        },
        {
          to: '/administrator/earnings',
          icon: DollarSign,
          label: 'Vendor Earnings',
        },
        {
          to: '/administrator/testimonials',
          icon: MessageSquare,
          label: 'Testimonials',
        },
        {
          to: '/messages',
          icon: MessageCircle,
          label: 'Messages',
        },
        {
          to: '/administrator/settings',
          icon: Settings,
          label: 'Settings',
        },
      ];
    }

    if (user.user_type === 'vendor') {
      return [
        ...baseItems,
        {
          to: '/vendor',
          icon: LayoutDashboard,
          label: 'Dashboard',
        },
        {
          to: '/vendor/products',
          icon: Package,
          label: 'Products',
          subItems: [
            { to: '/vendor/products', icon: Package, label: 'All Products' },
            { to: '/vendor/products/new', icon: Package, label: 'Add New' }
          ]
        },
        {
          to: '/vendor/categories',
          icon: ListTree,
          label: 'Categories',
          subItems: [
            { to: '/vendor/categories', icon: ListTree, label: 'All Categories' },
            { to: '/vendor/categories/new', icon: ListTree, label: 'Add New' }
          ]
        },
        {
          to: '/vendor/orders',
          icon: ShoppingBag,
          label: 'Orders',
        },
        {
          to: '/vendor/earnings',
          icon: DollarSign,
          label: 'Earnings',
        },
        {
          to: '/messages',
          icon: MessageCircle,
          label: 'Messages',
        },
        {
          to: '/vendor/settings',
          icon: Settings,
          label: 'Settings',
        },
      ];
    }

    // Buyer menu items
    return [
      ...baseItems,
      {
        to: '/products',
        icon: ShoppingBag,
        label: 'Products',
      },
      {
        to: '/cart',
        icon: ShoppingCart,
        label: 'Cart',
      },
      {
        to: '/orders',
        icon: Package,
        label: 'Orders',
      },
      {
        to: '/wishlist',
        icon: MessageSquare,
        label: 'Wishlist',
      },
      {
        to: '/messages',
        icon: MessageCircle,
        label: 'Messages',
      },
    ];
  };

  const menuItems = getMenuItems();

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev =>
      prev.includes(path)
        ? prev.filter(item => item !== path)
        : [...prev, path]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isExpanded = (path: string) => {
    return expandedItems.includes(path) ||
      (menuItems.find(item => item.to === path)?.subItems?.some(sub => isActive(sub.to)));
  };

  const filteredConversations = conversations.filter(conv => {
    if (!conversationSearch) return true;
    const otherParticipant = conv.participants.find(p => p.id !== user?.id);
    return otherParticipant?.full_name?.toLowerCase().includes(conversationSearch.toLowerCase()) ||
      otherParticipant?.email?.toLowerCase().includes(conversationSearch.toLowerCase());
  });

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.id !== user?.id);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Tes Market
            </h1>
            <p className="text-sm text-purple-200/80 capitalize">
              {user?.user_type || 'User'} Panel
            </p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.to}>
            <div className="flex items-center">
              <Link
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={`flex-1 flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive(item.to)
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30 shadow-lg shadow-blue-500/10'
                    : 'text-purple-200/90 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <item.icon className={`mr-3 h-5 w-5 transition-colors ${isActive(item.to) ? 'text-blue-400' : 'text-purple-300 group-hover:text-purple-200'
                  }`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>

              {item.subItems && (
                <button
                  onClick={() => toggleExpanded(item.to)}
                  className="p-2 text-purple-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
                >
                  {isExpanded(item.to) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>

            {/* Sub-items */}
            {item.subItems && isExpanded(item.to) && (
              <div className="ml-8 mt-2 space-y-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.to}
                    to={subItem.to}
                    onClick={() => setIsMobileOpen(false)}
                    className={`block px-4 py-2 text-sm rounded-lg transition-all duration-200 ${isActive(subItem.to)
                        ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-blue-300 font-medium border-l-2 border-blue-400'
                        : 'text-purple-200/70 hover:bg-white/5 hover:text-purple-200 border-l-2 border-transparent hover:border-purple-400/30'
                      }`}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Conversations Section */}
        <div className="pt-4 border-t border-white/10 mt-4">
          <button
            onClick={() => setShowConversations(!showConversations)}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-purple-200/90 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
          >
            <MessageCircle className="mr-3 h-5 w-5 text-purple-300" />
            <span className="flex-1 text-left">Conversations</span>
            {showConversations ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {showConversations && (
            <div className="mt-2 space-y-2">
              {/* Search */}
              <div className="px-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="max-h-48 overflow-y-auto space-y-1 px-2">
                {filteredConversations.length === 0 ? (
                  <div className="px-4 py-3 text-center text-purple-300/60 text-sm">
                    No conversations found
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    return (
                      <Link
                        key={conversation.id}
                        to={`/messages/${conversation.id}`}
                        onClick={() => setIsMobileOpen(false)}
                        className="flex items-center px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3 flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {otherParticipant?.full_name || otherParticipant?.email || 'Unknown User'}
                          </p>
                          {conversation.last_message && (
                            <p className="text-xs text-purple-300/70 truncate">
                              {conversation.last_message.content}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-3 px-4 py-3 bg-white/5 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-purple-300/70 capitalize">
              {user?.user_type}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-slate-800 to-purple-800 text-white rounded-lg shadow-lg"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      {isMobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
};

export default UnifiedSidebar;
