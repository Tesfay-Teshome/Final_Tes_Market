import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: '1',
      type: 'visa',
      last4: '4242',
      expiryMonth: '12',
      expiryYear: '2025',
      isDefault: true,
      cardholderName: 'John Doe',
      addedDate: '2024-01-15'
    },
    {
      id: '2',
      type: 'mastercard',
      last4: '8888',
      expiryMonth: '06',
      expiryYear: '2026',
      isDefault: false,
      cardholderName: 'John Doe',
      addedDate: '2024-02-20'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });

  const getCardIcon = (type: string) => {
    return <CreditCard className="h-6 w-6" />;
  };

  const getCardBrand = (type: string) => {
    switch (type) {
      case 'visa':
        return 'Visa';
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
        return 'American Express';
      default:
        return 'Card';
    }
  };

  const handleAddCard = () => {
    // In a real app, this would integrate with a payment processor like Stripe
    const newPaymentMethod = {
      id: Date.now().toString(),
      type: 'visa', // This would be determined by the card number
      last4: newCard.cardNumber.slice(-4),
      expiryMonth: newCard.expiryMonth,
      expiryYear: newCard.expiryYear,
      isDefault: paymentMethods.length === 0,
      cardholderName: newCard.cardholderName,
      addedDate: new Date().toISOString().split('T')[0]
    };

    setPaymentMethods([...paymentMethods, newPaymentMethod]);
    setNewCard({
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardholderName: ''
    });
    setShowAddForm(false);
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === id
      }))
    );
  };

  const handleDeleteCard = (id: string) => {
    setPaymentMethods(methods => methods.filter(method => method.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#070B0F] text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 relative overflow-hidden">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
        <div className="mx-auto">
          {/* Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-lg">
                  <CreditCard className="h-5 w-5 text-[#3CFF9E]" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Payment Methods</h1>
              </div>
              <p className="text-[#8B949E] text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
                Manage your payment methods for faster checkout
              </p>
            </motion.div>
          </div>

          {/* Security Notice */}
          <div className="mb-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl p-5 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center space-x-4 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-wider">Your payment information is secure</p>
                <p className="text-xs font-bold text-emerald-400/80 mt-0.5">We use industry-standard encryption to protect your data</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Existing Payment Methods */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Saved Cards</h2>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[10px] font-black uppercase tracking-widest hover:from-emerald-500 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-900/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </div>

              <div className="space-y-4">
                {paymentMethods.map((method, index) => (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className={`rounded-3xl border transition-all duration-300 group overflow-hidden ${method.isDefault ? 'border-emerald-500/30 bg-[#0F1720]/80 shadow-emerald-500/10 shadow-2xl' : 'border-white/[0.05] bg-[#0F1720]/40 hover:border-white/[0.1] backdrop-blur-xl'}`}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-colors ${method.isDefault ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/60 group-hover:text-white'}`}>
                              {getCardIcon(method.type)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <span className="font-black text-white tracking-widest uppercase">
                                  {getCardBrand(method.type)} •• {method.last4}
                                </span>
                                {method.isDefault && (
                                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                    <CheckCircle className="h-2 w-2" />
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mt-1">
                                Expires {method.expiryMonth}/{method.expiryYear}
                              </p>
                              <p className="text-[9px] font-black text-[#586069] uppercase mt-0.5 italic">
                                {method.cardholderName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!method.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefault(method.id)}
                                className="h-8 px-3 rounded-lg bg-white/5 border-white/5 text-[9px] font-black uppercase tracking-widest text-[#8B949E] hover:text-white hover:bg-emerald-500/10 transition-all"
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCard(method.id)}
                              className="h-8 w-8 p-0 rounded-lg bg-white/5 border-white/5 text-[#586069] hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {paymentMethods.length === 0 && (
                  <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/40 backdrop-blur-xl p-12 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
                      <CreditCard className="h-8 w-8 text-[#586069]" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">No payment methods</h3>
                    <p className="text-[#8B949E] text-sm font-medium mb-8">Add a payment method to get started</p>
                    <Button
                      onClick={() => setShowAddForm(true)}
                      className="h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest hover:from-emerald-500 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-900/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Card
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Add New Card Form */}
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/80 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <CreditCard className="h-32 w-32" />
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg">
                        <Plus className="h-4 w-4 text-emerald-400" />
                      </div>
                      Add New Card
                    </h3>

                    <div className="space-y-5">
                      <div className="group">
                        <label className="block text-[10px] font-black text-[#586069] uppercase tracking-widest mb-2 group-focus-within:text-emerald-400 transition-colors">
                          Cardholder Name
                        </label>
                        <Input
                          type="text"
                          placeholder="John Doe"
                          value={newCard.cardholderName}
                          onChange={(e) => setNewCard({ ...newCard, cardholderName: e.target.value })}
                          className="h-12 bg-[#070B0F]/50 border-white/[0.05] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-white placeholder-[#586069] transition-all"
                        />
                      </div>

                      <div className="group">
                        <label className="block text-[10px] font-black text-[#586069] uppercase tracking-widest mb-2 group-focus-within:text-emerald-400 transition-colors">
                          Card Number
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={newCard.cardNumber}
                            onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                            maxLength={19}
                            className="h-12 pl-12 bg-[#070B0F]/50 border-white/[0.05] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-white placeholder-[#586069] transition-all"
                          />
                          <CreditCard className="absolute left-4 top-3.5 h-5 w-5 text-[#586069]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-5">
                        <div className="group">
                          <label className="block text-[10px] font-black text-[#586069] uppercase tracking-widest mb-2 group-focus-within:text-emerald-400 transition-colors">
                            Month
                          </label>
                          <Input
                            type="text"
                            placeholder="MM"
                            value={newCard.expiryMonth}
                            onChange={(e) => setNewCard({ ...newCard, expiryMonth: e.target.value })}
                            maxLength={2}
                            className="h-12 bg-[#070B0F]/50 border-white/[0.05] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-white text-center placeholder-[#586069] transition-all"
                          />
                        </div>
                        <div className="group">
                          <label className="block text-[10px] font-black text-[#586069] uppercase tracking-widest mb-2 group-focus-within:text-emerald-400 transition-colors">
                            Year
                          </label>
                          <Input
                            type="text"
                            placeholder="YYYY"
                            value={newCard.expiryYear}
                            onChange={(e) => setNewCard({ ...newCard, expiryYear: e.target.value })}
                            maxLength={4}
                            className="h-12 bg-[#070B0F]/50 border-white/[0.05] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-white text-center placeholder-[#586069] transition-all"
                          />
                        </div>
                        <div className="group">
                          <label className="block text-[10px] font-black text-[#586069] uppercase tracking-widest mb-2 group-focus-within:text-emerald-400 transition-colors">
                            CVV
                          </label>
                          <Input
                            type="text"
                            placeholder="123"
                            value={newCard.cvv}
                            onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                            maxLength={4}
                            className="h-12 bg-[#070B0F]/50 border-white/[0.05] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-white text-center placeholder-[#586069] transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button
                          onClick={handleAddCard}
                          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[10px] font-black uppercase tracking-widest hover:from-emerald-500 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50"
                          disabled={!newCard.cardNumber || !newCard.expiryMonth || !newCard.expiryYear || !newCard.cvv}
                        >
                          Add Card
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowAddForm(false)}
                          className="flex-1 h-12 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-[#8B949E] hover:text-white hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;
