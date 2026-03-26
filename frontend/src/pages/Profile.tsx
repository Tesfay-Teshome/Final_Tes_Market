import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Store, 
  Lock,
  Camera,
  Shield} from 'lucide-react';
import { RootState } from '@/store';
import { authAPI, resolveMediaUrl } from '@/services/api';
import { setUser } from '@/store/slices/authSlice';
import { useToast } from '@/components/ui/use-toast';
import FadeIn from '@/components/animations/FadeIn';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  full_name: z.string().optional(), // Keep for compatibility
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  store_name: z.string().optional(),
  store_description: z.string().optional(),
  current_password: z.string().optional(),
  new_password: z.string().optional(),
  confirm_password: z.string().optional(),
}).refine((data) => {
  if (data.new_password && !data.current_password) {
    return false;
  }
  if (data.new_password && data.new_password !== data.confirm_password) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match or current password is required",
  path: ["confirm_password"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      first_name: (() => {
        const fullNameParts = (user?.full_name || '').trim().split(' ');
        return fullNameParts[0] || '';
      })(),
      last_name: (() => {
        const fullNameParts = (user?.full_name || '').trim().split(' ');
        return fullNameParts.slice(1).join(' ') || '';
      })(),
      email: user?.email || '',
      phone: user?.phone ?? user?.phone_number ?? '',
      address: user?.address || '',
      ...(user?.user_type === 'vendor' && {
        store_name: user?.store_name || '',
        store_description: user?.store_description || '',
      }),
    },
  });

  // Track if we're currently updating to prevent form reset during update
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset form when user data changes (but not during updates)
  useEffect(() => {
    if (user && !isUpdating) {
      // Split full_name into first_name and last_name for the form
      const fullNameParts = (user.full_name || '').trim().split(' ');
      const firstName = fullNameParts[0] || '';
      const lastName = fullNameParts.slice(1).join(' ') || '';
      
      const formData = {
        first_name: firstName,
        last_name: lastName,
        username: user.username || '',
        email: user.email || '',
        phone: user.phone ?? user.phone_number ?? '',
        address: user.address || '',
        ...(user.user_type === 'vendor' && {
          store_name: user.store_name || '',
          store_description: user.store_description || '',
        }),
      };
      console.log('🔄 Initial form reset with user data:', formData);
      console.log('👤 User full_name:', user.full_name, '→ Split into:', { firstName, lastName });
      console.log('🔍 Username in form reset:', {
        userUsername: user.username,
        formDataUsername: formData.username,
        isUpdating: isUpdating
      });
      reset(formData);
    }
  }, [user, reset, isUpdating]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsUpdating(true);
      console.log('🚀 Starting profile update with form data:', data);
      
      // Handle password change separately if password fields are provided
      if (data.current_password || data.new_password) {
        if (!data.current_password) {
          toast({
            title: 'Error',
            description: 'Current password is required to change password.',
            variant: 'destructive',
          });
          return;
        }
        
        if (!data.new_password) {
          toast({
            title: 'Error',
            description: 'New password is required.',
            variant: 'destructive',
          });
          return;
        }
        
        if (data.new_password !== data.confirm_password) {
          toast({
            title: 'Error',
            description: 'New passwords do not match.',
            variant: 'destructive',
          });
          return;
        }
        
        // Send password change request
        const passwordPayload = {
          current_password: data.current_password,
          password: data.new_password,
          confirm_password: data.confirm_password
        };
        
        await authAPI.updateProfile(passwordPayload);
        
        toast({
          title: 'Success',
          description: 'Password updated successfully.',
        });
        
        // Clear password fields after successful update
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) {
          const passwordInputs = form.querySelectorAll('input[type="password"]') as NodeListOf<HTMLInputElement>;
          passwordInputs.forEach(input => input.value = '');
        }
        
        return;
      }
      
      // Handle regular profile update (non-password fields)
      // Backend expects: username, email, full_name, phone_number, address, store_name, store_description
      const payload = {
        username: data.username?.trim() || user?.username, // Ensure username is never empty
        email: data.email?.trim(),
        full_name: `${data.first_name?.trim() || ''} ${data.last_name?.trim() || ''}`.trim(),
        phone_number: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        // Only include store fields for vendors
        ...(user?.user_type === 'vendor' && {
          store_name: data.store_name?.trim() || '',
          store_description: data.store_description?.trim() || '',
        }),
      };
      
      console.log('📤 Sending profile update payload:', payload);
      console.log('👤 Current user before update:', user);
      console.log('🔍 Username change details:', {
        oldUsername: user?.username,
        newUsername: data.username?.trim(),
        isUsernameChanging: user?.username !== data.username?.trim()
      });
      
      const response = await authAPI.updateProfile(payload);
      
      // Update Redux store with new data
      const updatedUser = response.data;
      dispatch(setUser(updatedUser));
      
      console.log('✅ Profile update response:', updatedUser);
      console.log('✅ Updated user full_name:', updatedUser.full_name);
      console.log('✅ Updated user username:', updatedUser.username);
      console.log('🔍 Username comparison:', {
        sentUsername: payload.username,
        receivedUsername: updatedUser.username,
        isUsernameUpdated: payload.username === updatedUser.username
      });
      
      // Don't reset form immediately - let Redux update handle it
      // The useEffect will handle the form reset when user data updates
      
      setTimeout(() => {
        setIsUpdating(false);
        console.log('🔍 Update completed, allowing form resets');
        console.log('🔍 Current Redux user after update:', user);
      }, 500);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
    } catch (error: any) {
      setIsUpdating(false);
      console.error('❌ Profile update error:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Full error object:', JSON.stringify(error.response?.data, null, 2));
      
      // Check for specific username errors
      if (error.response?.data?.username) {
        console.error('🚫 Username validation error:', error.response.data.username);
      }
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.current_password?.[0] ||
                          error.response?.data?.password?.[0] ||
                          error.response?.data?.username?.[0] ||
                          error.response?.data?.first_name?.[0] ||
                          error.response?.data?.last_name?.[0] ||
                          'Failed to update profile.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('profile_image', file);

      const response = await authAPI.updateProfileImage(formData);
      dispatch(setUser(response.data));
      
      toast({
        title: 'Success',
        description: 'Profile image updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update profile image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FadeIn>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white">
            <div className="flex items-center gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="relative">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    {user?.profile_image ? (
                      <img
                        src={resolveMediaUrl(user.profile_image)!}
                        alt={user?.username || 'User avatar'}
                        className="h-full w-full object-cover"
                        onClick={() => {
                          const url = resolveMediaUrl(user.profile_image);
                          alert(`Profile Image URL: ${url || '(none)'}\nUser: ${user?.username || ''}`);
                        }}
                        onError={(e) => {
                          console.error('Profile image failed to load:', user.profile_image);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.fallback-avatar');
                          if (fallback) {
                            (fallback as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={`fallback-avatar h-full w-full bg-emerald-500 flex items-center justify-center ${user?.profile_image ? 'hidden' : 'flex'}`}>
                      <User className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                    </div>
                  </div>
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 sm:p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user?.full_name || user?.username}
                </h1>
                <p className="text-emerald-100 text-sm sm:text-base break-all">{user?.email}</p>
                <div className="flex items-center mt-2">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="capitalize text-sm sm:text-base">{user?.user_type}</span>
                </div>
              </div>
            </div>
            </div>

          </div>

          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-emerald-600 text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'security'
                    ? 'border-b-2 border-emerald-600 text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'notifications'
                    ? 'border-b-2 border-emerald-600 text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Notifications
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        First Name *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('first_name')}
                          className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Enter your first name"
                        />
                      </div>
                      {errors.first_name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.first_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Last Name *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('last_name')}
                          className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Enter your last name"
                        />
                      </div>
                      {errors.last_name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.last_name.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Information Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Username *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('username')}
                          className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Choose a username"
                        />
                      </div>
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('email')}
                          type="email"
                          className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="your.email@example.com"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('phone')}
                          className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Enter your phone number"
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('address')}
                          className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Enter your address"
                        />
                      </div>
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {user?.user_type === 'vendor' && (
                  <div className="space-y-6 border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Store Information
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Store Name
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Store className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            {...register('store_name')}
                            className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        {errors.store_name && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.store_name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Store Description
                        </label>
                        <textarea
                          {...register('store_description')}
                          rows={4}
                          className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        {errors.store_description && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.store_description.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    className="px-4 py-2 min-w-[140px] rounded-lg font-medium text-white bg-gray-400 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                    onClick={() => navigate('/')}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 min-w-[140px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      {...register('current_password')}
                      className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      {...register('new_password')}
                      className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      {...register('confirm_password')}
                      className="block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Notification Preferences
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2">Email notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2">Push notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2">SMS notifications</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Notification Types
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2">Order updates</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2">Product updates</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2">Marketing emails</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  </div>
  );
};

export default Profile;