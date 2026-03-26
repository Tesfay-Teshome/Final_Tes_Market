import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { messagingAPI } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Settings, Bell, Shield, Clock, Users, Eye, MessageSquare, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface MessageSettings {
  id?: string;
  email_notifications: boolean;
  push_notifications: boolean;
  desktop_notifications: boolean;
  message_preview: boolean;
  auto_reply_enabled: boolean;
  auto_reply_message: string;
  block_unknown_senders: boolean;
  allow_messages_from: 'anyone' | 'followed' | 'nobody';
  message_retention_days: number;
  read_receipts: boolean;
  typing_indicators: boolean;
  online_status_visible: boolean;
  notification_sound: boolean;
  message_encryption: boolean;
}

const MessageSettings = () => {
  const [settings, setSettings] = useState<MessageSettings>({
    email_notifications: false,
    push_notifications: false,
    desktop_notifications: false,
    message_preview: false,
    auto_reply_enabled: false,
    auto_reply_message: '',
    block_unknown_senders: false,
    allow_messages_from: 'anyone',
    message_retention_days: 365,
    read_receipts: false,
    typing_indicators: false,
    online_status_visible: false,
    notification_sound: false,
    message_encryption: false,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentSettings, isLoading, error } = useQuery({
    queryKey: ['message-settings'],
    queryFn: async () => {
      try {
        const response = await messagingAPI.getSettings();
        return response.data;
      } catch (error: any) {
        // If no settings exist (404) or unauthorized (401), return null to trigger creation
        if (error?.response?.status === 404 || error?.response?.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });

  // Update settings when data is loaded
  useEffect(() => {
    if (currentSettings) {
      setSettings({
        email_notifications: currentSettings.email_notifications ?? false,
        push_notifications: currentSettings.push_notifications ?? false,
        desktop_notifications: currentSettings.desktop_notifications ?? false,
        message_preview: currentSettings.message_preview ?? false,
        auto_reply_enabled: currentSettings.auto_reply_enabled ?? false,
        auto_reply_message: currentSettings.auto_reply_message ?? '',
        block_unknown_senders: currentSettings.block_unknown_senders ?? false,
        allow_messages_from: currentSettings.allow_messages_from ?? 'anyone',
        message_retention_days: currentSettings.message_retention_days ?? 365,
        read_receipts: currentSettings.read_receipts ?? false,
        typing_indicators: currentSettings.typing_indicators ?? false,
        online_status_visible: currentSettings.online_status_visible ?? false,
        notification_sound: currentSettings.notification_sound ?? false,
        message_encryption: currentSettings.message_encryption ?? false,
      });
    }
  }, [currentSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: MessageSettings) => {
      // Remove undefined values and id field for API calls
      const cleanSettings = Object.fromEntries(
        Object.entries(newSettings).filter(([key, value]) => 
          key !== 'id' && value !== undefined
        )
      );
      
      if (currentSettings?.id) {
        return messagingAPI.updateSettings(currentSettings.id, cleanSettings);
      } else {
        return messagingAPI.createSettings(cleanSettings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-settings'] });
      toast({
        title: 'Success',
        description: 'Message settings updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Settings update error:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update message settings',
        variant: 'destructive',
      });
    },
  });

  const handleSettingChange = async (key: keyof MessageSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await updateSettingsMutation.mutateAsync(newSettings);
    } catch (error) {
      // Revert the setting on error
      setSettings(settings);
      console.error('Failed to update setting:', error);
    }
  };

  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center justify-center h-48"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-emerald-500" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-6 bg-gradient-to-br from-emerald-50/50 to-green-50/50 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="flex items-center gap-4 p-6 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl text-white"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          whileHover={{ rotate: 90, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Settings className="h-8 w-8" />
        </motion.div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Message Settings</h2>
          <p className="text-emerald-100">Configure your messaging preferences and privacy settings</p>
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 15 }}
                className="p-2 bg-emerald-100 rounded-full"
              >
                <Bell className="h-6 w-6 text-emerald-600" />
              </motion.div>
              Notifications
            </CardTitle>
            <CardDescription className="text-base">
              Control how you receive message notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Email Notifications</label>
                <p className="text-sm text-gray-600">
                  Receive email notifications for new messages
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked: boolean) => handleSettingChange('email_notifications', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Push Notifications</label>
                <p className="text-sm text-gray-600">
                  Receive push notifications for new messages
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.push_notifications}
                  onCheckedChange={(checked: boolean) => handleSettingChange('push_notifications', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Desktop Notifications</label>
                <p className="text-sm text-gray-600">
                  Show desktop notifications for new messages
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.desktop_notifications}
                  onCheckedChange={(checked: boolean) => handleSettingChange('desktop_notifications', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Message Preview</label>
                <p className="text-sm text-gray-600">
                  Show message content in notifications
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.message_preview}
                  onCheckedChange={(checked: boolean) => handleSettingChange('message_preview', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Notification Sound</label>
                <p className="text-sm text-gray-600">
                  Play sound when receiving new messages
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.notification_sound}
                  onCheckedChange={(checked: boolean) => handleSettingChange('notification_sound', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 15 }}
                className="p-2 bg-emerald-100 rounded-full"
              >
                <Shield className="h-6 w-6 text-emerald-600" />
              </motion.div>
              Privacy & Security
            </CardTitle>
            <CardDescription className="text-base">
              Manage your privacy and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <motion.div 
              className="space-y-3 p-4 bg-gray-50 rounded-xl"
              whileHover={{ scale: 1.02 }}
            >
              <label className="text-base font-semibold text-gray-900">Who can message you</label>
              <Select
                value={settings.allow_messages_from}
                onValueChange={(value: 'anyone' | 'followed' | 'nobody') => handleSettingChange('allow_messages_from', value)}
              >
                <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anyone">🌍 Anyone</SelectItem>
                  <SelectItem value="followed">👥 People you follow</SelectItem>
                  <SelectItem value="nobody">🚫 Nobody</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                Control who can send you messages
              </p>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Block Unknown Senders</label>
                <p className="text-sm text-gray-600">
                  Automatically block messages from unknown users
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.block_unknown_senders}
                  onCheckedChange={(checked: boolean) => handleSettingChange('block_unknown_senders', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Read Receipts</label>
                <p className="text-sm text-gray-600">
                  Let others know when you've read their messages
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.read_receipts}
                  onCheckedChange={(checked: boolean) => handleSettingChange('read_receipts', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Typing Indicators</label>
                <p className="text-sm text-gray-600">
                  Show when you're typing a message
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.typing_indicators}
                  onCheckedChange={(checked: boolean) => handleSettingChange('typing_indicators', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Online Status</label>
                <p className="text-sm text-gray-600">
                  Show your online status to other users
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.online_status_visible}
                  onCheckedChange={(checked: boolean) => handleSettingChange('online_status_visible', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Message Encryption</label>
                <p className="text-sm text-gray-600">
                  Enable end-to-end encryption for messages
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.message_encryption}
                  onCheckedChange={(checked: boolean) => handleSettingChange('message_encryption', checked)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Auto Reply Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 15 }}
                className="p-2 bg-emerald-100 rounded-full"
              >
                <Users className="h-6 w-6 text-emerald-600" />
              </motion.div>
              Auto Reply
            </CardTitle>
            <CardDescription className="text-base">
              Set up automatic responses when you're unavailable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <motion.div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-1 flex-1">
                <label className="text-base font-semibold text-gray-900">Enable Auto Reply</label>
                <p className="text-sm text-gray-600">
                  Automatically respond to new messages
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={settings.auto_reply_enabled}
                  onCheckedChange={(checked: boolean) => handleSettingChange('auto_reply_enabled', checked)}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </motion.div>
            </motion.div>

            {settings.auto_reply_enabled && (
              <motion.div 
                className="space-y-3 p-4 bg-gray-50 rounded-xl"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="text-base font-semibold text-gray-900">Auto Reply Message</label>
                <Textarea
                  rows={4}
                  placeholder="Enter your auto reply message..."
                  value={settings.auto_reply_message}
                  onChange={(e) => handleSettingChange('auto_reply_message', e.target.value)}
                  className="border-2 border-gray-200 focus:border-emerald-500 text-base resize-none"
                />
                <p className="text-sm text-gray-600">
                  This message will be sent automatically to new conversations
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-lime-50 to-emerald-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 15 }}
                className="p-2 bg-lime-100 rounded-full"
              >
                <Clock className="h-6 w-6 text-emerald-600" />
              </motion.div>
              Data Management
            </CardTitle>
            <CardDescription className="text-base">
              Control how long your messages are stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <motion.div 
              className="space-y-3 p-4 bg-gray-50 rounded-xl"
              whileHover={{ scale: 1.02 }}
            >
              <label className="text-base font-semibold text-gray-900">Message Retention Period</label>
              <Select
                value={settings.message_retention_days?.toString() || '365'}
                onValueChange={(value) => handleSettingChange('message_retention_days', parseInt(value))}
              >
                <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">📅 7 days</SelectItem>
                  <SelectItem value="30">📅 30 days</SelectItem>
                  <SelectItem value="90">📅 90 days</SelectItem>
                  <SelectItem value="180">📅 6 months</SelectItem>
                  <SelectItem value="365">📅 1 year</SelectItem>
                  <SelectItem value="730">📅 2 years</SelectItem>
                  <SelectItem value="-1">♾️ Forever</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                Messages older than this period will be automatically deleted from your device
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div 
        className="flex justify-end"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => updateSettingsMutation.mutate(settings)}
            disabled={updateSettingsMutation.isPending}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {updateSettingsMutation.isPending ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default MessageSettings;
