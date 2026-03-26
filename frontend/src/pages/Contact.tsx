import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, Users, Headphones } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/axios';
import FadeIn from '@/components/animations/FadeIn';
import Banner from '@/components/ui/Banner';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      await api.post('/contact/', data);
      toast({
        title: 'Message sent',
        description: 'We will get back to you soon!',
      });
      reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Banner */}
      <Banner 
        title="Get in Touch"
        subtitle="We'd love to hear from you. Send us a message and we'll respond as soon as possible."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="h-full"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 h-full flex flex-col">
              <motion.h2 
                className="text-3xl font-bold text-gray-900 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <MessageSquare className="inline mr-3 h-8 w-8 text-emerald-600" />
                Contact Information
              </motion.h2>
              <div className="space-y-6">
                <motion.div 
                  className="flex items-center space-x-4 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-lg font-bold text-gray-900">support@tesmarket.com</p>
                  </div>
                </motion.div>
                <motion.div 
                  className="flex items-center space-x-4 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Phone</p>
                    <p className="text-lg font-bold text-gray-900">+1 234 567 8900</p>
                  </div>
                </motion.div>
                <motion.div 
                  className="flex items-center space-x-4 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Location</p>
                    <p className="text-lg font-bold text-gray-900">123 Market Street, City, Country</p>
                  </div>
                </motion.div>
              </div>
              
              {/* Additional Info */}
              <div className="mt-auto space-y-6">
                <motion.div 
                  className="p-6 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-xl font-bold mb-3">Why Contact Us?</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                      Quick response within 24 hours
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                      Expert support team
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                      Personalized solutions
                    </li>
                  </ul>
                </motion.div>

                <motion.div 
                  className="p-6 bg-gray-50 rounded-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Business Hours</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Monday - Friday:</span>
                      <span className="font-medium">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday:</span>
                      <span className="font-medium">10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday:</span>
                      <span className="font-medium">Closed</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="p-6 bg-green-50 rounded-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Follow Us</h3>
                  <div className="flex space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-emerald-700 transition-colors">
                      <span className="text-sm font-bold">f</span>
                    </div>
                    <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-emerald-500 transition-colors">
                      <span className="text-sm font-bold">t</span>
                    </div>
                    <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-pink-700 transition-colors">
                      <span className="text-sm font-bold">ig</span>
                    </div>
                    <div className="w-10 h-10 bg-emerald-700 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-emerald-800 transition-colors">
                      <span className="text-sm font-bold">in</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <motion.h2 
                className="text-3xl font-bold text-gray-900 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Send className="inline mr-3 h-8 w-8 text-purple-600" />
                Send us a message
              </motion.h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-lg font-semibold text-gray-800 mb-2">
                    Name
                  </label>
                  <input
                    {...register('name')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300 text-lg"
                    placeholder="Your full name"
                  />
                  {errors.name && (
                    <motion.p 
                      className="mt-2 text-sm text-red-600 flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {errors.name.message}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label className="block text-lg font-semibold text-gray-800 mb-2">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300 text-lg"
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <motion.p 
                      className="mt-2 text-sm text-red-600 flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label className="block text-lg font-semibold text-gray-800 mb-2">
                    Subject
                  </label>
                  <input
                    {...register('subject')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300 text-lg"
                    placeholder="How can we help you?"
                  />
                  {errors.subject && (
                    <motion.p 
                      className="mt-2 text-sm text-red-600 flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {errors.subject.message}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <label className="block text-lg font-semibold text-gray-800 mb-2">
                    Message
                  </label>
                  <textarea
                    {...register('message')}
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 text-lg resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                  {errors.message && (
                    <motion.p 
                      className="mt-2 text-sm text-red-600 flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {errors.message.message}
                    </motion.p>
                  )}
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 transition-all duration-300 text-lg shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Send className="h-5 w-5 mr-3" />
                  {isSubmitting ? 'Sending Message...' : 'Send Message'}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;