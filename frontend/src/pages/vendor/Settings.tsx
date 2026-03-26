import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Store,
  Bell,
  Shield,
  CreditCard,
  Save,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  business_name: z.string().min(2, 'Business name is required'),
  business_description: z.string().optional(),
  business_address: z.string().optional(),
  business_hours: z.string().optional(),
});

const notificationSchema = z.object({
  email_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  order_notifications: z.boolean(),
  payment_notifications: z.boolean(),
  marketing_emails: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

// Design tokens matching Admin Dashboard
const darkCard = "relative overflow-hidden rounded-3xl border border-white/[0.04] bg-[#0c1214]/70 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]";
const inputClass = "w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm font-medium text-white placeholder-[#586069] focus:outline-none focus:border-[#3CFF9E]/50 transition-all";
const labelClass = "block text-[10px] font-black text-[#7A9A90] uppercase tracking-widest mb-2";

const VendorSettings: React.FC = () => {
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      business_name: user?.business_name || '',
      business_description: user?.business_description || '',
      business_address: user?.business_address || '',
      business_hours: user?.business_hours || '',
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      email_notifications: true,
      sms_notifications: false,
      order_notifications: true,
      payment_notifications: true,
      marketing_emails: false,
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: 'Profile Updated', description: 'Your profile has been updated successfully.' });
    } catch (error) {
      toast({ title: 'Update Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const onNotificationSubmit = async (data: NotificationFormData) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: 'Preferences Updated', description: 'Notification preferences have been saved.' });
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Failed to update preferences.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  const ToggleSwitch = ({ name, form }: { name: keyof NotificationFormData; form: any }) => {
    const value = form.watch(name);
    return (
      <button
        type="button"
        onClick={() => form.setValue(name, !value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${value ? 'bg-[#3CFF9E]' : 'bg-white/10 border border-white/20'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    );
  };

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1700px] mx-auto pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-lg">
                <SettingsIcon className="h-5 w-5 text-[#3CFF9E]" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Settings</h1>
            </div>
            <p className="text-[#8B949E] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3CFF9E]" />
              Store Configuration & Preferences
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3">
            <div className={`${darkCard} p-4 sticky top-8`}>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === tab.id
                        ? 'bg-[#3CFF9E]/10 text-[#3CFF9E] border border-[#3CFF9E]/20 shadow-[0_0_20px_rgba(60,255,158,0.1)]'
                        : 'text-[#8B949E] hover:bg-white/[0.04] hover:text-white border border-transparent'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
                      {activeTab === tab.id && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3CFF9E]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className={`${darkCard} p-8`}>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-2xl">
                        <User className="h-8 w-8 text-[#3CFF9E]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Profile Details</h2>
                        <p className="text-[#8B949E] text-[10px] font-bold uppercase tracking-widest mt-1">Update your personal information</p>
                      </div>
                    </div>

                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>First Name</label>
                          <input {...profileForm.register('first_name')} className={inputClass} placeholder="Enter first name" />
                          {profileForm.formState.errors.first_name && (
                            <p className="mt-1 text-[10px] text-rose-400">{profileForm.formState.errors.first_name.message}</p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Last Name</label>
                          <input {...profileForm.register('last_name')} className={inputClass} placeholder="Enter last name" />
                          {profileForm.formState.errors.last_name && (
                            <p className="mt-1 text-[10px] text-rose-400">{profileForm.formState.errors.last_name.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#586069]" />
                          <input {...profileForm.register('email')} type="email" className={`${inputClass} pl-11`} placeholder="your@email.com" />
                        </div>
                        {profileForm.formState.errors.email && (
                          <p className="mt-1 text-[10px] text-rose-400">{profileForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#586069]" />
                          <input {...profileForm.register('phone')} type="tel" className={`${inputClass} pl-11`} placeholder="+1 (555) 000-0000" />
                        </div>
                      </div>

                      <div className="pt-4">
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02, translateY: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-2xl border border-emerald-400/20 disabled:opacity-50 transition-all"
                        >
                          <Save className="h-4 w-4" />
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </motion.button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* Business Tab */}
              {activeTab === 'business' && (
                <motion.div key="business" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className={`${darkCard} p-8`}>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#0A1A2A] to-[#060F1A] border border-blue-500/20 flex items-center justify-center shadow-2xl">
                        <Store className="h-8 w-8 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Business Details</h2>
                        <p className="text-[#8B949E] text-[10px] font-bold uppercase tracking-widest mt-1">Your store and business information</p>
                      </div>
                    </div>

                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div>
                        <label className={labelClass}>Business Name</label>
                        <input {...profileForm.register('business_name')} className={inputClass} placeholder="Your Business Name" />
                        {profileForm.formState.errors.business_name && (
                          <p className="mt-1 text-[10px] text-rose-400">{profileForm.formState.errors.business_name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Business Description</label>
                        <textarea
                          {...profileForm.register('business_description')}
                          rows={4}
                          className={`${inputClass} resize-none`}
                          placeholder="Describe your business to customers..."
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Business Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-[#586069]" />
                          <input {...profileForm.register('business_address')} className={`${inputClass} pl-11`} placeholder="123 Business St, City, Country" />
                        </div>
                      </div>
                      <div className="pt-4">
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02, translateY: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-2xl border border-blue-400/20 disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          {isLoading ? 'Saving...' : 'Update Business'}
                        </motion.button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <motion.div key="notifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className={`${darkCard} p-8`}>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1A1A0A] to-[#0F0F05] border border-amber-500/20 flex items-center justify-center shadow-2xl">
                        <Bell className="h-8 w-8 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Notifications</h2>
                        <p className="text-[#8B949E] text-[10px] font-bold uppercase tracking-widest mt-1">Manage how you receive alerts</p>
                      </div>
                    </div>

                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                      {[
                        { name: 'email_notifications' as const, label: 'Email Notifications', desc: 'Receive alerts via email' },
                        { name: 'sms_notifications' as const, label: 'SMS Notifications', desc: 'Receive alerts via SMS' },
                        { name: 'order_notifications' as const, label: 'Order Alerts', desc: 'Get notified about new orders' },
                        { name: 'payment_notifications' as const, label: 'Payment Alerts', desc: 'Get notified about payments' },
                        { name: 'marketing_emails' as const, label: 'Marketing Emails', desc: 'Promotional and marketing emails' },
                      ].map(item => (
                        <div key={item.name} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                          <div>
                            <h3 className="text-[11px] font-black text-white uppercase tracking-wider">{item.label}</h3>
                            <p className="text-[10px] font-medium text-[#8B949E] mt-0.5">{item.desc}</p>
                          </div>
                          <ToggleSwitch name={item.name} form={notificationForm} />
                        </div>
                      ))}
                      <div className="pt-4">
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02, translateY: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-amber-600 to-amber-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-2xl border border-amber-400/20 disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          {isLoading ? 'Saving...' : 'Save Preferences'}
                        </motion.button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className={`${darkCard} p-8 space-y-6`}>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1A0A0A] to-[#0F0505] border border-rose-500/20 flex items-center justify-center shadow-2xl">
                        <Shield className="h-8 w-8 text-rose-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Security</h2>
                        <p className="text-[#8B949E] text-[10px] font-bold uppercase tracking-widest mt-1">Manage account security</p>
                      </div>
                    </div>

                    {[
                      { title: 'Change Password', desc: 'Update your account password', btn: 'Update Password', icon: Lock, color: 'rose' },
                      { title: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account', btn: 'Enable 2FA', icon: Shield, color: 'blue' },
                      { title: 'Active Sessions', desc: 'View and manage your active login sessions', btn: 'View Sessions', icon: Eye, color: 'violet' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-wider mb-1">{item.title}</h3>
                        <p className="text-[#8B949E] text-xs font-medium mb-4">{item.desc}</p>
                        <motion.button
                          whileHover={{ scale: 1.02, translateY: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-6 py-2.5 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          <item.icon className="h-3.5 w-3.5 text-[#3CFF9E]" />
                          {item.btn}
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <motion.div key="billing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className={`${darkCard} p-8 space-y-6`}>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#0F0A1A] to-[#070510] border border-violet-500/20 flex items-center justify-center shadow-2xl">
                        <CreditCard className="h-8 w-8 text-violet-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Billing & Payments</h2>
                        <p className="text-[#8B949E] text-[10px] font-bold uppercase tracking-widest mt-1">Manage billing information</p>
                      </div>
                    </div>

                    {[
                      { title: 'Payment Methods', desc: 'Manage your payment methods for platform fees', btn: 'Add Payment Method' },
                      { title: 'Billing History', desc: 'View your billing history and invoices', btn: 'View History' },
                      { title: 'Subscription Plan', desc: 'Manage your vendor subscription plan', btn: 'View Plans' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-wider mb-1">{item.title}</h3>
                        <p className="text-[#8B949E] text-xs font-medium mb-4">{item.desc}</p>
                        <motion.button
                          whileHover={{ scale: 1.02, translateY: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-violet-800 border border-violet-400/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          {item.btn}
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorSettings;
