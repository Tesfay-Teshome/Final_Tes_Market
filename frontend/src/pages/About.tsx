import { motion } from 'framer-motion';
import { ShoppingBag, Shield, Users, TrendingUp, Heart, Globe, Zap, Target, CheckCircle, Award, Star, Rocket } from 'lucide-react';

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

const About = () => {
  const stats = [
    { icon: Users, value: '50K+', label: 'Happy Customers' },
    { icon: ShoppingBag, value: '100K+', label: 'Quality Products' },
    { icon: Shield, value: '99.9%', label: 'Secure Transactions' },
    { icon: Award, value: '5K+', label: 'Trusted Vendors' },
  ];

  const features = [
    { icon: Shield, title: 'Trust & Security', description: 'Enterprise-grade security protecting every transaction and user data with advanced encryption.' },
    { icon: CheckCircle, title: 'Quality Assurance', description: 'Rigorous vendor verification and product quality standards ensure you get the best.' },
    { icon: Heart, title: 'Customer First', description: 'Your satisfaction is our priority with 24/7 support and hassle-free returns.' },
    { icon: Globe, title: 'Global Reach', description: 'Connect with vendors worldwide and discover unique products from every corner of the globe.' },
    { icon: Zap, title: 'Lightning Fast', description: 'Optimized platform performance ensures quick browsing, ordering, and delivery.' },
    { icon: Target, title: 'Precision Matching', description: 'Advanced algorithms help you find exactly what you need from the right vendors.' },
  ];

  const team = [
    { name: 'Tesfay Teshome', role: 'Founder & CEO', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80', description: 'Visionary leader with 10+ years in e-commerce and marketplace development.' },
    { name: 'Selam Tesfay', role: 'Head of Operations', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80', description: 'Operations expert ensuring smooth platform performance and vendor relations.' },
    { name: 'Mattiyas Tesfay', role: 'Chief Technology Officer', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80', description: 'Tech innovator building scalable solutions for the future of e-commerce.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: LUX.paper }}>
      {/* Hero Banner */}
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
                  The TesMarket Story
                </span>
              </div>
              <h1 className="font-serif font-semibold text-white leading-[1.05] tracking-tight text-[2.2rem] sm:text-5xl lg:text-[3.6rem] mb-5">
                About <span className="italic font-light" style={{ backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TesMarket</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/85 leading-relaxed max-w-xl">
                Connecting buyers and sellers in a <span className="font-semibold" style={{ color: LUX.goldSoft }}>secure, innovative marketplace</span> built on trust and excellence.
              </p>
              <motion.div
                className="flex flex-wrap gap-6 text-sm mt-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <motion.div className="flex items-center" whileHover={{ scale: 1.1 }}>
                  <Rocket className="h-5 w-5 mr-2" style={{ color: LUX.goldSoft }} />
                  <span className="text-white/80">Since 2024</span>
                </motion.div>
                <motion.div className="flex items-center" whileHover={{ scale: 1.1 }}>
                  <Globe className="h-5 w-5 mr-2" style={{ color: LUX.goldSoft }} />
                  <span className="text-white/80">Global Marketplace</span>
                </motion.div>
                <motion.div className="flex items-center" whileHover={{ scale: 1.1 }}>
                  <Heart className="h-5 w-5 mr-2" style={{ color: LUX.goldSoft }} />
                  <span className="text-white/80">Customer Focused</span>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <motion.section className="py-24" style={{ background: LUX.cream }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="By The Numbers" title="Our Impact in Numbers" subtitle="See how we're making a difference in the e-commerce world" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center p-8 rounded-2xl border transition-all duration-300"
                style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.22)' }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 border"
                  style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, borderColor: `${LUX.gold}55`, boxShadow: `0 8px 24px -10px ${LUX.emerald}` }}
                >
                  <stat.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <motion.p className="font-serif text-4xl font-semibold mb-2" style={{ color: LUX.emeraldDeep }} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 + index * 0.1, type: "spring" }}>
                  {stat.value}
                </motion.p>
                <p className="text-[11px] font-semibold tracking-[0.28em] uppercase" style={{ color: LUX.gold }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Mission & Vision */}
      <motion.section className="py-24" style={{ background: LUX.paper }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              className="rounded-2xl p-10 border transition-all duration-300"
              style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 24px 50px -28px rgba(6,78,59,0.25)' }}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -8 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, boxShadow: `0 8px 24px -10px ${LUX.emerald}` }}>
                  <Target className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-2xl font-serif font-semibold" style={{ color: LUX.emeraldDeep }}>Our Mission</h3>
              </div>
              <p className="text-base leading-relaxed" style={{ color: '#4b5563' }}>
                To create the world's most trusted marketplace where quality vendors and buyers connect seamlessly,
                fostering a global community built on trust, innovation, and exceptional service.
              </p>
            </motion.div>
            <motion.div
              className="rounded-2xl p-10 border transition-all duration-300"
              style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 24px 50px -28px rgba(6,78,59,0.25)' }}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -8 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, boxShadow: `0 8px 24px -10px ${LUX.emerald}` }}>
                  <Rocket className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-2xl font-serif font-semibold" style={{ color: LUX.emeraldDeep }}>Our Vision</h3>
              </div>
              <p className="text-base leading-relaxed" style={{ color: '#4b5563' }}>
                To revolutionize e-commerce by making quality products accessible to everyone while empowering
                vendors to reach global markets through our innovative platform.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section className="py-24" style={{ background: LUX.cream }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="What Sets Us Apart" title="What Makes Us Special" subtitle="Discover the features and values that set TesMarket apart from other marketplaces" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group rounded-2xl p-8 border transition-all duration-300"
                style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.20)' }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, boxShadow: `0 8px 24px -10px ${LUX.emerald}` }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-lg font-serif font-semibold mb-2" style={{ color: LUX.emeraldDeep }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Team Section */}
      <motion.section className="py-24" style={{ background: LUX.paper }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Our People" title="Meet Our Team" subtitle="The passionate people behind TesMarket's success" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={index}
                className="rounded-2xl p-10 text-center border transition-all duration-300"
                style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 24px 50px -28px rgba(6,78,59,0.25)' }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -8 }}
              >
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${LUX.gold}, ${LUX.emerald}, ${LUX.gold})`,
                      padding: 3,
                    }}
                  >
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover border-4"
                      style={{ borderColor: '#fff' }}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-serif font-semibold mb-1" style={{ color: LUX.emeraldDeep }}>{member.name}</h3>
                <p className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-4" style={{ color: LUX.gold }}>{member.role}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Company Story */}
      <section className="py-24" style={{ background: LUX.cream }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-3 mb-5">
                <span className="h-px w-8" style={{ background: LUX.gold }} />
                <span className="text-[11px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.gold }}>Our Story</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-6" style={{ color: LUX.emeraldDeep }}>
                The TesMarket Journey
              </h2>
              <div className="space-y-6 text-base leading-relaxed" style={{ color: '#4b5563' }}>
                <p>
                  TesMarket was born from a simple idea: creating a marketplace where trust, quality, and innovation come together
                  to serve both vendors and customers better than ever before.
                </p>
                <p>
                  Founded in 2024, we've grown from a small startup to a thriving platform that connects thousands of verified
                  vendors with millions of satisfied customers worldwide.
                </p>
                <p>
                  Our commitment to excellence, security, and customer satisfaction has made us the go-to marketplace for
                  quality products and reliable service.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl p-8 text-white" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />
                <h3 className="text-2xl font-serif font-bold mb-6">Why Choose TesMarket?</h3>
                <ul className="space-y-4">
                  {[
                    'Verified vendors with proven track records',
                    'Secure payment processing and data protection',
                    'Fast shipping and reliable delivery',
                    '24/7 customer support and assistance',
                    'Quality guarantee and easy returns',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" style={{ color: LUX.goldSoft }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
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
            Ready to Experience{' '}
            <span
              className="italic font-light"
              style={{
                backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              TesMarket?
            </span>
          </h2>
          <p className="text-base md:text-lg mb-10 max-w-2xl mx-auto text-white/80 leading-relaxed">
            Join our community of satisfied customers and trusted vendors today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/products"
              className="inline-flex items-center gap-2 px-9 py-3.5 rounded-xl font-semibold tracking-wide transition-all shadow-xl text-white"
              style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, border: `1px solid ${LUX.gold}55` }}
            >
              <ShoppingBag className="h-5 w-5" />
              Start Shopping
            </a>
            <a
              href="/vendor/register"
              className="inline-flex items-center gap-2 px-9 py-3.5 rounded-xl font-semibold tracking-wide transition-all border hover:bg-white/5 text-white"
              style={{ borderColor: `${LUX.gold}88` }}
            >
              <Users className="h-5 w-5" />
              Become a Vendor
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default About;
