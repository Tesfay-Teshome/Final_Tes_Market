import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Upload, X, Star, StarOff, Image as ImageIcon, Eye } from 'lucide-react';
import { resolveMediaUrl } from '@/services/api';

interface ProductImage {
  id?: string;
  image: string | File;
  is_primary: boolean;
  created_at?: string;
}

interface ProductImagesProps {
  productId: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  readOnly?: boolean;
  maxImages?: number;
}

const ProductImages = ({ 
  productId, 
  images, 
  onImagesChange, 
  readOnly = false, 
  maxImages = 10 
}: ProductImagesProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: ProductImage[] = [];
    const remainingSlots = maxImages - images.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not an image file`,
          variant: 'destructive',
        });
        continue;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 5MB`,
          variant: 'destructive',
        });
        continue;
      }

      newImages.push({
        id: `temp-${Date.now()}-${i}`,
        image: file,
        is_primary: images.length === 0 && i === 0, // First image is primary if no images exist
      });
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
      toast({
        title: 'Success',
        description: `${newImages.length} image(s) added successfully`,
      });
    }

    if (files.length > remainingSlots) {
      toast({
        title: 'Upload limit reached',
        description: `Only ${remainingSlots} more images can be added (max ${maxImages})`,
        variant: 'destructive',
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemoveImage = (imageId: string) => {
    const newImages = images.filter(img => img.id !== imageId);
    
    // If we removed the primary image, make the first remaining image primary
    if (newImages.length > 0 && !newImages.some(img => img.is_primary)) {
      newImages[0].is_primary = true;
    }
    
    onImagesChange(newImages);
    toast({
      title: 'Success',
      description: 'Image removed successfully',
    });
  };

  const handleSetPrimary = (imageId: string) => {
    const newImages = images.map(img => ({
      ...img,
      is_primary: img.id === imageId,
    }));
    
    onImagesChange(newImages);
    toast({
      title: 'Success',
      description: 'Primary image updated',
    });
  };

  const getImageUrl = (image: ProductImage) => {
    if (typeof image.image === 'string') {
      return resolveMediaUrl(image.image) || '';
    } else {
      return URL.createObjectURL(image.image);
    }
  };

  const primaryImage = images.find(img => img.is_primary);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Product Images
        </CardTitle>
        <CardDescription>
          Upload multiple images for your product. The first image will be used as the main product image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!readOnly && images.length < maxImages && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              PNG, JPG, GIF up to 5MB each (max {maxImages} images)
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        )}

        {/* Images Grid */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {images.length} of {maxImages} images
              </p>
              {primaryImage && (
                <p className="text-xs text-muted-foreground">
                  Primary image: {typeof primaryImage.image === 'string' ? 'Uploaded' : primaryImage.image.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={getImageUrl(image)}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Primary Badge */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Primary
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedImage(image)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Image Preview</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center p-1">
                          <img
                            src={getImageUrl(image)}
                            alt="Product"
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    {!readOnly && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => image.id && handleSetPrimary(image.id)}
                          disabled={image.is_primary}
                        >
                          {image.is_primary ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => image.id && handleRemoveImage(image.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No images uploaded yet</p>
            {!readOnly && (
              <p className="text-sm">Upload images to showcase your product</p>
            )}
          </div>
        )}

        {/* Image Guidelines */}
        {!readOnly && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted rounded">
            <p><strong>Image Guidelines:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use high-quality images (at least 800x800 pixels)</li>
              <li>Show your product from multiple angles</li>
              <li>Use good lighting and clean backgrounds</li>
              <li>The first image will be used as the main product image</li>
              <li>Supported formats: PNG, JPG, GIF (max 5MB each)</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductImages;
