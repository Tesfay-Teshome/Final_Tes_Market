import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Store, Star, Package, ShoppingBag, Check, MapPin, Clock, Award, Verified, Users, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/axios';
import { resolveMediaUrl, storefrontAPI } from '@/services/api';
import { User } from '@/types';

/**
 * Luxury palette tokens (from Home.tsx)
 * Deep emerald + champagne gold accents = premium, editorial feel.
 */
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

const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
  light = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  light?: boolean;
}) => (
  <motion.div
    className="text-center mb-14"
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
  >
    {eyebrow && (
      <div className="inline-flex items-center gap-3 mb-5">
        <span className="h-px w-10" style={{ background: LUX.gold }} />
        <span
          className="text-[11px] font-semibold tracking-[0.32em] uppercase"
          style={{ color: light ? LUX.goldSoft : LUX.gold }}
        >
          {eyebrow}
        </span>
        <span className="h-px w-10" style={{ background: LUX.gold }} />
      </div>
    )}
    <h2
      className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]"
      style={{ color: light ? '#fff' : LUX.emeraldDeep }}
    >
      {title}
    </h2>
    {subtitle && (
      <p
        className="mt-5 text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
        style={{ color: light ? 'rgba(255,255,255,0.78)' : '#4b5563' }}
      >
        {subtitle}
      </p>
    )}
  </motion.div>
);

const Vendors = () => {
  const [storeSlugByVendor, setStoreSlugByVendor] = useState<Record<number, string>>({});

  const { data: vendorsData, error: vendorsError, isLoading } = useQuery<User[]>({
    queryKey: ['public-vendors'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/users/', {
          params: { user_type: 'vendor', is_active: true },
        });
        const allUsers = Array.isArray(response.data)
          ? response.data
          : (response.data?.results || response.data?.data || []);
        const vendors = allUsers.filter((user: any) => user && user.user_type === 'vendor');
        return vendors;
      } catch (error: any) {
        console.error('VENDORS FETCH ERROR:', error);
        return [];
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  if (vendorsError) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: LUX.paper }}>
        <div className="text-center p-8 rounded-3xl shadow-2xl max-w-md mx-4 border" style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}>
            <Store className="h-8 w-8" style={{ color: LUX.goldSoft }} />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: LUX.emeraldDeep }}>Something went wrong</h2>
          <p className="text-gray-600">An error occurred while fetching vendors.</p>
        </div>
      </div>
    );
  }

  const getStoreSlug = async (vendorId: number) => {
    if (storeSlugByVendor[vendorId]) return storeSlugByVendor[vendorId];
    try {
      const res = await storefrontAPI.getPublicStoreByVendor(vendorId);
      const slug = res.data.slug;
      setStoreSlugByVendor(prev => ({ ...prev, [vendorId]: slug }));
      return slug;
    } catch { return null; }
  };

  const handleVisitStore = async (e: React.MouseEvent, vendorId: number) => {
    e.preventDefault();
    const slug = await getStoreSlug(vendorId);
    if (slug) window.location.href = `/store/${slug}`;
    else window.location.href = `/vendor/${vendorId}/products`;
  };

  const vendors = vendorsData;

  if (!vendors) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: LUX.paper }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" style={{ borderColor: LUX.emerald }} />
          <p className="text-gray-600">Loading our amazing vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: LUX.paper }}>
      {/* Banner Section */}
      <section className="relative overflow-hidden flex items-center min-h-[400px]" style={{ background: LUX.ink }}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, ${LUX.ink} 0%, rgba(2,44,34,0.92) 45%, rgba(2,44,34,0.65) 75%, rgba(4,19,14,0.85) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(120% 80% at 80% 20%, rgba(201,162,75,0.18), transparent 55%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }}
        />
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}>
              <div className="inline-flex items-center gap-3 mb-5">
                <span className="h-px w-8" style={{ background: LUX.gold }} />
                <span className="text-[11px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.goldSoft }}>
                  Trusted Partners
                </span>
              </div>
              <h1 className="font-serif font-semibold text-white leading-[1.05] tracking-tight text-[2.2rem] sm:text-5xl lg:text-[3.6rem] mb-5">
                Meet Our Trusted Vendors
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/85 leading-relaxed max-w-xl">
                Discover amazing products from <span className="font-semibold" style={{ color: LUX.goldSoft }}>verified sellers</span> who are passionate about quality and service.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24" style={{ background: LUX.cream }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, staggerChildren: 0.2 }}
            viewport={{ once: true }}
          >
            {[
              { icon: Users, number: `${vendors.length}+`, label: 'Verified Vendors' },
              { icon: Package, number: '50K+', label: 'Quality Products' },
              { icon: TrendingUp, number: '99.8%', label: 'Satisfaction Rate' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center p-8 rounded-2xl border transition-all duration-300"
                style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 24px 50px -28px rgba(6,78,59,0.25)' }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -8 }}
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 border"
                  style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, borderColor: `${LUX.gold}55`, boxShadow: `0 8px 24px -10px ${LUX.emerald}` }}
                >
                  <stat.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="font-serif text-4xl md:text-5xl font-semibold mb-2" style={{ color: LUX.emeraldDeep }}>{stat.number}</h3>
                <p className="text-[11px] font-semibold tracking-[0.28em] uppercase" style={{ color: LUX.gold }}>{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Vendors Grid */}
      <section className="py-8" style={{ background: LUX.paper }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Our Partners"
            title="Our Vendors"
            subtitle="Sorted by product count (most products first), then by highest ratings"
          />

          {vendors && vendors.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, staggerChildren: 0.1 }}
              viewport={{ once: true }}
            >
              {vendors.map((vendor: any, index: number) => (
                <motion.div
                  key={vendor.id}
                  className="group rounded-2xl overflow-hidden border transition-all duration-300"
                  style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.20)' }}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -6 }}
                >
                  {/* Vendor Header */}
                  <div className="relative p-6" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}>
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />
                    <motion.div className="absolute top-4 right-4" whileHover={{ scale: 1.05 }}>
                      <div className="flex items-center rounded-full px-2 py-1 text-[9px] font-bold shadow-md" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: LUX.goldSoft }}>
                        <Verified className="h-3 w-3 mr-1.5" style={{ color: LUX.goldSoft }} />
                        Verified
                      </div>
                    </motion.div>
                    <div className="flex items-center">
                      <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.3 }}>
                        {resolveMediaUrl(vendor.profile_image) ? (
                          <img
                            src={resolveMediaUrl(vendor.profile_image)!}
                            alt={vendor.full_name || vendor.username}
                            className="h-14 w-14 rounded-full object-cover shadow-lg"
                            style={{ border: `2px solid ${LUX.goldSoft}60` }}
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'rgba(255,255,255,0.15)', border: `2px solid ${LUX.goldSoft}60` }}>
                            <Store className="h-7 w-7" style={{ color: LUX.goldSoft }} />
                          </div>
                        )}
                      </motion.div>
                      <div className="ml-4">
                        <h3 className="text-lg font-serif font-bold text-white mb-1">
                          {vendor.full_name || (vendor.first_name && vendor.last_name ? `${vendor.first_name} ${vendor.last_name}` : null) || vendor.username}
                        </h3>
                        {vendor.store_name && (
                          <p className="text-white/80 text-[11px] font-medium flex items-center gap-1">
                            <Store className="h-3 w-3" style={{ color: LUX.goldSoft }} />
                            {vendor.store_name}
                          </p>
                        )}
                        <div className="flex items-center mt-1">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => {
                              const rating = vendor.rating || vendor.average_rating || 5.0;
                              return (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < Math.floor(rating) ? 'fill-current' : ''}`}
                                  style={{ color: i < Math.floor(rating) ? LUX.goldSoft : 'rgba(255,255,255,0.3)' }}
                                />
                              );
                            })}
                          </div>
                          <span className="ml-2 text-white/90 text-xs font-semibold">
                            ({(vendor.rating || vendor.average_rating || 5.0).toFixed(1)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vendor Info */}
                  <div className="p-6">
                    <p className="mb-4 line-clamp-3 text-sm leading-relaxed" style={{ color: '#4b5563' }}>
                      {vendor.store_description || 'Premium quality products with exceptional customer service. Trusted by thousands of satisfied customers worldwide.'}
                    </p>

                    {/* Vendor Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <motion.div
                        className="text-center p-3 rounded-xl border transition-all"
                        style={{ background: LUX.cream, borderColor: 'rgba(6,78,59,0.08)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Package className="h-4 w-4 mx-auto mb-1" style={{ color: LUX.emerald }} />
                        <div className="text-lg font-bold" style={{ color: LUX.emeraldDeep }}>{vendor.product_count || 0}</div>
                        <div className="text-[11px] font-medium" style={{ color: '#6b7280' }}>Products</div>
                      </motion.div>
                      <motion.div
                        className="text-center p-3 rounded-xl border transition-all"
                        style={{ background: LUX.cream, borderColor: 'rgba(6,78,59,0.08)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Star className="h-4 w-4 mx-auto mb-1" style={{ color: LUX.gold }} />
                        <div className="text-lg font-bold" style={{ color: LUX.emeraldDeep }}>{(vendor.rating || vendor.average_rating || 5.0).toFixed(1)}</div>
                        <div className="text-[11px] font-medium" style={{ color: '#6b7280' }}>Rating</div>
                      </motion.div>
                    </div>

                    {/* Vendor Features */}
                    <div className="space-y-2 mb-5">
                      {['Fast & Reliable Shipping', 'Quality Guarantee', '24/7 Customer Support'].map((feature, i) => (
                        <motion.div
                          key={feature}
                          className="flex items-center text-xs p-2.5 rounded-lg"
                          style={{ background: LUX.cream, color: LUX.emeraldDeep }}
                          whileHover={{ x: 5 }}
                        >
                          <Check className="h-3 w-3 mr-2 flex-shrink-0" style={{ color: LUX.emerald }} />
                          <span className="font-medium">{feature}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link
                          to={`/vendor/${vendor.id}/products`}
                          className="block w-full text-center text-white py-2.5 rounded-xl font-semibold shadow transition-all duration-300 text-sm"
                          style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
                        >
                          <ShoppingBag className="inline mr-2 h-4 w-4" />
                          View Products
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <a
                          href="#"
                          onClick={(e) => handleVisitStore(e, vendor.id)}
                          className="block w-full text-center py-2.5 rounded-xl font-semibold transition-all duration-300 text-xs border"
                          style={{ color: LUX.emerald, borderColor: `${LUX.gold}66`, background: 'rgba(6,78,59,0.02)' }}
                        >
                          <ExternalLink className="inline mr-2 h-3 w-3" />
                          Visit Store
                        </a>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="rounded-3xl shadow-xl p-12 max-w-2xl mx-auto border" style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)' }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}>
                  <Store className="h-12 w-12" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-3xl font-serif font-bold mb-4" style={{ color: LUX.emeraldDeep }}>No Vendors With Products Yet</h3>
                <p className="text-xl mb-8" style={{ color: '#4b5563' }}>
                  We're currently onboarding vendors with products. Check back soon to discover amazing sellers!
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg text-white"
                  style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
                >
                  <Store className="h-5 w-5" />
                  Become Our First Vendor
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative overflow-hidden py-28">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${LUX.ink} 0%, rgba(2,44,34,0.92) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(120% 80% at 80% 20%, rgba(201,162,75,0.18), transparent 55%)',
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }}
        />
        <motion.div
          className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="h-px w-10" style={{ background: LUX.gold }} />
            <span className="text-[11px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.goldSoft }}>
              Join the Collection
            </span>
            <span className="h-px w-10" style={{ background: LUX.gold }} />
          </div>
          <h2 className="font-serif text-4xl md:text-6xl font-semibold mb-6 text-white leading-[1.05]">
            Want to Join Our{' '}
            <span
              className="italic font-light"
              style={{
                backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Vendor Community?
            </span>
          </h2>
          <p className="text-base md:text-lg mb-10 max-w-2xl mx-auto text-white/80 leading-relaxed">
            Start selling your products to thousands of customers worldwide and grow your business with us.
          </p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            viewport={{ once: true }}
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-10 py-5 rounded-xl font-semibold tracking-wide transition-all shadow-xl text-lg"
              style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
            >
              <Store className="h-5 w-5" />
              Become a Vendor Today
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Vendors;
