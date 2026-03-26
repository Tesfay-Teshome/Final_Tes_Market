import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Shield,
  Package,
  Save,
  Upload,
  Eye,
  EyeOff,
  Menu,
  X,
  Percent,
  CheckCircle,
  Globe,
  Store,
  Database,
  Users,
  Mail,
  DollarSign,
  Lock,
  Key,
  Wrench,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface PlatformSettings {
  site_name: string;
  site_description: string;
  contact_email: string;
  support_email: string;
  default_commission_rate: number;
  currency: string;
  timezone: string;
  maintenance_mode: boolean;
  user_registration_enabled: boolean;
  vendor_registration_enabled: boolean;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  auto_approve_products: boolean;
  auto_approve_vendors: boolean;
  min_order_amount: number;
  max_order_amount: number;
  shipping_fee: number;
  tax_rate: number;
}

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'notifications' | 'security' | 'integrations'>('general');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock settings data - in real app, this would come from API
  const [settings, setSettings] = useState<PlatformSettings>({
    site_name: 'Tes Market',
    site_description: 'Multi-vendor e-commerce platform',
    contact_email: 'contact@tesmarket.com',
    support_email: 'support@tesmarket.com',
    default_commission_rate: 10,
    currency: 'USD',
    timezone: 'UTC',
    maintenance_mode: false,
    user_registration_enabled: true,
    vendor_registration_enabled: true,
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    push_notifications_enabled: false,
    auto_approve_products: false,
    auto_approve_vendors: false,
    min_order_amount: 10,
    max_order_amount: 10000,
    shipping_fee: 5,
    tax_rate: 8.5,
  });

  const handleInputChange = (key: keyof PlatformSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // In real app, this would call API to save settings
    toast({
      title: 'Settings Saved',
      description: 'Platform settings have been updated successfully.',
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'business', label: 'Business', icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F14] relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-green-900/10 blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Platform Settings
              </h1>
              <p className="text-gray-400 mt-2">Manage your platform configuration and preferences</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-200"
            >
              <Save className="h-5 w-5" />
              Save Changes
            </motion.button>
          </motion.div>

          {/* Enhanced Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#0F1720] rounded-2xl shadow-xl p-2 border border-white/[0.08]"
          >
            {/* Mobile Menu Button */}
            <div className="block lg:hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {(() => {
                    const currentTab = tabs.find(tab => tab.id === activeTab);
                    const Icon = currentTab?.icon || SettingsIcon;
                    return (
                      <>
                        <Icon className="h-5 w-5 text-emerald-400" />
                        <span className="font-medium text-gray-200">{currentTab?.label}</span>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Menu className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {isMobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="bg-[#131C28] rounded-xl p-2 space-y-1">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id as any);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === tab.id
                              ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                              }`}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Responsive Desktop Tabs */}
            <nav className="hidden lg:flex space-x-2">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/30 transform scale-105'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </motion.button>
                );
              })}
            </nav>
          </motion.div>

          {/* General Settings */}
          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-[#0F1720] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden"
              >
                <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-b border-emerald-500/20 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-6 w-6 text-emerald-400" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-200">Site Information</h3>
                      <p className="text-emerald-400/80 text-sm">Basic information about your platform</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Site Name</label>
                    <input
                      type="text"
                      value={settings.site_name}
                      onChange={(e) => handleInputChange('site_name', e.target.value)}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter site name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Site Description</label>
                    <textarea
                      value={settings.site_description}
                      onChange={(e) => handleInputChange('site_description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Describe your platform"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={settings.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Support Email</label>
                    <input
                      type="email"
                      value={settings.support_email}
                      onChange={(e) => handleInputChange('support_email', e.target.value)}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                      placeholder="support@example.com"
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-[#0F1720] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden"
              >
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-purple-500/20 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="h-6 w-6 text-purple-400" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-200">System Configuration</h3>
                      <p className="text-purple-400/80 text-sm">Platform behavior and features</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                    <select
                      value={settings.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="USD" className="bg-[#131C28]">USD - US Dollar</option>
                      <option value="EUR" className="bg-[#131C28]">EUR - Euro</option>
                      <option value="GBP" className="bg-[#131C28]">GBP - British Pound</option>
                      <option value="ETB" className="bg-[#131C28]">ETB - Ethiopian Birr</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="UTC" className="bg-[#131C28]">UTC</option>
                      <option value="America/New_York" className="bg-[#131C28]">Eastern Time</option>
                      <option value="America/Los_Angeles" className="bg-[#131C28]">Pacific Time</option>
                      <option value="Africa/Addis_Ababa" className="bg-[#131C28]">East Africa Time</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-300 border-b border-white/[0.08] pb-2">Platform Features</h4>

                    <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] ${settings.maintenance_mode ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div>
                          <label htmlFor="maintenance_mode" className="text-sm font-medium text-gray-200">
                            Maintenance Mode
                          </label>
                          <p className="text-xs text-gray-400">Temporarily disable site access</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id="maintenance_mode"
                        checked={settings.maintenance_mode}
                        onChange={(e) => handleInputChange('maintenance_mode', e.target.checked)}
                        className="h-5 w-5 bg-[#131C28] text-red-500 focus:ring-red-500 border-white/[0.08] rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-blue-400" />
                        <div>
                          <label htmlFor="user_registration" className="text-sm font-medium text-gray-200">
                            User Registration
                          </label>
                          <p className="text-xs text-gray-400">Allow new users to register</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id="user_registration"
                        checked={settings.user_registration_enabled}
                        onChange={(e) => handleInputChange('user_registration_enabled', e.target.checked)}
                        className="h-5 w-5 bg-[#131C28] text-blue-500 focus:ring-blue-500 border-white/[0.08] rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <div className="flex items-center space-x-3">
                        <Store className="h-5 w-5 text-emerald-400" />
                        <div>
                          <label htmlFor="vendor_registration" className="text-sm font-medium text-gray-200">
                            Vendor Registration
                          </label>
                          <p className="text-xs text-gray-400">Allow new vendors to register</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id="vendor_registration"
                        checked={settings.vendor_registration_enabled}
                        onChange={(e) => handleInputChange('vendor_registration_enabled', e.target.checked)}
                        className="h-5 w-5 bg-[#131C28] text-emerald-500 focus:ring-emerald-500 border-white/[0.08] rounded"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Enhanced Business Settings */}
          {activeTab === 'business' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-[#0F1720] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden"
              >
                <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-b border-emerald-500/20 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Percent className="h-6 w-6 text-emerald-400" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-200">Commission & Fees</h3>
                      <p className="text-emerald-400/80 text-sm">Platform revenue configuration</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Commission Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.default_commission_rate}
                      onChange={(e) => handleInputChange('default_commission_rate', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Shipping Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.shipping_fee}
                      onChange={(e) => handleInputChange('shipping_fee', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tax Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.tax_rate}
                      onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-[#0F1720] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden"
              >
                <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-b border-emerald-500/20 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-emerald-400" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-200">Order Limits</h3>
                      <p className="text-emerald-400/80 text-sm">Order amount restrictions</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Order Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.min_order_amount}
                      onChange={(e) => handleInputChange('min_order_amount', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Order Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.max_order_amount}
                      onChange={(e) => handleInputChange('max_order_amount', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-[#131C28] text-white border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-300 border-b border-white/[0.08] pb-2">Auto-Approval Settings</h4>

                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-emerald-400" />
                        <div>
                          <label htmlFor="auto_approve_products" className="text-sm font-medium text-gray-200">
                            Auto-approve Products
                          </label>
                          <p className="text-xs text-gray-400">Automatically approve new products</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id="auto_approve_products"
                        checked={settings.auto_approve_products}
                        onChange={(e) => handleInputChange('auto_approve_products', e.target.checked)}
                        className="h-5 w-5 bg-[#131C28] text-emerald-500 focus:ring-emerald-500 border-white/[0.08] rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center space-x-3">
                        <Store className="h-5 w-5 text-blue-400" />
                        <div>
                          <label htmlFor="auto_approve_vendors" className="text-sm font-medium text-gray-200">
                            Auto-approve Vendors
                          </label>
                          <p className="text-xs text-gray-400">Automatically approve new vendors</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id="auto_approve_vendors"
                        checked={settings.auto_approve_vendors}
                        onChange={(e) => handleInputChange('auto_approve_vendors', e.target.checked)}
                        className="h-5 w-5 bg-[#131C28] text-blue-500 focus:ring-blue-500 border-white/[0.08] rounded"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Enhanced Notifications Settings */}
          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#0F1720] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-b border-yellow-500/20 px-8 py-6">
                <div className="flex items-center gap-4">
                  <Bell className="h-8 w-8 text-yellow-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-200">Notification Settings</h2>
                    <p className="text-yellow-400/80">Configure how the platform sends notifications</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">Email Notifications</h3>
                      <p className="text-xs text-gray-400">Send notifications via email</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications_enabled}
                    onChange={(e) => handleInputChange('email_notifications_enabled', e.target.checked)}
                    className="h-5 w-5 bg-[#131C28] text-blue-500 focus:ring-blue-500 border-white/[0.08] rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">SMS Notifications</h3>
                      <p className="text-xs text-gray-400">Send notifications via SMS</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sms_notifications_enabled}
                    onChange={(e) => handleInputChange('sms_notifications_enabled', e.target.checked)}
                    className="h-5 w-5 bg-[#131C28] text-emerald-500 focus:ring-emerald-500 border-white/[0.08] rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">Push Notifications</h3>
                      <p className="text-xs text-gray-400">Send browser push notifications</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.push_notifications_enabled || false}
                    onChange={(e) => handleInputChange('push_notifications_enabled', e.target.checked)}
                    className="h-5 w-5 bg-[#131C28] text-purple-500 focus:ring-purple-500 border-white/[0.08] rounded"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Enhanced Security Settings */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#0F1720] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 border-b border-red-500/20 px-8 py-6">
                <div className="flex items-center gap-4">
                  <Shield className="h-8 w-8 text-red-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-200">Security Settings</h2>
                    <p className="text-red-400/80">Platform security and authentication configuration</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#131C28] border-2 border-dashed border-red-500/30 rounded-xl p-8 text-center"
                >
                  <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-200 mb-2">Advanced Security Features</h3>
                  <p className="text-gray-400 mb-4">
                    Security settings require additional authentication and will be implemented in future updates.
                  </p>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/[0.06]">
                    <p className="text-sm text-yellow-500 font-medium">
                      🔒 Two-factor authentication, API key management, and access logs coming soon!
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Enhanced Integrations Settings */}
          {activeTab === 'integrations' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#0F1720] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-b border-emerald-500/20 px-8 py-6">
                <div className="flex items-center gap-4">
                  <Database className="h-8 w-8 text-emerald-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-200">Third-party Integrations</h2>
                    <p className="text-emerald-400/80">Configure external service integrations</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#131C28] border-2 border-dashed border-emerald-500/30 rounded-xl p-8 text-center"
                >
                  <div className="bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-200 mb-2">Integration Hub</h3>
                  <p className="text-gray-400 mb-4">
                    Integration settings for payment gateways, shipping providers, and other services will be available in future updates.
                  </p>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/[0.06]">
                    <p className="text-sm text-emerald-400 font-medium">
                      🔌 PayPal, Stripe, shipping APIs, and analytics integrations coming soon!
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
