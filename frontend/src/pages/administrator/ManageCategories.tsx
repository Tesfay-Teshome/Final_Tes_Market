import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FolderOpen, Tag, Search, Filter, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI, categoriesAPI } from '@/services/api';
import { Category } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  parent_id: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const ManageCategories = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await adminAPI.getCategories();
      return response.data;
    },
  });

  const filteredCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) => {
      const name = (category.name || '').toLowerCase();
      const description = (category.description || '').toLowerCase();
      const parentName = (category.parent?.name || '').toLowerCase();
      return name.includes(q) || description.includes(q) || parentName.includes(q);
    });
  }, [categories, searchTerm]);

  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.parent_id) formData.append('parent_id', data.parent_id);
      return categoriesAPI.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({
        title: 'Success',
        description: 'Category added successfully.',
      });
      setIsAddModalOpen(false);
      reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add category.',
        variant: 'destructive',
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.parent_id) formData.append('parent_id', data.parent_id);
      return categoriesAPI.update(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({
        title: 'Success',
        description: 'Category updated successfully.',
      });
      setEditingCategory(null);
      reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update category.',
        variant: 'destructive',
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => categoriesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({
        title: 'Success',
        description: 'Category deleted successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete category.',
        variant: 'destructive',
      });
    },
  });

  const openAddModal = () => {
    reset();
    setEditingCategory(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setValue('name', category.name);
    setValue('description', category.description || '');
    setValue('parent_id', category.parent?.id || '');
    setIsAddModalOpen(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-4 border-t-transparent border-r-transparent border-b-transparent border-l-[#3CFF9E]"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 relative min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B] text-[#E6EDF3] pt-1 sm:pt-4 pb-4 sm:pb-6">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-16 right-10 w-[520px] h-[520px] bg-[rgba(60,179,113,0.16)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 left-12 w-[520px] h-[520px] bg-[rgba(255,215,0,0.10)] rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 px-4 md:px-8 w-full max-w-full pb-4 sm:pb-6">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mt-4 sm:mt-6"
          >
            <div className="pb-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-loose" style={{ lineHeight: '1.4' }}>
                Manage Categories
              </h1>
              <p className="text-xl text-gray-300 mt-2 font-medium leading-relaxed">Organize and manage product categories</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center space-x-2 sm:space-x-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 py-2 px-3 sm:px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700/95 backdrop-blur-sm text-white border-2 border-emerald-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Total Categories</p>
                    <p className="text-2xl font-bold">{Array.isArray(categories) ? categories.length : 0}</p>
                  </div>
                  <Tag className="h-8 w-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-600 to-green-700/95 backdrop-blur-sm text-white border-2 border-green-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Root Categories</p>
                    <p className="text-2xl font-bold">{Array.isArray(categories) ? categories.filter(c => !c.parent).length : 0}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-600 to-red-600/95 backdrop-blur-sm text-white border-2 border-orange-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Subcategories</p>
                    <p className="text-2xl font-bold">{Array.isArray(categories) ? categories.filter(c => !!c.parent).length : 0}</p>
                  </div>
                  <Layers className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-600 to-purple-700/95 backdrop-blur-sm text-white border-2 border-violet-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-100 text-sm font-medium">New Today</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Plus className="h-8 w-8 text-violet-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            className="flex flex-col md:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search categories by name, description, or parent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 h-12 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-400 shadow-lg transition-all duration-300"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            </div>
            <Button className="px-6 h-12 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </motion.div>

          {/* Enhanced Categories Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <Tag className="h-6 w-6 text-white" />
                <h2 className="text-lg font-semibold text-white">Categories Directory</h2>
              </div>
            </div>

            <div className="max-w-full">
              <table className="w-full divide-y divide-gray-700/50 table-fixed">
                <thead className="bg-gradient-to-r from-gray-800/80 to-gray-700/80">
                  <tr>
                    <th className="w-2/5 px-2 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="w-2/5 px-2 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="w-1/5 px-2 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">
                      Parent Category
                    </th>
                    <th className="w-1/5 px-4 py-3 text-right text-xs font-bold text-gray-200 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/50 divide-y divide-gray-700/30">
                  {Array.isArray(filteredCategories) && filteredCategories.length > 0 ? filteredCategories.map((category, index) => (
                    <motion.tr
                      key={category.id}
                      className="hover:bg-gradient-to-r hover:from-emerald-900/30 hover:to-green-900/30 transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <td className="px-2 py-3">
                        <div className="flex items-center">
                          <motion.div
                            className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <FolderOpen className="h-5 w-5 text-white" />
                          </motion.div>
                          <div className="ml-3">
                            <div className="text-sm font-bold text-gray-100">{category.name}</div>
                            <div className="text-xs text-gray-400">#{category.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-xs text-gray-300">
                          {category.description || (
                            <span className="italic text-gray-500">No description</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        {category.parent?.name ? (
                          <span className="px-1 py-0.5 inline-flex text-xs leading-4 font-bold rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md">
                            {category.parent.name}
                          </span>
                        ) : (
                          <span className="px-1 py-0.5 inline-flex text-xs leading-4 font-bold rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-gray-200 shadow-md">
                            Root Category
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openEditModal(category)}
                            className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                            title="Edit Category"
                          >
                            <Edit2 className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                            title="Delete Category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] rounded-full flex items-center justify-center">
                            <FolderOpen className="h-8 w-8 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-100">No Categories</h3>
                            <p className="text-gray-400">Get started by creating your first category</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Enhanced Category Form Modal */}
          <AnimatePresence>
            {isAddModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCategory(null);
                  reset();
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-gradient-to-br from-[#0F1720] via-[#1A2533] to-[#0F1720] rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-md overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                        <Tag className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-100 italic">
                          {editingCategory ? 'Edit Category' : 'Add New Category'}
                        </h2>
                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-0.5">
                          {editingCategory ? 'Update category information' : 'Create a new product category'}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setEditingCategory(null);
                        reset();
                      }}
                      className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>

                  {/* Modal Form Body */}
                  <div className="p-8 sidebar-scrollbar overflow-y-auto">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Category Name *
                        </label>
                        <input
                          {...register('name')}
                          className="w-full px-4 py-3 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/60 text-white placeholder-gray-500 transition-all duration-300"
                          placeholder="Enter category name"
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>{errors.name.message}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Description
                        </label>
                        <textarea
                          {...register('description')}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/60 text-white placeholder-gray-500 transition-all duration-300 resize-none"
                          placeholder="Describe this category (optional)"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Parent Category
                        </label>
                        <select
                          {...register('parent_id')}
                          className="w-full px-4 py-3 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/60 text-white transition-all duration-300"
                        >
                          <option value="" className="bg-[#0F1720]">None (Root Category)</option>
                          {Array.isArray(categories) ? categories.map((category) => (
                            <option
                              key={category.id}
                              value={category.id}
                              disabled={editingCategory?.id === category.id}
                              className="bg-[#0F1720]"
                            >
                              {category.name}
                            </option>
                          )) : null}
                        </select>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => {
                            setIsAddModalOpen(false);
                            setEditingCategory(null);
                            reset();
                          }}
                          className="flex-1 px-4 py-3 text-sm font-bold text-gray-300 bg-gray-800/60 border border-gray-700/50 rounded-xl hover:bg-gray-700/60 transition-all duration-200"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          className="flex-1 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-xl shadow-lg shadow-emerald-900/20 transition-all duration-200"
                        >
                          {editingCategory ? 'Update Category' : 'Create Category'}
                        </motion.button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
};

export default ManageCategories;