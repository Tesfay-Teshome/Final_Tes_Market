import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

interface ProductVariant {
  id?: string;
  name: string;
  value: string;
  price_adjustment: number;
  stock: number;
}

interface ProductVariantsProps {
  productId: string;
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  readOnly?: boolean;
}

const ProductVariants = ({ productId, variants, onVariantsChange, readOnly = false }: ProductVariantsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState<ProductVariant>({
    name: '',
    value: '',
    price_adjustment: 0,
    stock: 0,
  });

  const handleAddVariant = () => {
    setEditingVariant(null);
    setFormData({
      name: '',
      value: '',
      price_adjustment: 0,
      stock: 0,
    });
    setIsDialogOpen(true);
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({ ...variant });
    setIsDialogOpen(true);
  };

  const handleSaveVariant = () => {
    if (!formData.name.trim() || !formData.value.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const newVariants = [...variants];
    
    if (editingVariant) {
      // Update existing variant
      const index = variants.findIndex(v => v.id === editingVariant.id);
      if (index !== -1) {
        newVariants[index] = { ...formData };
      }
    } else {
      // Add new variant
      const newVariant = {
        ...formData,
        id: `temp-${Date.now()}`, // Temporary ID for new variants
      };
      newVariants.push(newVariant);
    }

    onVariantsChange(newVariants);
    setIsDialogOpen(false);
    
    toast({
      title: 'Success',
      description: `Variant ${editingVariant ? 'updated' : 'added'} successfully`,
    });
  };

  const handleDeleteVariant = (variantId: string) => {
    const newVariants = variants.filter(v => v.id !== variantId);
    onVariantsChange(newVariants);
    
    toast({
      title: 'Success',
      description: 'Variant deleted successfully',
    });
  };

  const getTotalStock = () => {
    return variants.reduce((total, variant) => total + variant.stock, 0);
  };

  const getVariantsByType = () => {
    const grouped: { [key: string]: ProductVariant[] } = {};
    variants.forEach(variant => {
      if (!grouped[variant.name]) {
        grouped[variant.name] = [];
      }
      grouped[variant.name].push(variant);
    });
    return grouped;
  };

  const groupedVariants = getVariantsByType();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Variants
            </CardTitle>
            <CardDescription>
              Manage different variations of this product (size, color, etc.)
            </CardDescription>
          </div>
          {!readOnly && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingVariant ? 'Edit Variant' : 'Add New Variant'}
                  </DialogTitle>
                  <DialogDescription>
                    Create variations of your product with different attributes and pricing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="variant-name">Variant Type</Label>
                    <Input
                      id="variant-name"
                      placeholder="e.g., Size, Color, Material"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="variant-value">Variant Value</Label>
                    <Input
                      id="variant-value"
                      placeholder="e.g., Large, Red, Cotton"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price-adjustment">Price Adjustment ($)</Label>
                    <Input
                      id="price-adjustment"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price_adjustment}
                      onChange={(e) => setFormData({ ...formData, price_adjustment: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Additional cost for this variant (can be negative for discounts)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="variant-stock">Stock Quantity</Label>
                    <Input
                      id="variant-stock"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveVariant}>
                    {editingVariant ? 'Update' : 'Add'} Variant
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No variants added yet</p>
            {!readOnly && (
              <p className="text-sm">Add variants to offer different options for this product</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Total Variants</p>
                <p className="text-2xl font-bold">{variants.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Stock</p>
                <p className="text-2xl font-bold">{getTotalStock()}</p>
              </div>
            </div>

            {/* Grouped Variants */}
            {Object.entries(groupedVariants).map(([variantType, typeVariants]) => (
              <div key={variantType} className="space-y-2">
                <h4 className="font-medium text-lg">{variantType}</h4>
                <div className="grid gap-2">
                  {typeVariants.map((variant) => (
                    <div key={variant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{variant.value}</p>
                            <p className="text-sm text-muted-foreground">
                              Stock: {variant.stock} units
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {variant.price_adjustment >= 0 ? '+' : ''}${variant.price_adjustment.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">Price adjustment</p>
                          </div>
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditVariant(variant)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => variant.id && handleDeleteVariant(variant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductVariants;
