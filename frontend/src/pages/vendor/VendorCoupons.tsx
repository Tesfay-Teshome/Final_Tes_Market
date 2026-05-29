import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Trash2,
    Edit,
    Ticket,
    Calendar,
    Percent,
    DollarSign,
    X,
    Tag,
    Loader2,
    CheckCircle,
    Clock,
    AlertCircle,
    MoreVertical,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { couponsAPI } from '@/services/api';
import { format } from 'date-fns';

const couponSchema = z.object({
    code: z.string().min(3, 'Code must be at least 3 characters').regex(/^[A-Z0-9_-]+$/, 'Only uppercase letters, numbers, hyphens and underscores'),
    description: z.string().optional(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().min(0.01, 'Value must be greater than 0'),
    min_purchase_amount: z.number().min(0, 'Cannot be negative').optional(),
    valid_from: z.string().min(1, 'Start date is required'),
    valid_until: z.string().min(1, 'End date is required'),
    usage_limit: z.number().min(0).optional(),
    per_user_limit: z.number().min(1).optional(),
    is_active: z.boolean().default(true),
});

type CouponFormData = z.infer<typeof couponSchema>;

const inputClass = "w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm font-medium text-white placeholder-[#586069] focus:outline-none focus:border-[#3CFF9E]/50 transition-all";
const labelClass = "block text-[10px] font-black text-[#7A9A90] uppercase tracking-widest mb-2";

const VendorCoupons = () => {
    const { toast } = useToast();
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<any>(null);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<CouponFormData>({
        resolver: zodResolver(couponSchema),
        defaultValues: {
            discount_type: 'percentage',
            is_active: true,
        },
    });

    const discountType = watch('discount_type');

    useEffect(() => {
        fetchCoupons();
    }, []);

    useEffect(() => {
        if (editingCoupon) {
            reset({
                code: editingCoupon.code,
                description: editingCoupon.description,
                discount_type: editingCoupon.discount_type,
                discount_value: Number(editingCoupon.discount_value),
                min_purchase_amount: Number(editingCoupon.min_purchase_amount),
                valid_from: editingCoupon.valid_from?.split('T')[0] || '',
                valid_until: editingCoupon.valid_until?.split('T')[0] || '',
                usage_limit: editingCoupon.usage_limit,
                per_user_limit: editingCoupon.per_user_limit,
                is_active: editingCoupon.is_active,
            });
        } else {
            reset({ discount_type: 'percentage', is_active: true });
        }
    }, [editingCoupon, reset]);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const response = await couponsAPI.getVendorCoupons();
            setCoupons(response.data);
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
            toast({ title: 'Error', description: 'Failed to load coupons', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CouponFormData) => {
        try {
            if (editingCoupon) {
                await couponsAPI.update(editingCoupon.id, data);
                toast({ title: 'Success', description: 'Coupon updated successfully' });
            } else {
                await couponsAPI.create(data);
                toast({ title: 'Success', description: 'Coupon created successfully' });
            }
            setIsModalOpen(false);
            setEditingCoupon(null);
            fetchCoupons();
        } catch (error: any) {
            const errorMsg = error.response?.data?.code || error.response?.data?.detail || 'Failed to save coupon';
            if (typeof error.response?.data === 'object') {
                const keys = Object.keys(error.response.data);
                if (keys.length > 0 && !error.response.data.detail) {
                    toast({ title: 'Validation Error', description: `${keys[0]}: ${error.response.data[keys[0]]}`, variant: 'destructive' });
                    return;
                }
            }
            toast({ title: 'Error', description: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg, variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;
        try {
            await couponsAPI.delete(id);
            toast({ title: 'Success', description: 'Coupon deleted successfully' });
            fetchCoupons();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete coupon', variant: 'destructive' });
        }
    };

    const handleEdit = (coupon: any) => { setEditingCoupon(coupon); setIsModalOpen(true); };
    const handleCreate = () => { setEditingCoupon(null); setIsModalOpen(true); };

    const isCouponActive = (coupon: any) => coupon.is_active && new Date(coupon.valid_until) > new Date();

    return (
        <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-4 sm:pb-6 bg-[#070B0F]">
            {/* Premium Background Layer */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
                    style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-violet-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1700px] mx-auto pt-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-lg">
                                <Tag className="h-5 w-5 text-[#3CFF9E]" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Coupon Registry</h1>
                        </div>
                        <p className="text-[#8B949E] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3CFF9E]" />
                            {coupons.length} DISCOUNT CODES ACTIVE
                        </p>
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02, translateY: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-2xl border border-emerald-400/20"
                    >
                        <Plus className="h-4 w-4" />
                        Create Coupon
                    </motion.button>
                </div>

                {/* Coupons Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full animate-pulse" />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                className="relative h-16 w-16 rounded-2xl border-2 border-t-[#3CFF9E] border-r-transparent border-b-emerald-900 border-l-transparent"
                            />
                        </div>
                    </div>
                ) : coupons.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-24 text-center rounded-2xl border border-white/[0.04] bg-[#0F1720]/50 backdrop-blur-xl"
                    >
                        <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
                            <Ticket className="h-10 w-10 text-[#586069]" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">No Coupons Configured</h3>
                        <p className="text-[#8B949E] text-sm font-medium italic mb-4">Deploy your first discount protocol to attract more customers.</p>
                        <motion.button
                            whileHover={{ scale: 1.02, translateY: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleCreate}
                            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-400/20 shadow-lg"
                        >
                            <Plus className="h-4 w-4 mr-2 inline" /> Create First Coupon
                        </motion.button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                    >
                        {coupons.map((coupon, idx) => (
                            <motion.div
                                key={coupon.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0F1720]/70 backdrop-blur-3xl p-6 hover:border-[#3CFF9E]/30 transition-all duration-500 shadow-2xl"
                            >
                                {/* Hover glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#3CFF9E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Header row */}
                                <div className="flex items-start justify-between mb-5 relative z-10">
                                    <div>
                                        <div className="text-[18px] font-black text-white tracking-widest font-mono group-hover:text-[#3CFF9E] transition-colors">
                                            {coupon.code}
                                        </div>
                                        {coupon.description && (
                                            <p className="text-[#8B949E] text-[11px] font-medium mt-1">{coupon.description}</p>
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex-shrink-0 ${isCouponActive(coupon)
                                            ? 'text-[#3CFF9E] border-[#3CFF9E]/20 bg-[#3CFF9E]/10'
                                            : 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                                        }`}>
                                        {isCouponActive(coupon) ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                {/* Discount Display */}
                                <div className="relative z-10 mb-5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-2">
                                        {coupon.discount_type === 'percentage' ? (
                                            <Percent className="h-5 w-5 text-[#3CFF9E]" />
                                        ) : (
                                            <DollarSign className="h-5 w-5 text-[#3CFF9E]" />
                                        )}
                                        <span className="text-2xl font-black text-white">
                                            {coupon.discount_type === 'percentage'
                                                ? `${coupon.discount_value}% OFF`
                                                : `$${coupon.discount_value} OFF`}
                                        </span>
                                    </div>
                                    {Number(coupon.min_purchase_amount) > 0 && (
                                        <p className="text-[10px] font-bold text-[#586069] uppercase tracking-widest mt-1.5">
                                            Min purchase: ${coupon.min_purchase_amount}
                                        </p>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="relative z-10 grid grid-cols-2 gap-3 mb-5">
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] font-black text-[#586069] uppercase tracking-widest mb-1">Usage</p>
                                        <p className="text-sm font-black text-white">{coupon.times_used} / {coupon.usage_limit || '∞'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] font-black text-[#586069] uppercase tracking-widest mb-1">Per User</p>
                                        <p className="text-sm font-black text-white">{coupon.per_user_limit || '∞'}</p>
                                    </div>
                                </div>

                                {/* Validity */}
                                <div className="relative z-10 flex items-center gap-2 mb-5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">
                                    <Calendar className="h-3.5 w-3.5 text-[#3CFF9E]/60" />
                                    {coupon.valid_from && coupon.valid_until
                                        ? `${format(new Date(coupon.valid_from), 'MMM d')} — ${format(new Date(coupon.valid_until), 'MMM d, yyyy')}`
                                        : 'No date range'
                                    }
                                </div>

                                {/* Actions */}
                                <div className="relative z-10 flex items-center gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleEdit(coupon)}
                                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <Edit className="h-3.5 w-3.5 text-[#3CFF9E]" />
                                        Edit
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleDelete(coupon.id)}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#070B0F]/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100]"
                        onClick={() => { setIsModalOpen(false); setEditingCoupon(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#0F1720] border border-white/10 rounded-2xl max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-[#3CFF9E]/10 border border-[#3CFF9E]/20">
                                            <Tag className="h-5 w-5 text-[#3CFF9E]" />
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                            {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => { setIsModalOpen(false); setEditingCoupon(null); }}
                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                                    >
                                        <X className="h-5 w-5 text-[#8B949E]" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Coupon Code</label>
                                            <input
                                                {...register('code')}
                                                className={`${inputClass} uppercase font-mono`}
                                                placeholder="SUMMER2025"
                                                style={{ textTransform: 'uppercase' }}
                                            />
                                            {errors.code && <p className="mt-1 text-[10px] text-rose-400">{errors.code.message}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Status</label>
                                            <select
                                                {...register('is_active', { setValueAs: (v) => v === 'true' || v === true })}
                                                className={`${inputClass} appearance-none`}
                                            >
                                                <option value="true" className="bg-[#0D1117]">Active</option>
                                                <option value="false" className="bg-[#0D1117]">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Description (Optional)</label>
                                        <input {...register('description')} className={inputClass} placeholder="Summer Sale Discount" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Discount Type</label>
                                            <select {...register('discount_type')} className={`${inputClass} appearance-none`}>
                                                <option value="percentage" className="bg-[#0D1117]">Percentage (%)</option>
                                                <option value="fixed" className="bg-[#0D1117]">Fixed Amount ($)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Value</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#586069] text-sm font-bold">
                                                    {discountType === 'fixed' ? '$' : '%'}
                                                </span>
                                                <input
                                                    {...register('discount_value', { valueAsNumber: true })}
                                                    type="number"
                                                    step="0.01"
                                                    className={`${inputClass} pl-8`}
                                                    placeholder="10"
                                                />
                                            </div>
                                            {errors.discount_value && <p className="mt-1 text-[10px] text-rose-400">{errors.discount_value.message}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Minimum Purchase Amount ($)</label>
                                        <input {...register('min_purchase_amount', { valueAsNumber: true })} type="number" step="0.01" className={inputClass} placeholder="0.00" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Valid From</label>
                                            <input {...register('valid_from')} type="date" className={inputClass} />
                                            {errors.valid_from && <p className="mt-1 text-[10px] text-rose-400">{errors.valid_from.message}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Valid Until</label>
                                            <input {...register('valid_until')} type="date" className={inputClass} />
                                            {errors.valid_until && <p className="mt-1 text-[10px] text-rose-400">{errors.valid_until.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Total Usage Limit</label>
                                            <input {...register('usage_limit', { valueAsNumber: true })} type="number" className={inputClass} placeholder="Unlimited" />
                                            <p className="text-[10px] text-[#586069] mt-1">Leave empty for unlimited</p>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Limit Per User</label>
                                            <input {...register('per_user_limit', { valueAsNumber: true })} type="number" className={inputClass} placeholder="Unlimited" />
                                            <p className="text-[10px] text-[#586069] mt-1">Leave empty for unlimited</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => { setIsModalOpen(false); setEditingCoupon(null); }}
                                            className="px-6 py-3 bg-white/[0.04] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl border border-emerald-400/20"
                                        >
                                            {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorCoupons;
