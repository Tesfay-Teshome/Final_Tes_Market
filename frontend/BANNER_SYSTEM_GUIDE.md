# TesMarket Banner System Guide

## Overview

The TesMarket platform now includes a comprehensive banner system with modern gradient backgrounds and a reusable Banner component. This system provides consistent visual branding across all pages while maintaining flexibility for different page types.

## Banner Component Usage

### Basic Usage

```tsx
import Banner from '@/components/ui/Banner';

<Banner 
  type="about" 
  title="Page Title"
  subtitle="Page description or subtitle"
/>
```

### Available Banner Types

1. **about** - Purple gradient with radial patterns
2. **contact** - Pink to red gradient with geometric patterns
3. **vendor** - Blue to cyan gradient with circular patterns
4. **buyer** - Pink to yellow gradient with diagonal stripes
5. **products** - Teal to pink gradient with soft radials
6. **admin** - Purple gradient with grid patterns
7. **orders** - Orange gradient with centered radial
8. **earnings** - Green gradient with horizontal lines

### Advanced Usage with Custom Content

```tsx
<Banner 
  type="vendor" 
  title="Vendor Dashboard"
  subtitle="Manage your products and orders"
>
  <div className="mt-8 flex space-x-4">
    <button className="bg-white/20 px-4 py-2 rounded-lg">
      Quick Action 1
    </button>
    <button className="bg-white/20 px-4 py-2 rounded-lg">
      Quick Action 2
    </button>
  </div>
</Banner>
```

### Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `'about' \| 'contact' \| 'vendor' \| 'buyer' \| 'products' \| 'admin' \| 'orders' \| 'earnings'` | Yes | Banner style type |
| `title` | `string` | Yes | Main banner title |
| `subtitle` | `string` | No | Banner subtitle/description |
| `children` | `React.ReactNode` | No | Additional content to display |
| `className` | `string` | No | Additional CSS classes |
| `animate` | `boolean` | No | Enable/disable animations (default: true) |

## CSS Banner Styles

The banner styles are defined in `/src/styles/banners.css` and include:

- Gradient backgrounds with overlay patterns
- Responsive design for mobile and desktop
- Animation classes for smooth transitions
- Consistent overlay and content positioning

### Custom Banner Creation

To create a new banner type:

1. Add CSS class in `banners.css`:
```css
.banner-custom {
  background: linear-gradient(135deg, #your-colors);
  position: relative;
  overflow: hidden;
}

.banner-custom::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: /* your pattern */;
}
```

2. Update Banner component type definition:
```tsx
type: 'about' | 'contact' | 'vendor' | 'buyer' | 'products' | 'admin' | 'orders' | 'earnings' | 'custom'
```

## Actual Banner Image Recommendations

For production use, consider replacing CSS gradients with actual images:

### Image Specifications
- **Dimensions**: 1920x400px minimum (maintain 4.8:1 aspect ratio)
- **Format**: WebP for modern browsers, JPEG fallback
- **File Size**: Under 200KB for optimal loading
- **Quality**: High resolution for retina displays

### Recommended Image Sources
1. **Unsplash** (unsplash.com) - Free high-quality photos
2. **Pexels** (pexels.com) - Free stock photos
3. **Adobe Stock** - Premium stock images
4. **Custom Photography** - Brand-specific imagery

### Image Categories by Page Type
- **About**: Team photos, office spaces, company culture
- **Contact**: Communication themes, support imagery
- **Vendor**: Business, commerce, marketplace themes
- **Buyer**: Shopping, lifestyle, product discovery
- **Products**: Product showcases, category imagery
- **Admin**: Analytics, dashboard, management themes
- **Orders**: Logistics, shipping, fulfillment
- **Earnings**: Success, growth, financial themes

### Implementation with Real Images

Replace CSS gradients with images:

```tsx
// In Banner component
<div 
  className={`relative min-h-[400px] flex items-center justify-center bg-cover bg-center`}
  style={{ backgroundImage: `url('/images/banners/${type}-banner.webp')` }}
>
  <div className="banner-overlay" />
  <BannerContent />
</div>
```

### Image Optimization Tips
1. Use responsive images with `srcset` for different screen sizes
2. Implement lazy loading for below-the-fold banners
3. Provide alt text for accessibility
4. Use CSS `object-fit: cover` for consistent aspect ratios
5. Consider dark overlays (rgba(0,0,0,0.4)) for text readability

## Pages Currently Using Banners

✅ **Implemented:**
- Login page (with banner.jpeg)
- Register page (with banner.jpeg)
- Administrator Dashboard (with banner.jpeg)
- About page (CSS gradient banner)
- Contact page (CSS gradient banner)

🔄 **Ready for Implementation:**
- Vendor Dashboard
- Vendor Products
- Buyer Cart
- Buyer Orders
- Buyer Wishlist
- Product Categories
- All other admin pages

## Responsive Design

Banners automatically adapt to different screen sizes:

- **Desktop (1024px+)**: Full height (400px), large text
- **Tablet (768px-1023px)**: Reduced height (300px), medium text
- **Mobile (<768px)**: Compact height (200px), small text

## Accessibility Features

- Proper heading hierarchy (h1 for titles)
- Sufficient color contrast with overlays
- Screen reader friendly content structure
- Keyboard navigation support
- Motion reduction respect (`prefers-reduced-motion`)

## Performance Considerations

- CSS gradients load faster than images
- Framer Motion animations are GPU-accelerated
- Lazy loading for banner images
- WebP format with JPEG fallbacks
- Optimized animation timing for smooth performance

## Future Enhancements

1. **Dynamic Banners**: Load different banners based on user preferences
2. **Seasonal Themes**: Automatic banner changes for holidays/seasons
3. **A/B Testing**: Test different banner designs for conversion
4. **Video Backgrounds**: Support for video banner backgrounds
5. **Parallax Effects**: Advanced scrolling animations
6. **User Customization**: Allow users to choose banner themes
