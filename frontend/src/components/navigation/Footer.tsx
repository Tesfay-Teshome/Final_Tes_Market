import { Link } from 'react-router-dom';
import { ShoppingBag, Facebook, Twitter, Instagram, Mail, Phone, MapPin, CreditCard, Shield, Truck, ArrowRight, Heart } from 'lucide-react';

/**
 * Luxury palette tokens matching the Home page design.
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

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative text-white overflow-hidden" style={{ background: `linear-gradient(180deg, ${LUX.ink}, ${LUX.emeraldDeep})` }}>
      {/* Top gold accent line */}
      <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />

      {/* Trust Features Banner - Always centered, stacked on mobile */}
      <div className="relative py-12 md:py-16 border-b" style={{ borderColor: `${LUX.gold}20` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:gap-8 md:flex-row md:justify-center md:gap-12">
            {[
              { icon: CreditCard, title: 'Secure Payment', desc: 'Multiple payment options' },
              { icon: Shield, title: 'Buyer Protection', desc: '100% secure shopping' },
              { icon: Truck, title: 'Worldwide Delivery', desc: 'Fast & reliable shipping' },
            ].map((feature, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                <div
                  className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-105 mb-3"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${LUX.gold}30`,
                    boxShadow: `0 8px 32px -8px rgba(201,162,75,0.2)`,
                  }}
                >
                  <feature.icon className="h-7 w-7" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="font-serif font-semibold text-lg text-white">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content - Standard footer layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
          {/* Brand Column */}
          <div>
            <Link to="/" className="inline-flex items-center text-2xl font-serif font-bold mb-6">
              <ShoppingBag className="h-7 w-7 mr-2" style={{ color: LUX.goldSoft }} />
              <span style={{ color: LUX.goldSoft }}>TesMarket</span>
            </Link>
            <p className="text-white/65 mb-8 leading-relaxed text-sm">
              Your trusted marketplace for quality products from verified vendors worldwide. Discover premium items with confidence.
            </p>
            <div className="space-y-4">
              <div className="flex items-center group">
                <div
                  className="p-2 rounded-lg mr-3 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <Phone className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                </div>
                <span className="text-white/70 group-hover:text-white transition-colors text-sm">+1 (234) 567-890</span>
              </div>
              <div className="flex items-center group">
                <div
                  className="p-2 rounded-lg mr-3 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <Mail className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                </div>
                <span className="text-white/70 group-hover:text-white transition-colors text-sm">support@tesmarket.com</span>
              </div>
              <div className="flex items-center group">
                <div
                  className="p-2 rounded-lg mr-3 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <MapPin className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                </div>
                <span className="text-white/70 group-hover:text-white transition-colors text-sm">123 Market Street, NY</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-serif font-semibold mb-6" style={{ color: LUX.goldSoft }}>Quick Links</h3>
            <ul className="space-y-4">
              {[
                { to: '/products', label: 'All Products' },
                { to: '/categories', label: 'Categories' },
                { to: '/vendors', label: 'Vendors' },
                { to: '/deals', label: 'Special Deals' },
                { to: '/new-arrivals', label: 'New Arrivals' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-white/65 hover:text-white transition-colors flex items-center group text-sm"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: LUX.gold }}
                    />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-serif font-semibold mb-6" style={{ color: LUX.goldSoft }}>Customer Service</h3>
            <ul className="space-y-4">
              {[
                { to: '/contact', label: 'Contact Us' },
                { to: '/faq', label: 'FAQ' },
                { to: '/shipping', label: 'Shipping Information' },
                { to: '/returns', label: 'Returns Policy' },
                { to: '/privacy', label: 'Privacy Policy' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-white/65 hover:text-white transition-colors flex items-center group text-sm"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: LUX.gold }}
                    />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-serif font-semibold mb-6" style={{ color: LUX.goldSoft }}>Join Our Newsletter</h3>
            <p className="text-white/65 mb-5 text-sm leading-relaxed">
              Subscribe to get special offers, exclusive updates, and early access to new arrivals.
            </p>
            <form className="mb-8">
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors border"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    borderColor: `${LUX.gold}30`,
                  }}
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all whitespace-nowrap flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5"
                  style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
                >
                  Subscribe
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Social Links */}
            <div className="flex space-x-3">
              {[
                { href: 'https://facebook.com/tesmarket', icon: Facebook, label: 'Facebook' },
                { href: 'https://twitter.com/tesmarket', icon: Twitter, label: 'Twitter' },
                { href: 'https://instagram.com/tesmarket', icon: Instagram, label: 'Instagram' },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="p-3 rounded-xl transition-all duration-300 hover:scale-105 border"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: `${LUX.gold}25`,
                    color: LUX.goldSoft,
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow us on ${social.label}`}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t py-8" style={{ borderColor: `${LUX.gold}20` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-white/50 text-sm">
              &copy; {currentYear} TesMarket. All rights reserved. Crafted with{' '}
              <Heart className="h-3 w-3 inline-block mx-1" style={{ color: LUX.gold }} />
              for premium shopping.
            </p>

            {/* Payment Methods */}
            <div className="flex items-center space-x-3">
              {[
                { name: 'Visa', bg: '#1434CB' },
                { name: 'MC', bg: '#EB001B' },
                { name: 'PP', bg: '#003087' },
              ].map((method) => (
                <div
                  key={method.name}
                  className="px-4 py-2 rounded-lg shadow-sm transition-transform hover:scale-105"
                  style={{ background: method.bg, border: `1px solid ${LUX.gold}30` }}
                >
                  <span className="text-white text-xs font-bold tracking-wider">{method.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}40, transparent)` }}
      />
    </footer>
  );
};

export default Footer;
