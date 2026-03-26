import { Link } from 'react-router-dom';
import { ShoppingBag, Facebook, Twitter, Instagram, Mail, Phone, MapPin, CreditCard, Shield, Truck } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative text-white bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Features Section */}
        <div className="py-12 border-b border-emerald-500/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center justify-center group">
              <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                <CreditCard className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="ml-4">
                <h3 className="font-bold text-lg text-white">Secure Payment</h3>
                <p className="text-gray-400 text-sm">Multiple payment options</p>
              </div>
            </div>
            <div className="flex items-center justify-center group">
              <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                <Shield className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="ml-4">
                <h3 className="font-bold text-lg text-white">Buyer Protection</h3>
                <p className="text-gray-400 text-sm">100% secure shopping</p>
              </div>
            </div>
            <div className="flex items-center justify-center group">
              <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                <Truck className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="ml-4">
                <h3 className="font-bold text-lg text-white">Worldwide Delivery</h3>
                <p className="text-gray-400 text-sm">Fast & reliable shipping</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent hover:from-emerald-300 hover:to-green-400 transition-all">
              <ShoppingBag className="h-8 w-8 mr-2 text-emerald-400" />
              Tes Market
            </Link>
            <p className="text-gray-400 mb-6">
              Your trusted marketplace for quality products from verified vendors worldwide.
            </p>
            <div className="space-y-3">
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-400">+1 (234) 567-890</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-400">support@tesmarket.com</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-400">123 Market Street, NY</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 text-emerald-400">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/products" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/vendors" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Vendors
                </Link>
              </li>
              <li>
                <Link to="/deals" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Special Deals
                </Link>
              </li>
              <li>
                <Link to="/new-arrivals" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 text-emerald-400">Customer Service</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Returns Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 text-emerald-400">Join Our Newsletter</h3>
            <p className="text-gray-400 mb-4">
              Subscribe to get special offers, free giveaways, and updates.
            </p>
            <form className="mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-4 py-2 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white min-w-0"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg sm:rounded-l-none sm:rounded-r-lg hover:from-emerald-700 hover:to-green-700 transition-all whitespace-nowrap font-semibold shadow-md hover:shadow-lg"
                >
                  Subscribe
                </button>
              </div>
            </form>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com/tesmarket"
                className="text-gray-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href="https://twitter.com/tesmarket"
                className="text-gray-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-6 w-6" />
              </a>
              <a
                href="https://instagram.com/tesmarket"
                className="text-gray-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-emerald-500/20">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Tes Market. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <div className="bg-white px-3 py-2 rounded-md shadow-sm">
                <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="32" rx="4" fill="#1434CB"/>
                  <text x="24" y="20" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">VISA</text>
                </svg>
              </div>
              
              <div className="bg-white px-3 py-2 rounded-md shadow-sm">
                <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="32" rx="4" fill="white"/>
                  <circle cx="18" cy="16" r="10" fill="#EB001B" opacity="0.8"/>
                  <circle cx="30" cy="16" r="10" fill="#F79E1B" opacity="0.8"/>
                </svg>
              </div>

              <div className="bg-white px-3 py-2 rounded-md shadow-sm">
                <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="32" rx="4" fill="#003087"/>
                  <text x="24" y="14" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">Pay</text>
                  <text x="24" y="22" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#009CDE" textAnchor="middle">Pal</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;