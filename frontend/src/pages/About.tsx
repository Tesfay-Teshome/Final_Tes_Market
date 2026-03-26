import { motion } from 'framer-motion';
import { ShoppingBag, Shield, Users, TrendingUp, Heart, Globe, Zap, Target, CheckCircle, Award, Star, Rocket } from 'lucide-react';
import Banner from '../components/ui/Banner';

const About = () => {
  const stats = [
    {
      icon: Users,
      value: '50K+',
      label: 'Happy Customers',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      icon: ShoppingBag,
      value: '100K+',
      label: 'Quality Products',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Shield,
      value: '99.9%',
      label: 'Secure Transactions',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Award,
      value: '5K+',
      label: 'Trusted Vendors',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Trust & Security',
      description: 'Enterprise-grade security protecting every transaction and user data with advanced encryption.',
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      icon: CheckCircle,
      title: 'Quality Assurance',
      description: 'Rigorous vendor verification and product quality standards ensure you get the best.',
      color: 'bg-green-50 text-green-600'
    },
    {
      icon: Heart,
      title: 'Customer First',
      description: 'Your satisfaction is our priority with 24/7 support and hassle-free returns.',
      color: 'bg-red-50 text-red-600'
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Connect with vendors worldwide and discover unique products from every corner of the globe.',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized platform performance ensures quick browsing, ordering, and delivery.',
      color: 'bg-yellow-50 text-yellow-600'
    },
    {
      icon: Target,
      title: 'Precision Matching',
      description: 'Advanced algorithms help you find exactly what you need from the right vendors.',
      color: 'bg-indigo-50 text-indigo-600'
    }
  ];

  const team = [
    {
      name: 'Tesfay Teshome',
      role: 'Founder & CEO',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
      description: 'Visionary leader with 10+ years in e-commerce and marketplace development.'
    },
    {
      name: 'Selam Tesfay',
      role: 'Head of Operations',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
      description: 'Operations expert ensuring smooth platform performance and vendor relations.'
    },
    {
      name: 'Mattiyas Tesfay',
      role: 'Chief Technology Officer',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
      description: 'Tech innovator building scalable solutions for the future of e-commerce.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      {/* Hero Banner */}
      <Banner 
        title="About TesMarket"
        subtitle="Connecting buyers and sellers in a secure, innovative marketplace"
      >
        <motion.div 
          className="flex justify-center space-x-8 text-sm mt-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.1 }}
          >
            <Rocket className="h-5 w-5 mr-2 text-yellow-300" />
            <span>Since 2024</span>
          </motion.div>
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.1 }}
          >
            <Globe className="h-5 w-5 mr-2 text-green-300" />
            <span>Global Marketplace</span>
          </motion.div>
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.1 }}
          >
            <Heart className="h-5 w-5 mr-2 text-red-300" />
            <span>Customer Focused</span>
          </motion.div>
        </motion.div>
      </Banner>

      {/* Stats Section */}
      <motion.section 
        className="py-16 bg-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-xl text-gray-600">
              See how we're making a difference in the e-commerce world
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                className={`text-center p-8 ${stat.bgColor} rounded-2xl hover:shadow-lg transition-all duration-300`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
              >
                <motion.div 
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${stat.color} text-white mb-4 shadow-lg`}
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.6 }}
                >
                  <stat.icon className="w-8 h-8" />
                </motion.div>
                <motion.p 
                  className="text-4xl font-bold text-gray-900 mb-2"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1, type: "spring" }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Mission & Vision */}
      <motion.section 
        className="py-16 bg-gradient-to-r from-gray-50 to-emerald-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div 
              className="bg-white p-8 rounded-2xl shadow-xl"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="flex items-center mb-6">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Target className="h-6 w-6 text-white" />
                </motion.div>
                <h3 className="text-3xl font-bold text-gray-900">Our Mission</h3>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To create the world's most trusted marketplace where quality vendors and buyers connect seamlessly, 
                fostering a global community built on trust, innovation, and exceptional service.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white p-8 rounded-2xl shadow-xl"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="flex items-center mb-6">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Rocket className="h-6 w-6 text-white" />
                </motion.div>
                <h3 className="text-3xl font-bold text-gray-900">Our Vision</h3>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To revolutionize e-commerce by making quality products accessible to everyone while empowering 
                vendors to reach global markets through our innovative platform.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        className="py-16 bg-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Makes Us Special
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the features and values that set TesMarket apart from other marketplaces
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index} 
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.03 }}
              >
                <motion.div 
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${feature.color} mb-6`}
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <feature.icon className="h-8 w-8" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Team Section */}
      <motion.section 
        className="py-16 bg-gray-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600">
              The passionate people behind TesMarket's success
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <motion.div 
                key={index} 
                className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                whileHover={{ y: -10, scale: 1.05 }}
              >
                <motion.img
                  src={member.image}
                  alt={member.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-4 border-gray-100"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.h3 
                  className="text-xl font-bold text-gray-900 mb-2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {member.name}
                </motion.h3>
                <motion.p 
                  className="text-emerald-600 font-semibold mb-4"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  {member.role}
                </motion.p>
                <motion.p 
                  className="text-gray-600 leading-relaxed"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  {member.description}
                </motion.p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Company Story */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Our Story
              </h2>
              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
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
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Why Choose TesMarket?</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-300 mr-3 flex-shrink-0 mt-0.5" />
                    <span>Verified vendors with proven track records</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-300 mr-3 flex-shrink-0 mt-0.5" />
                    <span>Secure payment processing and data protection</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-300 mr-3 flex-shrink-0 mt-0.5" />
                    <span>Fast shipping and reliable delivery</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-300 mr-3 flex-shrink-0 mt-0.5" />
                    <span>24/7 customer support and assistance</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-300 mr-3 flex-shrink-0 mt-0.5" />
                    <span>Quality guarantee and easy returns</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Experience TesMarket?
          </h2>
          <p className="text-xl mb-8 text-emerald-100">
            Join our community of satisfied customers and trusted vendors today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/products"
              className="bg-white text-emerald-600 px-8 py-4 rounded-full font-semibold hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center justify-center"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Start Shopping
            </a>
            <a
              href="/vendor/register"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-emerald-600 transition-all duration-300 transform hover:scale-105 inline-flex items-center justify-center"
            >
              <Users className="mr-2 h-5 w-5" />
              Become a Vendor
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
