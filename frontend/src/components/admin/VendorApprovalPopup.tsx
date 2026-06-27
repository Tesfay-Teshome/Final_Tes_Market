import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, X, Bell, ArrowRight, Check, Loader2, User, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface PendingVendor {
  id: number;
  username: string;
  email: string;
  full_name: string;
  store_name?: string;
  user_type: string;
  is_active: boolean;
  status?: string;
  created_at: string;
}

const LUX = {
  ink: '#04130E',
  emeraldDeep: '#022C22',
  emerald: '#064E3B',
  emeraldSoft: '#065F46',
  gold: '#C9A24B',
  goldSoft: '#E6CE91',
  cream: '#F7F3EC',
  paper: '#FBF9F4',
};

const VendorApprovalPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  // Get authentication state
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Fetch pending vendors - only when authenticated as admin
  const { data: pendingVendors, isLoading } = useQuery<PendingVendor[]>({
    queryKey: ['admin-pending-vendors'],
    queryFn: async () => {
      const response = await adminAPI.getPendingVendors();
      // Filter to only show pending vendors (not rejected, not approved)
      const allVendors = response.data || [];
      return allVendors.filter((vendor: PendingVendor) => 
        !vendor.is_active && vendor.status !== 'rejected'
      );
    },
    enabled: isAuthenticated && !!user && user.user_type === 'administrator',
    refetchInterval: 60000, // Refetch every minute
    retry: false,
  });

  // Dismiss popup for the current login session
  const handleDismiss = useCallback(() => {
    setShowPopup(false);
    // Store dismissal in sessionStorage to persist until next login
    sessionStorage.setItem('vendorApprovalDismissed', 'true');
  }, []);

  // Handle take action - redirect to vendors page
  const handleTakeAction = () => {
    setShowPopup(false);
    navigate('/administrator/vendors');
  };

  // Show popup whenever there are pending vendors and not dismissed for this session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('vendorApprovalDismissed');
    if (pendingVendors && pendingVendors.length > 0 && !isDismissed) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [pendingVendors]);

  if (!pendingVendors || pendingVendors.length === 0) {
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999]"
            onClick={() => setShowPopup(false)}
          />

          {/* Popup Container */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
              <div
                className="rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: LUX.paper,
                  border: `2px solid ${LUX.gold}44`,
                  boxShadow: `0 40px 100px -30px rgba(4,19,14,0.3), 0 0 0 1px ${LUX.gold}22`,
                }}
              >
                {/* Header */}
                <div
                  className="p-4 sm:p-6 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${LUX.emeraldDeep} 0%, ${LUX.emerald} 50%, ${LUX.emeraldSoft} 100%)`,
                  }}
                >
                  {/* Decorative elements */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-xl opacity-20"
                    style={{ background: LUX.gold }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-lg opacity-15"
                    style={{ background: LUX.goldSoft }}
                  />

                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="rounded-full p-2 sm:p-3"
                        style={{
                          background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)`,
                        }}
                      >
                        <Store className="h-5 w-5 sm:h-7 sm:w-7" style={{ color: LUX.emeraldDeep }} />
                      </div>
                      <div>
                        <h3
                          className="text-lg sm:text-xl font-bold mb-1"
                          style={{ color: LUX.goldSoft }}
                        >
                          Pending Vendor Approvals
                        </h3>
                        <p className="text-white/80 text-xs sm:text-sm">
                          {pendingVendors.length} {pendingVendors.length === 1 ? 'vendor' : 'vendors'} awaiting approval
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-96 overflow-y-auto">
                    {pendingVendors.slice(0, 5).map((vendor) => (
                      <div
                        key={vendor.id}
                        className="rounded-xl p-3 sm:p-4 transition-all hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(135deg, ${LUX.cream}, ${LUX.paper})`,
                          border: `1px solid ${LUX.gold}22`,
                        }}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div
                            className="rounded-full p-2 flex-shrink-0"
                            style={{ background: `${LUX.emerald}15` }}
                          >
                            <Store className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: LUX.emerald }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4
                              className="font-bold mb-1 text-xs sm:text-sm"
                              style={{ color: LUX.emeraldDeep }}
                            >
                              {vendor.full_name || vendor.username}
                            </h4>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Mail className="h-3 w-3" style={{ color: LUX.gold }} />
                              <p className="text-gray-700 text-[10px] sm:text-xs truncate">
                                {vendor.email}
                              </p>
                            </div>
                            {vendor.store_name && (
                              <div className="flex items-center gap-1.5">
                                <Store className="h-3 w-3" style={{ color: LUX.emerald }} />
                                <p className="text-gray-600 text-[10px] sm:text-xs truncate">
                                  {vendor.store_name}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {pendingVendors.length > 5 && (
                      <div className="text-center text-xs sm:text-sm" style={{ color: LUX.emerald }}>
                        +{pendingVendors.length - 5} more vendors pending
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                    <button
                      onClick={handleTakeAction}
                      className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center justify-center gap-2 group text-xs sm:text-sm"
                      style={{
                        background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)`,
                        color: LUX.emeraldDeep,
                      }}
                    >
                      <span>Take Action</span>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-200 text-xs sm:text-sm"
                      style={{
                        background: `${LUX.emerald}10`,
                        color: LUX.emeraldDeep,
                        border: `1px solid ${LUX.emerald}30`,
                      }}
                    >
                      Remind Me Later
                    </button>
                  </div>

                  {/* Warning message */}
                  <div
                    className="mt-3 sm:mt-4 rounded-lg p-2 sm:p-3"
                    style={{
                      background: `${LUX.gold}08`,
                      border: `1px solid ${LUX.gold}22`,
                    }}
                  >
                    <p className="text-[10px] sm:text-xs text-center" style={{ color: LUX.emeraldDeep }}>
                      ⚠️ Please review and approve or reject vendor registrations to maintain platform quality.
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

export default VendorApprovalPopup;
