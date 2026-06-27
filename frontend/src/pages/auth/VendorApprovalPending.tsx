import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Store,
  Clock,
  CheckCircle,
  Mail,
  ArrowRight,
  Home,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { useDispatch } from 'react-redux';

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

const floatAnimation = {
  y: [0, -10, 0],
  transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
};

const shimmerAnimation = {
  x: [-200, 300],
  transition: { duration: 3, repeat: Infinity, ease: 'linear' },
};

const pulseGlow = {
  boxShadow: [
    '0 0 20px rgba(201,162,75,0.1)',
    '0 0 40px rgba(201,162,75,0.25)',
    '0 0 20px rgba(201,162,75,0.1)',
  ],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
};

const VendorApprovalPending = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
      style={{ background: LUX.paper }}
    >
      {/* Ambient orbs with animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={floatAnimation}
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-25"
          style={{ background: `radial-gradient(circle, ${LUX.gold}44, transparent)` }}
        />
        <motion.div
          animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 2 } }}
          className="absolute bottom-0 -left-16 w-72 h-72 rounded-full blur-[80px] opacity-15"
          style={{ background: `radial-gradient(circle, ${LUX.emeraldSoft}55, transparent)` }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Card */}
        <motion.div
          className="rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden"
          style={{
            background: '#fff',
            border: `2px solid ${LUX.gold}33`,
            boxShadow: `0 40px 100px -30px rgba(4,19,14,0.25), 0 0 0 1px ${LUX.gold}18`,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Top gold hairline with shimmer */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`, height: '100%' }} />
            <motion.div
              className="absolute top-0 left-0 w-20 h-full"
              style={{ background: `linear-gradient(90deg, transparent, ${LUX.goldSoft}, transparent)` }}
              animate={shimmerAnimation}
            />
          </div>

          {/* Icon */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)`,
                boxShadow: `0 20px 40px -10px ${LUX.gold}66`,
              }}
            >
              <Store className="h-12 w-12" style={{ color: LUX.emeraldDeep }} />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="inline-flex items-center gap-2.5 mb-4">
              <Sparkles className="h-4 w-4" style={{ color: LUX.gold }} />
              <span
                className="text-[10px] font-semibold tracking-[0.28em] uppercase"
                style={{ color: LUX.gold }}
              >
                Registration Received
              </span>
            </div>
            <h1
              className="font-serif text-3xl sm:text-4xl font-semibold leading-tight mb-3"
              style={{ color: LUX.emeraldDeep }}
            >
              Your Vendor Account is
              <span
                className="block italic font-light mt-1"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Pending Approval
              </span>
            </h1>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base max-w-md mx-auto">
              Thank you for registering as a vendor! Your application has been received and is currently under review by our team.
            </p>
          </motion.div>

          {/* Status Cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: `${LUX.emerald}08`,
                border: `1px solid ${LUX.emerald}22`,
              }}
            >
              <CheckCircle className="h-6 w-6 mx-auto mb-2" style={{ color: LUX.emerald }} />
              <p className="text-xs font-semibold mb-1" style={{ color: LUX.emeraldDeep }}>
                Registration
              </p>
              <p className="text-[10px]" style={{ color: LUX.emerald }}>
                Submitted
              </p>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: `${LUX.gold}08`,
                border: `1px solid ${LUX.gold}22`,
              }}
            >
              <Clock className="h-6 w-6 mx-auto mb-2" style={{ color: LUX.gold }} />
              <p className="text-xs font-semibold mb-1" style={{ color: LUX.emeraldDeep }}>
                Status
              </p>
              <p className="text-[10px]" style={{ color: LUX.gold }}>
                Under Review
              </p>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: `${LUX.emerald}08`,
                border: `1px solid ${LUX.emerald}22`,
              }}
            >
              <Shield className="h-6 w-6 mx-auto mb-2" style={{ color: LUX.emerald }} />
              <p className="text-xs font-semibold mb-1" style={{ color: LUX.emeraldDeep }}>
                Security
              </p>
              <p className="text-[10px]" style={{ color: LUX.emerald }}>
                Verified
              </p>
            </div>
          </motion.div>

          {/* Info Section */}
          <motion.div
            className="rounded-xl p-6 mb-8"
            style={{
              background: `linear-gradient(135deg, ${LUX.cream}, ${LUX.paper})`,
              border: `1px solid ${LUX.gold}22`,
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3
              className="font-serif text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: LUX.emeraldDeep }}
            >
              <Mail className="h-5 w-5" style={{ color: LUX.gold }} />
              What Happens Next?
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${LUX.emerald}15` }}
                >
                  <CheckCircle className="h-3 w-3" style={{ color: LUX.emerald }} />
                </div>
                <span>Our team will review your application within 24-48 hours</span>
              </li>
              <li className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${LUX.emerald}15` }}
                >
                  <CheckCircle className="h-3 w-3" style={{ color: LUX.emerald }} />
                </div>
                <span>You will receive an email notification once approved</span>
              </li>
              <li className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${LUX.emerald}15` }}
                >
                  <CheckCircle className="h-3 w-3" style={{ color: LUX.emerald }} />
                </div>
                <span>After approval, you can login and start selling immediately</span>
              </li>
            </ul>
          </motion.div>

          {/* User Info */}
          {user && (
            <motion.div
              className="rounded-xl p-4 mb-8"
              style={{
                background: `${LUX.emerald}05`,
                border: `1px solid ${LUX.emerald}15`,
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <p className="text-xs text-gray-600 mb-1">Registered Email</p>
              <p className="text-sm font-semibold" style={{ color: LUX.emeraldDeep }}>
                {user.email}
              </p>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Link
              to="/"
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center justify-center gap-2 group text-sm"
              style={{
                background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`,
                color: '#fff',
              }}
            >
              <Home className="h-4 w-4" />
              <span>Return to Homepage</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center gap-2"
              style={{
                background: `${LUX.gold}08`,
                color: LUX.emeraldDeep,
                border: `1px solid ${LUX.gold}22`,
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </motion.div>

          {/* Footer Note */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-[10px] text-gray-500">
              Need help? Contact us at{' '}
              <a
                href="mailto:support@tesmarket.com"
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: LUX.gold }}
              >
                support@tesmarket.com
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorApprovalPending;
