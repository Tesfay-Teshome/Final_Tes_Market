import React, { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';

import { motion, AnimatePresence } from 'framer-motion';

import { AlertCircle, X, Bell, ArrowRight } from 'lucide-react';

import { Link } from 'react-router-dom';

import { useSelector } from 'react-redux';

import type { RootState } from '@/store';



interface Notification {

  id: string;

  title: string;

  message: string;

  notification_type: string;

  is_read: boolean;

  related_id?: string;

  created_at: string;

  time_ago: string;

  requires_confirmation: boolean;

  confirmed_by_vendor: boolean;

  confirmed_at?: string;

}



const NotificationPopup = () => {

  const [showPopup, setShowPopup] = useState(false);

  const [hasShownOnce, setHasShownOnce] = useState(false);

  

  // Get authentication state

  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);



  // Fetch unconfirmed notifications - only when authenticated

  const { data: notifications } = useQuery<Notification[]>({

    queryKey: ['vendor-notifications-popup'],

    queryFn: async () => {

      const response = await api.get('/api/notifications/');

      return response.data;

    },

    enabled: isAuthenticated && !!user, // Only fetch when user is authenticated

    refetchInterval: 30000, // Refetch every 30 seconds

    retry: false, // Don't retry on 401 errors

  });



  // Filter for notifications requiring confirmation

  const pendingConfirmations = notifications?.filter(

    (n) => n.requires_confirmation && !n.confirmed_by_vendor

  ) || [];



  useEffect(() => {

    // Show popup if there are pending confirmations and haven't shown once yet

    if (pendingConfirmations.length > 0 && !hasShownOnce) {

      setShowPopup(true);

      setHasShownOnce(true);

    }

  }, [pendingConfirmations.length, hasShownOnce]);



  // Reset hasShownOnce when all confirmations are complete

  useEffect(() => {

    if (pendingConfirmations.length === 0) {

      setHasShownOnce(false);

    }

  }, [pendingConfirmations.length]);



  if (pendingConfirmations.length === 0) {

    return null;

  }



  return (

    <AnimatePresence>

      {showPopup && (

        <>

          {/* Backdrop */}

          <motion.div

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99999]"

            onClick={() => setShowPopup(false)}

          />



          {/* Popup Container - Centered with Flexbox */}

          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none">

            <motion.div

              initial={{ opacity: 0, scale: 0.9, y: -20 }}

              animate={{ opacity: 1, scale: 1, y: 0 }}

              exit={{ opacity: 0, scale: 0.9, y: -20 }}

              className="w-full max-w-lg pointer-events-auto"

            >

            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-400">

              {/* Header with gradient */}

              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-4 sm:p-6 relative overflow-hidden">

                {/* Animated background elements */}

                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>

                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>



                <div className="relative z-10 flex items-start justify-between">

                  <div className="flex items-center gap-2 sm:gap-3">

                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 animate-pulse">

                      <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />

                    </div>

                    <div>

                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">

                        Action Required!

                      </h3>

                      <p className="text-white/90 text-xs sm:text-sm">

                        {pendingConfirmations.length} {pendingConfirmations.length === 1 ? 'order needs' : 'orders need'} your confirmation

                      </p>

                    </div>

                  </div>

                  <button

                    onClick={() => setShowPopup(false)}

                    className="text-white/80 hover:text-white transition-colors"

                  >

                    <X className="h-5 w-5 sm:h-6 sm:w-6" />

                  </button>

                </div>

              </div>



              {/* Content */}

              <div className="p-4 sm:p-6">

                <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-96 overflow-y-auto">

                  {pendingConfirmations.slice(0, 3).map((notification) => (

                    <div

                      key={notification.id}

                      className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-3 sm:p-4"

                    >

                      <div className="flex items-start gap-2 sm:gap-3">

                        <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0 mt-1" />

                        <div className="flex-1 min-w-0">

                          <h4 className="font-bold text-gray-900 mb-1 text-xs sm:text-sm">

                            {notification.title}

                          </h4>

                          <p className="text-gray-700 text-[10px] sm:text-xs line-clamp-2">

                            {notification.message}

                          </p>

                          <p className="text-amber-600 text-[10px] sm:text-xs mt-1 sm:mt-2 font-semibold">

                            {notification.time_ago}

                          </p>

                        </div>

                      </div>

                    </div>

                  ))}



                  {pendingConfirmations.length > 3 && (

                    <div className="text-center text-xs sm:text-sm text-gray-600">

                      +{pendingConfirmations.length - 3} more notifications

                    </div>

                  )}

                </div>



                {/* Actions */}

                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">

                  <Link

                    to="/vendor/notifications"

                    onClick={() => setShowPopup(false)}

                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center justify-center gap-2 group text-xs sm:text-sm"

                  >

                    <span>View All & Confirm</span>

                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />

                  </Link>

                  <button

                    onClick={() => setShowPopup(false)}

                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-200 text-xs sm:text-sm"

                  >

                    Remind Me Later

                  </button>

                </div>



                {/* Warning message */}

                <div className="mt-3 sm:mt-4 bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3">

                  <p className="text-amber-800 text-[10px] sm:text-xs text-center">

                    ⚠️ Please confirm these notifications to let the administrator know you've seen them and will process the orders.

                  </p>

                </div>

              </div>

            </div>

            </motion.div>

          </div>

        </>

      )}

    </AnimatePresence>

  );

};



export default NotificationPopup;

