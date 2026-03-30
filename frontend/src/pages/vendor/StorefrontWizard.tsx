import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storefrontAPI, aiAPI, vendorAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Trash2, Plus, Eye, Store, Settings, Globe, Check, Loader2, Sparkles, Instagram, Twitter, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ThemePreset = 'minimal' | 'vibrant' | 'dark' | 'classic';

const presets: Record<ThemePreset, { name: string; primary: string; accent: string }> = {
  minimal: { name: 'Minimal', primary: '#10B981', accent: '#111827' },
  vibrant: { name: 'Vibrant', primary: '#7C3AED', accent: '#EF4444' },
  dark: { name: 'Dark', primary: '#111827', accent: '#10B981' },
  classic: { name: 'Classic', primary: '#2563EB', accent: '#F59E0B' },
};

// Premium Styling Tokens
const emeraldCardBase = "bg-[#0A1016]/80 backdrop-blur-3xl border border-white/10 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none";
const emeraldLabel = "text-[11px] font-black uppercase tracking-[0.15em] text-[#7A9A90] mb-2 block";
const emeraldKpi = "text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]";
const emeraldIconWrap = "bg-white/[0.03] border border-white/10 shadow-[inner_0_0_20px_rgba(0,0,0,0.5)]";
const emeraldIcon = "text-[#3CFF9E] drop-shadow-[0_0_8px_rgba(60,255,158,0.5)]";
const emeraldQuickAction = "bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-[#3CFF9E]/30 transition-all duration-500 group relative overflow-hidden";

const StorefrontWizard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [hasPublishedStore, setHasPublishedStore] = useState<boolean | null>(null);
  const [existingStore, setExistingStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state (MVP in-memory; to be wired to API)
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [categories, setCategories] = useState<string[]>(['Electronics', 'Fashion', 'Home', 'Beauty', 'Sports']);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<ThemePreset>('minimal');
  const [primaryColor, setPrimaryColor] = useState(presets.minimal.primary);
  const [accentColor, setAccentColor] = useState(presets.minimal.accent);
  const [buttonColor, setButtonColor] = useState(presets.minimal.primary);
  const [cardBgColor, setCardBgColor] = useState('#0b141a');
  const [headingFont, setHeadingFont] = useState('Inter');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [headingFontSize, setHeadingFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [buttonRounding, setButtonRounding] = useState<'square' | 'rounded' | 'pill'>('pill');
  const [about, setAbout] = useState('');
  const [socials, setSocials] = useState<{ instagram?: string; facebook?: string; x?: string; website?: string }>({});

  // Custom contact & support fields (stored in about/meta temporarily or separate API depending on backend, using a meta field for now)
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportAddress, setSupportAddress] = useState('');

  // Policies (stored in meta or about for now)
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');

  // SEO fields
  const [metaTitle, setMetaTitle] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [storeTraits, setStoreTraits] = useState('');
  const [makerIdentity, setMakerIdentity] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [aiBusyDesc, setAiBusyDesc] = useState(false);
  const [aiBusyTemplate, setAiBusyTemplate] = useState(false);
  const [aiBusyPalette, setAiBusyPalette] = useState(false);
  const [aiBusyLayout, setAiBusyLayout] = useState(false);
  const [inventorySize, setInventorySize] = useState<'small' | 'medium' | 'large'>('medium');
  const [sampleProducts, setSampleProducts] = useState<string[]>([]);

  // Modular homepage sections
  type SectionType = 'hero' | 'product_grid' | 'image_text' | 'featured_collection';
  type Section = { id: string; type: SectionType; settings: any };
  const [sections, setSections] = useState<Section[]>([]);

  // Navigation builder
  type NavItem = { id: string; label: string; type: 'collection' | 'page' | 'link'; href?: string };
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  // Load existing draft or create default on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    storefrontAPI.getVendorStore()
      .then(res => {
        if (!mounted) return;
        const s = res.data;

        // Always store the existing store data (published or not)
        setExistingStore(s);

        // Check if store is published
        if (s.is_published) {
          setHasPublishedStore(true);
          setLoading(false);
          return;
        }

        // Store is not published, load draft for editing
        setHasPublishedStore(false);
        setDisplayName(s.display_name || '');
        setSlug(s.slug || '');
        setPreset((s.theme_preset as ThemePreset) || 'minimal');
        setPrimaryColor(s.primary_color || presets.minimal.primary);
        setAccentColor(s.accent_color || presets.minimal.accent);
        setAbout(s.about || '');
        setDescription(s.meta_description || s.about || '');
        if (s.primary_category) setPrimaryCategory(s.primary_category);

        // Parse extended meta fields if they were saved in a JSON structure, or just handle socials
        if (s.socials && typeof s.socials === 'object') {
          setSocials(s.socials);
          // Assuming we might have saved extended config here or in another JSON field
          setSupportEmail(s.socials.supportEmail || '');
          setSupportPhone(s.socials.supportPhone || '');
          setSupportAddress(s.socials.supportAddress || '');
          setShippingPolicy(s.socials.shippingPolicy || '');
          setReturnPolicy(s.socials.returnPolicy || '');
          setPrivacyPolicy(s.socials.privacyPolicy || '');
          setMetaTitle(s.socials.metaTitle || '');
          setMetaKeywords(s.socials.metaKeywords || '');
          setValueProposition(s.socials.valueProposition || '');
          setStoreTraits(s.socials.storeTraits || '');
          setMakerIdentity(s.socials.makerIdentity || '');

          // New customization fields
          setButtonColor(s.socials.buttonColor || s.primary_color || presets.minimal.primary);
          setCardBgColor(s.socials.cardBgColor || '#0b141a');
          setHeadingFont(s.socials.headingFont || 'Inter');
          setBodyFont(s.socials.bodyFont || 'Inter');
          setHeadingFontSize(s.socials.headingFontSize || 'medium');
          setButtonRounding(s.socials.buttonRounding || 'pill');
        }

        setLoading(false);
      })
      .catch(e => {
        console.error('Failed to load vendor store draft', e);
        setLoading(false);
      });
    // Fetch a small sample of products to give AI context
    vendorAPI.getProducts({ page: 1, page_size: 10 })
      .then((res: any) => {
        if (!mounted) return;
        const results = res?.data?.results || res?.data || [];
        const names = (Array.isArray(results) ? results : []).map((p: any) => p?.name).filter(Boolean).slice(0, 6);
        setSampleProducts(names);
        const count = res?.data?.count ?? results.length ?? 0;
        setInventorySize(count < 10 ? 'small' : count < 100 ? 'medium' : 'large');
      })
      .catch(() => { });
    return () => { mounted = false; };
  }, []);

  // Debounced autosave for sections and navigation
  useEffect(() => {
    const t = setTimeout(() => {
      if (sections && sections.length >= 0) {
        saveDraft({ homepage_layout: sections });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [sections]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (navItems && navItems.length >= 0) {
        saveDraft({ navigation: navItems });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [navItems]);

  const saveDraft = async (patch: any) => {
    try {
      setIsSaving(true);
      const res = await storefrontAPI.updateVendorStore(patch);
      // After save, ensure our slug reflects server normalization
      if (typeof res.data?.slug === 'string') setSlug(res.data.slug);
    } catch (e) {
      console.error('Autosave failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const canNext = useMemo(() => {
    if (step === 1) return !!displayName && !!primaryCategory && !!slug; // foundation requires name, category, and slug
    if (step === 2) return true; // template selection
    if (step === 3) return !!preset && !!primaryColor && !!accentColor; // branding
    if (step === 4) return sections.length > 0; // homepage layout has at least one section
    if (step === 5) return navItems.length > 0; // navigation has at least one item
    if (step >= 6) return true; // contact, policies, seo, launch
    return true;
  }, [step, displayName, primaryCategory, slug, preset, primaryColor, accentColor, sections.length, navItems.length]);

  const handlePreset = (p: ThemePreset) => {
    setPreset(p);
    setPrimaryColor(presets[p].primary);
    setAccentColor(presets[p].accent);
    saveDraft({ theme_preset: p, primary_color: presets[p].primary, accent_color: presets[p].accent });
  };

  const handlePreview = () => {
    if (!slug) return;
    window.open(`/store/${slug}/preview`, '_blank');
  };

  // AI helpers
  const generateDescription = async () => {
    try {
      setAiBusyDesc(true);
      const res = await aiAPI.generate('store_description', {
        name: displayName,
        category: primaryCategory,
        tone: 'professional',
      });
      const text = res?.data?.result;
      if (typeof text === 'string' && text.trim()) {
        setDescription(text.trim());
        await saveDraft({ meta_description: text.trim() });
        toast({ title: 'AI description added', description: 'Store description generated successfully.' });
      } else {
        toast({ title: 'AI returned no content', description: 'Try again with a different name/category.', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error('AI description failed', e);

      // Check if it's a quota exceeded error
      if (e?.response?.data?.error?.includes('quota exceeded') || e?.response?.status === 429) {
        toast({
          title: 'AI quota exceeded',
          description: 'Daily AI limit reached. Please try again tomorrow or write your own description.',
          variant: 'destructive'
        });
      } else if (e?.response?.status === 502) {
        toast({
          title: 'AI service unavailable',
          description: 'AI service is temporarily down. Please try again later or write your own description.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'AI request failed', description: 'Unable to generate description. You can write your own.', variant: 'destructive' });
      }
    } finally {
      setAiBusyDesc(false);
    }
  };

  const recommendTemplate = async () => {
    try {
      setAiBusyTemplate(true);
      const res = await aiAPI.generate('template', {
        industry: primaryCategory || 'General',
        inventory_size: inventorySize,
        tone: 'modern',
        name: displayName,
        description,
        sample_products: sampleProducts,
      });
      const out = res?.data?.result || {};
      const key = out?.template as ThemePreset;
      if (key && ['minimal', 'vibrant', 'classic', 'dark'].includes(key)) {
        handlePreset(key);
        toast({ title: 'Template applied', description: `Recommended template: ${key}` });
      } else {
        toast({ title: 'No template recommendation', description: 'Try again after setting a category.', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error('AI template failed', e);

      // Check if it's a quota exceeded error
      if (e?.response?.data?.error?.includes('quota exceeded') || e?.response?.status === 429) {
        toast({
          title: 'AI quota exceeded',
          description: 'Daily AI limit reached. Please try again tomorrow or choose a template manually.',
          variant: 'destructive'
        });
      } else if (e?.response?.status === 502) {
        toast({
          title: 'AI service unavailable',
          description: 'AI service is temporarily down. Please choose a template manually.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'AI request failed', description: 'Unable to recommend a template. Please choose manually.', variant: 'destructive' });
      }
    } finally {
      setAiBusyTemplate(false);
    }
  };

  const suggestPalette = async () => {
    try {
      setAiBusyPalette(true);
      const res = await aiAPI.generate('palette', {
        industry: primaryCategory || 'General',
        mood: 'emerald-first, modern, clean',
        name: displayName,
        description,
      });
      const out = res?.data?.result || {};
      if (out?.primary) setPrimaryColor(out.primary);
      if (out?.accent) setAccentColor(out.accent);
      await saveDraft({ primary_color: out.primary || primaryColor, accent_color: out.accent || accentColor });
      toast({ title: 'Palette applied', description: 'AI suggested colors have been applied.' });
    } catch (e: any) {
      console.error('AI palette failed', e);

      // Check if it's a quota exceeded error
      if (e?.response?.data?.error?.includes('quota exceeded') || e?.response?.status === 429) {
        toast({
          title: 'AI quota exceeded',
          description: 'Daily AI limit reached. Please try again tomorrow or choose colors manually.',
          variant: 'destructive'
        });
      } else if (e?.response?.status === 502) {
        toast({
          title: 'AI service unavailable',
          description: 'AI service is temporarily down. Please choose colors manually.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'AI request failed', description: 'Unable to suggest a palette. Please choose colors manually.', variant: 'destructive' });
      }
    } finally {
      setAiBusyPalette(false);
    }
  };

  const buildLayoutAI = async () => {
    try {
      setAiBusyLayout(true);
      const res = await aiAPI.generate('layout', {
        category: primaryCategory || 'General',
        goals: 'increase conversions',
        inventory_size: inventorySize,
        name: displayName,
        description,
        sample_products: sampleProducts,
        current_sections: sections,
      });
      const out = res?.data?.result || {};
      if (Array.isArray(out.sections)) {
        const mapped = out.sections.map((s: any) => ({ id: crypto.randomUUID(), type: s.type, settings: s.settings || {} }));
        setSections(mapped);
        toast({ title: 'Layout created', description: 'AI built a homepage layout for you.' });
      } else {
        toast({ title: 'No layout received', description: 'Try again or add sections manually.', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error('AI layout failed', e);

      // Check if it's a quota exceeded error
      if (e?.response?.data?.error?.includes('quota exceeded') || e?.response?.status === 429) {
        toast({
          title: 'AI quota exceeded',
          description: 'Daily AI limit reached. Please try again tomorrow or build layout manually.',
          variant: 'destructive'
        });
      } else if (e?.response?.status === 502) {
        toast({
          title: 'AI service unavailable',
          description: 'AI service is temporarily down. Please build layout manually.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'AI request failed', description: 'Unable to build a layout. Please add sections manually.', variant: 'destructive' });
      }
    } finally {
      setAiBusyLayout(false);
    }
  };

  const handlePublish = async () => {
    if (!slug) return;
    try {
      setIsPublishing(true);
      // Save all fields then publish
      // We will bundle the extended fields into the `socials` JSON object since it's an existing configurable JSON field
      // In a real app, backend might require specific columns
      const extendedSocials = {
        ...socials,
        supportEmail,
        supportPhone,
        supportAddress,
        shippingPolicy,
        returnPolicy,
        privacyPolicy,
        metaTitle,
        metaKeywords,
        storeTraits,
        makerIdentity,
        buttonColor,
        cardBgColor,
        headingFont,
        bodyFont,
        headingFontSize,
        buttonRounding
      };

      await saveDraft({
        display_name: displayName,
        slug,
        theme_preset: preset,
        primary_color: primaryColor,
        accent_color: accentColor,
        about,
        socials: extendedSocials,
        is_published: true,
      });
      navigate(`/store/${slug}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const onBlurAutosave = (patch: any) => {
    // debounce not necessary for onBlur
    saveDraft(patch);
  };

  const handleLogoChange = async (file: File | null) => {
    setLogoFile(file);
    if (file) {
      try {
        const res = await storefrontAPI.uploadMedia(file, 'logo');
        const url = res.data?.url;
        if (url) await saveDraft({ logo_url: url });
      } catch (e) {
        console.error('Logo upload failed', e);
      }
    }
  };

  const handleBannerChange = async (file: File | null) => {
    setBannerFile(file);
    if (file) {
      try {
        const res = await storefrontAPI.uploadMedia(file, 'banner');
        const url = res.data?.url;
        if (url) await saveDraft({ banner_url: url });
      } catch (e) {
        console.error('Banner upload failed', e);
      }
    }
  };

  const handleDeleteStore = async () => {
    if (!existingStore) {
      toast({
        title: 'No storefront to delete',
        description: 'There is no storefront to delete.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete your storefront? This action cannot be undone.')) {
      return;
    }

    try {
      await storefrontAPI.deleteStore();
      toast({
        title: 'Storefront deleted',
        description: 'Your storefront has been deleted successfully.',
      });
      // Reset to show wizard for creating new store
      setHasPublishedStore(false);
      setExistingStore(null);
      setStep(1);
      // Reset form state
      setDisplayName('');
      setSlug('');
      setDescription('');
      setPrimaryCategory('');
      setAbout('');
      setSocials({});
      setSections([]);
      setNavItems([]);
    } catch (error: any) {
      console.error('Failed to delete store:', error);

      // Handle specific error cases
      if (error?.response?.status === 404) {
        const errorData = error?.response?.data;
        let errorMessage = 'No storefront was found to delete. You can create a new one.';

        if (errorData?.debug) {
          console.log('Debug info:', errorData.debug);
          errorMessage = `No storefront found. Debug: Vendor ${errorData.debug.vendor_email} has ${errorData.debug.existing_stores_count} stores.`;
        }

        toast({
          title: 'No storefront found',
          description: errorMessage,
          variant: 'destructive',
        });
        // Reset to wizard mode anyway since there's no store
        setHasPublishedStore(false);
        setExistingStore(null);
        setStep(1);
      } else if (error?.response?.status === 403) {
        toast({
          title: 'Permission denied',
          description: 'You do not have permission to delete this storefront.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Deletion failed',
          description: `Failed to delete storefront: ${error?.message || 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleEditStore = () => {
    if (!existingStore) return;

    // Load existing store data into form
    setDisplayName(existingStore.display_name || '');
    setSlug(existingStore.slug || '');
    setDescription(existingStore.meta_description || existingStore.about || '');
    setPrimaryCategory(existingStore.primary_category || '');
    setPreset((existingStore.theme_preset as ThemePreset) || 'minimal');
    setPrimaryColor(existingStore.primary_color || presets.minimal.primary);
    setAccentColor(existingStore.accent_color || presets.minimal.accent);
    setAbout(existingStore.about || '');
    setSocials(existingStore.socials || {});
    setSections(existingStore.homepage_layout || []);
    setNavItems(existingStore.navigation || []);

    // Switch to wizard mode
    setHasPublishedStore(false);
    setStep(1);
  };

  const handleCreateNew = () => {
    // Reset all form state
    setDisplayName('');
    setSlug('');
    setDescription('');
    setPrimaryCategory('');
    setAbout('');
    setSocials({});
    setSections([]);
    setNavItems([]);
    setStep(1);
    setHasPublishedStore(false);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B0F] flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-fixed">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-[#3CFF9E]/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[#3CFF9E] animate-spin" />
          </div>
          <p className="text-[#3CFF9E] font-black tracking-[0.2em] uppercase text-xs animate-pulse">Initializing Portal</p>
        </div>
      </div>
    );
  }

  // Show dashboard for published stores
  if (hasPublishedStore && existingStore) {
    return (
      <div className="min-h-screen bg-[#070B0F] p-6 md:p-8 lg:p-12 text-white relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-fixed font-['Inter',sans-serif]">
        {/* Animated Background Orbs */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#3CFF9E]/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[150px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#3CFF9E 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500 tracking-tight mb-2">
                Your Storefront
              </h1>
              <p className={emeraldLabel}>Manage your store settings and appearance</p>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Store Card */}
            <div className="lg:col-span-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${emeraldCardBase} rounded-[2rem] shadow-2xl group transition-all duration-500 hover:shadow-[#3CFF9E]/5`}>
                {/* Store Header */}
                <div className="relative h-64 overflow-hidden">
                  {existingStore.banner_url ? (
                    <img
                      src={existingStore.banner_url}
                      alt={existingStore.display_name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0A1016] to-[#1A2632]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1016] via-[#0A1016]/40 to-transparent" />

                  {/* Status Badge */}
                  <div className="absolute top-6 right-6">
                    <span className="px-4 py-1.5 bg-[#3CFF9E]/20 text-[#3CFF9E] border border-[#3CFF9E]/30 text-[10px] font-bold uppercase tracking-widest rounded-full backdrop-blur-md">
                      Published
                    </span>
                  </div>
                </div>

                {/* Store Info */}
                <div className="px-8 pb-8 -mt-16 relative">
                  <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                    <div className="w-32 h-32 rounded-3xl border-4 border-[#0A1016] overflow-hidden bg-[#0A1016] shadow-2xl relative">
                      {existingStore.logo_url ? (
                        <img
                          src={existingStore.logo_url}
                          alt={existingStore.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                          <Store className="w-12 h-12 text-[#3CFF9E]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <h2 className="text-3xl font-bold tracking-tighter text-white mb-1">{existingStore.display_name}</h2>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-emerald-400/70 LOWERCASE tracking-wider">
                          /{existingStore.slug}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 mb-8 max-w-2xl leading-relaxed">
                    {existingStore.about || 'Experience excellence through our curated digital storefront.'}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                    <div>
                      <span className={emeraldLabel}>Category</span>
                      <div className="text-white font-bold">{existingStore.primary_category || 'General Store'}</div>
                    </div>
                    <div>
                      <span className={emeraldLabel}>Template</span>
                      <div className="text-white font-bold capitalize">{existingStore.theme_preset || 'Minimal'}</div>
                    </div>
                    <div>
                      <span className={emeraldLabel}>Inventory</span>
                      <div className="text-white font-bold">{inventorySize === 'small' ? 'Few Products' : inventorySize === 'medium' ? 'Standard Inventory' : 'Large Inventory'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Link
                      to={`/store/${existingStore.slug}`}
                      className="px-8 py-3 bg-[#3CFF9E] text-black font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-[#2ae88e] transition-all transform hover:scale-[1.02]"
                    >
                      View Live Store
                    </Link>

                    <button
                      onClick={handleEditStore}
                      className="px-8 py-3 bg-white/[0.05] border border-white/10 text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-white/[0.1] transition-all"
                    >
                      Modify Design
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className={`${emeraldCardBase} rounded-[2rem] p-8`}>
                <h3 className="text-xl font-bold tracking-tight text-white mb-6 flex items-center gap-3 uppercase">
                  <Settings className="w-5 h-5 text-[#3CFF9E]" />
                  Settings
                </h3>

                <div className="space-y-4">
                  <button onClick={handleEditStore} className={`w-full flex items-center gap-4 p-4 rounded-2xl ${emeraldQuickAction}`}>
                    <div className={`w-12 h-12 rounded-xl ${emeraldIconWrap} flex items-center justify-center`}>
                      <Edit className={`w-5 h-5 ${emeraldIcon}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white text-sm">Suite</div>
                      <div className={emeraldLabel}>Visuals</div>
                    </div>
                  </button>

                  <Link to={`/vendor/products/new`} className={`w-full flex items-center gap-4 p-4 rounded-2xl ${emeraldQuickAction}`}>
                    <div className={`w-12 h-12 rounded-xl ${emeraldIconWrap} flex items-center justify-center`}>
                      <Plus className={`w-5 h-5 ${emeraldIcon}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white text-sm">Catalog</div>
                      <div className={emeraldLabel}>Add Item</div>
                    </div>
                  </Link>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5">
                  <button onClick={handleDeleteStore} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all font-bold text-[10px] uppercase tracking-widest">
                    <Trash2 className="w-4 h-4" />
                    Archive Store
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-12 text-center">
            <button onClick={handleCreateNew} className="inline-flex items-center gap-3 px-8 py-3 bg-white/[0.03] border border-white/10 text-white rounded-xl hover:bg-white/[0.08] transition-all font-bold uppercase tracking-widest text-[10px]">
              <Plus className="w-4 h-4 text-[#3CFF9E]" />
              New Store
            </button>
          </div>
        </div>
      </div>
    );
  }


  // Show wizard for creating/editing store
  return (
    <div className="min-h-screen bg-[#070B0F] p-6 md:p-8 lg:p-12 text-white relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-fixed font-['Inter',sans-serif]">
      {/* Animated Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#3CFF9E]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-900/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.02] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#3CFF9E 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500 tracking-tight mb-2">
              Storefront Builder
            </h1>
            <div className="flex items-center gap-4">
              <span className={emeraldLabel}>Step {step} of 10</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={i} className={`h-1 w-6 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#3CFF9E] shadow-[0_0_8px_#3CFF9E]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl backdrop-blur-md max-w-md">
            <div className={`w-10 h-10 rounded-lg ${emeraldIconWrap} flex items-center justify-center flex-shrink-0 animate-pulse`}>
              <Globe className={`w-5 h-5 ${emeraldIcon}`} />
            </div>
            <p className="text-[10px] text-emerald-100/70 leading-relaxed uppercase tracking-wider">
              <strong className="text-[#3CFF9E]">AI Assistant:</strong> Active and ready to help you build your store.
            </p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${emeraldCardBase} rounded-[2rem] p-8 min-h-[500px] flex flex-col`}
            >
              {step === 1 && (
                <div className="space-y-8 flex-1">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Basic Info</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className={emeraldLabel}>Store Name</label>
                        <input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onBlur={() => onBlurAutosave({ display_name: displayName })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none"
                          placeholder="e.g. My Awesome Store"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={emeraldLabel}>Primary Category</label>
                        <select
                          value={primaryCategory}
                          onChange={(e) => setPrimaryCategory(e.target.value)}
                          onBlur={() => onBlurAutosave({ primary_category: primaryCategory })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none appearance-none"
                        >
                          <option value="" disabled className="bg-[#0A1016]">Select Category</option>
                          {categories.map((c) => (
                            <option key={c} value={c} className="bg-[#0A1016]">{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className={emeraldLabel}>Brand Catchphrase</label>
                        <input
                          type="text"
                          value={valueProposition}
                          onChange={(e) => setValueProposition(e.target.value)}
                          onBlur={() => onBlurAutosave({ socials: { ...socials, valueProposition } })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none"
                          placeholder="e.g. Elevating Digital Aesthetics"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={emeraldLabel}>Botanical Traits (Comma Separated)</label>
                        <input
                          type="text"
                          value={storeTraits}
                          onChange={(e) => setStoreTraits(e.target.value)}
                          onBlur={() => onBlurAutosave({ socials: { ...socials, storeTraits } })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none"
                          placeholder="e.g. 100% Organic, Cruelty Free, Vegan"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={emeraldLabel}>Maker Identity / Location</label>
                        <input
                          type="text"
                          value={makerIdentity}
                          onChange={(e) => setMakerIdentity(e.target.value)}
                          onBlur={() => onBlurAutosave({ socials: { ...socials, makerIdentity } })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none"
                          placeholder="e.g. Handmade in Oregon, USA"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={emeraldLabel}>Store Description</label>
                    <div className="relative">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => onBlurAutosave({ meta_description: description })}
                        rows={4}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none resize-none"
                        placeholder="Neural brand summary for SEO indexing..."
                      />
                      <button
                        type="button"
                        onClick={generateDescription}
                        className="absolute bottom-4 right-4 px-4 py-2 bg-[#3CFF9E]/10 border border-[#3CFF9E]/30 text-[#3CFF9E] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#3CFF9E]/20 transition-all disabled:opacity-50"
                        disabled={aiBusyDesc || !displayName || !primaryCategory}
                      >
                        {aiBusyDesc ? 'Compiling…' : 'AI Generate'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md">
                    <label className={emeraldLabel}>Digital Path (Slug)</label>
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 font-mono text-sm leading-none">/store/</span>
                      <input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        onBlur={() => onBlurAutosave({ slug })}
                        className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#3CFF9E]/50 transition-all outline-none font-mono"
                        placeholder="cyber-threads"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 flex-1">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Theme Selection</h2>
                    <p className="text-sm text-gray-400 mb-8 ml-5">Choose a visual style for your store.</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(presets).map(([key, p]) => (
                        <button
                          key={key}
                          onClick={() => handlePreset(key as ThemePreset)}
                          className={`p-6 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group ${preset === key ? 'bg-[#3CFF9E]/10 border-[#3CFF9E] shadow-[0_0_20px_rgba(60,255,158,0.1)]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                        >
                          <div className="w-10 h-10 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: p.primary + '22', border: `1px solid ${p.primary}44` }}>
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.primary }} />
                          </div>
                          <span className="block text-sm font-bold text-white mb-1 capitalize">{p.name}</span>
                          <span className="block text-[10px] text-gray-500 uppercase tracking-widest">Design Style</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-[#3CFF9E]/5 border border-[#3CFF9E]/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-[#3CFF9E] uppercase tracking-widest mb-1">AI Recommendation</h3>
                      <p className="text-xs text-emerald-100/60 leading-relaxed italic">Let AI analyze your category and inventory to suggest the best theme.</p>
                    </div>
                    <button
                      onClick={recommendTemplate}
                      disabled={aiBusyTemplate}
                      className="px-6 h-11 bg-[#3CFF9E] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#2ae88e] transition-all flex items-center justify-center gap-2"
                    >
                      {aiBusyTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Get Suggestion
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Identity Branding</h2>
                    <button
                      type="button"
                      onClick={suggestPalette}
                      className="px-4 py-2 bg-[#3CFF9E]/10 border border-[#3CFF9E]/30 text-[#3CFF9E] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#3CFF9E]/20 transition-all disabled:opacity-50"
                      disabled={aiBusyPalette}
                    >
                      {aiBusyPalette ? 'Predicting…' : 'Neural Palette Suggestion'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Primary</label>
                          <div className="relative group">
                            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} onBlur={() => onBlurAutosave({ primary_color: primaryColor })} className="h-12 w-full appearance-none bg-transparent border-none cursor-pointer" />
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full bg-white" style={{ width: '100%', backgroundColor: primaryColor }} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Accent</label>
                          <div className="relative group">
                            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} onBlur={() => onBlurAutosave({ accent_color: accentColor })} className="h-12 w-full appearance-none bg-transparent border-none cursor-pointer" />
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full bg-white" style={{ width: '100%', backgroundColor: accentColor }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Button Color</label>
                          <div className="relative group">
                            <input type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="h-10 w-full appearance-none bg-transparent border-none cursor-pointer" />
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full bg-white transition-all duration-300" style={{ width: '100%', backgroundColor: buttonColor }} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Card Background</label>
                          <div className="relative group">
                            <input type="color" value={cardBgColor} onChange={(e) => setCardBgColor(e.target.value)} className="h-10 w-full appearance-none bg-transparent border-none cursor-pointer" />
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full bg-white transition-all duration-300" style={{ width: '100%', backgroundColor: cardBgColor }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Header Size</label>
                          <select value={headingFontSize} onChange={(e) => setHeadingFontSize(e.target.value as any)} className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none">
                            <option value="small" className="bg-[#0A1016]">Small (Compact)</option>
                            <option value="medium" className="bg-[#0A1016]">Medium (Standard)</option>
                            <option value="large" className="bg-[#0A1016]">Large (Premium)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Button Shape</label>
                          <select value={buttonRounding} onChange={(e) => setButtonRounding(e.target.value as any)} className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none">
                            <option value="square" className="bg-[#0A1016]">Square</option>
                            <option value="rounded" className="bg-[#0A1016]">Rounded</option>
                            <option value="pill" className="bg-[#0A1016]">Pill</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Heading Font</label>
                          <select value={headingFont} onChange={(e) => setHeadingFont(e.target.value)} className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none">
                            {['Inter', 'Poppins', 'Montserrat', 'Source Sans 3', 'DM Sans', 'Playfair Display', 'Cormorant Garamond'].map(f => (
                              <option key={f} value={f} className="bg-[#0A1016] font-medium">{f}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className={emeraldLabel}>Body Font</label>
                          <select value={bodyFont} onChange={(e) => setBodyFont(e.target.value)} className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none">
                            {['Inter', 'Poppins', 'Montserrat', 'Source Sans 3', 'DM Sans'].map(f => (
                              <option key={f} value={f} className="bg-[#0A1016]">{f}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className={emeraldLabel}>Logo Upload</label>
                        <div className="relative group p-6 border-2 border-dashed border-white/10 rounded-2xl hover:border-[#3CFF9E]/30 transition-all text-center overflow-hidden">
                          <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {logoFile || existingStore?.logo_url ? (
                            <div className="absolute inset-0 w-full h-full p-2">
                              <img src={logoFile ? URL.createObjectURL(logoFile) : existingStore?.logo_url} alt="Logo Preview" className="w-full h-full object-contain rounded-xl" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl mx-2 my-2">
                                <span className="text-[10px] text-white font-black uppercase tracking-widest">Change Asset</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`mx-auto w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center mb-2`}>
                                <Plus className={`w-5 h-5 ${emeraldIcon}`} />
                              </div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black relative z-0">Drop Logo Source</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={emeraldLabel}>Banner Asset</label>
                        <div className="relative group p-6 border-2 border-dashed border-white/10 rounded-2xl hover:border-[#3CFF9E]/30 transition-all text-center overflow-hidden">
                          <input type="file" accept="image/*" onChange={(e) => handleBannerChange(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {bannerFile || existingStore?.banner_url ? (
                            <div className="absolute inset-0 w-full h-full p-2">
                              <img src={bannerFile ? URL.createObjectURL(bannerFile) : existingStore?.banner_url} alt="Banner Preview" className="w-full h-full object-cover rounded-xl" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl mx-2 my-2">
                                <span className="text-[10px] text-white font-black uppercase tracking-widest">Change Asset</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`mx-auto w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center mb-2`}>
                                <Plus className={`w-5 h-5 ${emeraldIcon}`} />
                              </div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black relative z-0">Drop Background Plate</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">UX Architecture</h2>
                    <button type="button" onClick={buildLayoutAI} className="px-4 py-2 bg-[#3CFF9E]/10 border border-[#3CFF9E]/30 text-[#3CFF9E] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50" disabled={aiBusyLayout}>
                      {aiBusyLayout ? 'Structuring…' : 'AI Schema Layout'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                    <button onClick={() => setSections((s) => [...s, { id: crypto.randomUUID(), type: 'hero', settings: { headline: 'Welcome', cta: '/products' } }])} className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#3CFF9E]/30 transition-all">Add Hero</button>
                    <button onClick={() => setSections((s) => [...s, { id: crypto.randomUUID(), type: 'product_grid', settings: { title: 'Featured', source: 'all' } }])} className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#3CFF9E]/30 transition-all">Add Grid</button>
                    <button onClick={() => setSections((s) => [...s, { id: crypto.randomUUID(), type: 'image_text', settings: { title: 'Our Story' } }])} className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#3CFF9E]/30 transition-all">Add Story</button>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence>
                      {sections.map((sec, idx) => (
                        <motion.div
                          key={sec.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-[#3CFF9E] text-xs">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-white font-bold text-sm uppercase tracking-widest">{sec.type.replace('_', ' ')}</div>
                              <div className="text-[10px] text-slate-500 font-medium">Configurable Module</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button disabled={idx === 0} onClick={() => setSections((s) => { const a = [...s]; const t = a[idx]; a[idx] = a[idx - 1]; a[idx - 1] = t; return a; })} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 disabled:opacity-20"><Plus className="w-4 h-4 rotate-45" /></button>
                            <button disabled={idx === sections.length - 1} onClick={() => setSections((s) => { const a = [...s]; const t = a[idx]; a[idx] = a[idx + 1]; a[idx + 1] = t; return a; })} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 disabled:opacity-20"><Plus className="w-4 h-4 -rotate-45" /></button>
                            <button onClick={() => setSections((s) => s.filter(x => x.id !== sec.id))} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8 flex-1">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Interface Navigation</h2>

                  <div className="p-6 bg-white/[0.02] rounded-[2rem] border border-white/5">
                    <button onClick={() => setNavItems((n) => [...n, { id: crypto.randomUUID(), label: 'New Link', type: 'collection', href: '/products' }])} className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/10 rounded-2xl hover:border-[#3CFF9E]/30 transition-all font-black uppercase text-[10px] tracking-widest group">
                      <Plus className="w-4 h-4 group-hover:text-[#3CFF9E]" />
                      Add Registry Link
                    </button>

                    <div className="mt-8 space-y-4">
                      {navItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-4 bg-[#070B0F] p-4 rounded-xl border border-white/5">
                          <input className="bg-transparent border-none text-white font-bold text-sm outline-none w-32" value={item.label} onChange={(e) => setNavItems(a => a.map(x => x.id === item.id ? { ...x, label: e.target.value } : x))} />
                          <div className="h-4 w-[1px] bg-white/10" />
                          <input className="bg-transparent border-none text-slate-500 font-mono text-xs outline-none flex-1" value={item.href || ''} onChange={(e) => setNavItems(a => a.map(x => x.id === item.id ? { ...x, href: e.target.value } : x))} />
                          <button onClick={() => setNavItems(a => a.filter(x => x.id !== item.id))} className="text-red-400/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-8 flex-1">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Digital Footprint</h2>
                  <p className="text-sm text-gray-400 mb-8 ml-5">Connect your external social graphs.</p>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className={`w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center`}>
                        <Globe className={`w-5 h-5 ${emeraldIcon}`} />
                      </div>
                      <input className="bg-transparent border-none text-white font-mono text-sm outline-none flex-1" placeholder="https://your-website.com" value={socials.website || ''} onChange={(e) => setSocials({ ...socials, website: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className={`w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center`}>
                        <Instagram className={`w-5 h-5 text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]`} />
                      </div>
                      <input className="bg-transparent border-none text-white font-mono text-sm outline-none flex-1" placeholder="https://instagram.com/username" value={socials.instagram || ''} onChange={(e) => setSocials({ ...socials, instagram: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className={`w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center`}>
                        <Twitter className={`w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]`} />
                      </div>
                      <input className="bg-transparent border-none text-white font-mono text-sm outline-none flex-1" placeholder="https://x.com/username" value={socials.x || ''} onChange={(e) => setSocials({ ...socials, x: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className={`w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center`}>
                        <Facebook className={`w-5 h-5 text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]`} />
                      </div>
                      <input className="bg-transparent border-none text-white font-mono text-sm outline-none flex-1" placeholder="https://facebook.com/username" value={socials.facebook || ''} onChange={(e) => setSocials({ ...socials, facebook: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-8 flex-1">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Contact & Support</h2>
                  <p className="text-sm text-gray-400 mb-8 ml-5">How customers can reach your business.</p>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Support Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-[#3CFF9E] transition-colors w-4 h-4" />
                        <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourbrand.com" className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none font-medium" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Support Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-[#3CFF9E] transition-colors w-4 h-4" />
                        <input type="tel" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none font-medium" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Physical / Return Address</label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-6 text-white/20 group-hover:text-[#3CFF9E] transition-colors w-4 h-4" />
                        <textarea value={supportAddress} onChange={(e) => setSupportAddress(e.target.value)} rows={3} placeholder="123 Commerce Blvd..." className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none resize-none font-medium" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 8 && (
                <div className="space-y-8 flex-1">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Trust & Policies</h2>
                  <p className="text-sm text-gray-400 mb-8 ml-5">Establish transparency with your buyers.</p>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Shipping Policy</label>
                      <textarea value={shippingPolicy} onChange={(e) => setShippingPolicy(e.target.value)} rows={3} placeholder="Explain your shipping methods, delivery times, and costs..." className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none resize-none text-sm leading-relaxed" />
                    </div>
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Return & Refund Policy</label>
                      <textarea value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} rows={3} placeholder="State conditions for returns and refund processing times..." className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none resize-none text-sm leading-relaxed" />
                    </div>
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Privacy Policy (Optional)</label>
                      <textarea value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)} rows={2} placeholder="Briefly state how you handle customer data..." className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none resize-none text-sm leading-relaxed opacity-80" />
                    </div>
                  </div>
                </div>
              )}

              {step === 9 && (
                <div className="space-y-8 flex-1">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-[#3CFF9E] pl-4">Discovery & SEO</h2>
                  <p className="text-sm text-gray-400 mb-8 ml-5">Optimize how your store appears in engines.</p>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Meta Title (Browsers & Socials)</label>
                      <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={`${displayName} | Premium Store`} className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none font-black text-[14px]" />
                      <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Recommended length: 50-60 chars</div>
                    </div>
                    <div className="space-y-2">
                      <label className={emeraldLabel}>Meta Keywords (Comma separated)</label>
                      <input type="text" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} placeholder="premium, clothing, luxury, minimal" className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none font-mono text-sm" />
                    </div>

                    <div className="mt-8 p-6 rounded-2xl border border-white/5 bg-[#070B0F] shadow-inner">
                      <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-4 border-b border-white/5 pb-2">Search Preview</div>
                      <div className="text-blue-400 font-medium text-lg mb-1 truncate">{metaTitle || displayName || 'Store Title'}</div>
                      <div className="text-emerald-500 text-xs mb-2 truncate">tesmarket.com/store/{slug || 'store-slug'}</div>
                      <div className="text-slate-400 text-sm line-clamp-2">{description || 'Store description generated for SEO indexing...'}</div>
                    </div>
                  </div>
                </div>
              )}

              {step === 10 && (
                <div className="space-y-8 flex-1 text-center py-12">
                  <div className={`w-20 h-20 rounded-full ${emeraldIconWrap} flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(60,255,158,0.2)]`}>
                    <Check className={`w-10 h-10 ${emeraldIcon}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4">Architecture Validated</h2>
                  <p className="text-slate-400 max-w-sm mx-auto mb-8 font-medium">Your storefront manifest is ready for publishing. Ensure your catalog is populated for maximum resonance.</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                      <div className={emeraldLabel}>Sections</div>
                      <div className="text-2xl font-black text-white">{sections.length}</div>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                      <div className={emeraldLabel}>Assets</div>
                      <div className="text-2xl font-black text-white">{[logoFile, bannerFile].filter(Boolean).length}/2</div>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                      <div className={emeraldLabel}>Policies</div>
                      <div className="text-2xl font-black text-white">{[shippingPolicy, returnPolicy].filter(Boolean).length}/2</div>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                      <div className={emeraldLabel}>Status</div>
                      <div className="text-sm font-black text-[#3CFF9E] uppercase tracking-widest mt-2">{isPublishing ? 'Transmitting' : 'Ready'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Controls */}
              <div className="mt-auto pt-10 border-t border-white/5 flex items-center justify-between">
                <button
                  className={`px-8 py-3 rounded-xl border border-white/10 font-black uppercase text-[10px] tracking-widest transition-all ${step === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/5 text-white'}`}
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                >
                  Previous Step
                </button>
                <div className="flex items-center gap-4">
                  <button onClick={handlePreview} disabled={!slug} className="px-6 py-3 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-20">Preview Latency</button>
                  {step < 10 ? (
                    <button
                      className="px-8 py-3 bg-[#3CFF9E] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#2ae88e] transition-all disabled:opacity-30 shadow-[0_0_20px_rgba(60,255,158,0.2)]"
                      disabled={!canNext}
                      onClick={() => setStep((s) => Math.min(10, s + 1))}
                    >
                      Initialize Next
                    </button>
                  ) : (
                    <button
                      className="px-12 py-3 bg-gradient-to-r from-emerald-400 to-green-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(60,255,158,0.4)]"
                      onClick={handlePublish}
                      disabled={!slug || isPublishing}
                    >
                      {isPublishing ? 'Transmitting...' : 'Full Dispatch'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Live Preview Console */}
          <aside className="lg:col-span-1">
            <div className={`${emeraldCardBase} rounded-[2rem] p-6 sticky top-8 shadow-2xl bg-black/40`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={emeraldLabel}>Mock console</h3>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0A1016]/80 flex flex-col h-[400px]">
                <div className="p-4" style={{ backgroundColor: primaryColor }}>
                  <div className="h-6 w-20 bg-white/20 rounded flex items-center px-2">
                    {logoFile && <div className="w-full h-1 bg-white/40 rounded" />}
                  </div>
                </div>
                <div className="flex-1 p-4 relative overflow-hidden">
                  <div className="h-32 bg-white/[0.02] rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden">
                    {bannerFile ? (
                      <div className="absolute inset-0 bg-[#3CFF9E]/10" />
                    ) : (
                      <span className="text-[10px] text-slate-700 font-mono tracking-tighter">SURFACE_PLATE</span>
                    )}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 bg-white/[0.02] border border-white/5 rounded-xl flex items-col justify-center p-3 transition-all" style={{ borderLeft: `2px solid ${accentColor}` }}>
                        <div className="w-full h-8 bg-white/5 rounded mt-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {slug && (
                <div className="mt-6 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                  <div className="text-[9px] text-[#3CFF9E] font-black uppercase tracking-widest mb-1">Public Endpoint</div>
                  <Link to={`/store/${slug}/preview`} className="text-white text-[10px] font-mono hover:text-[#3CFF9E] transition-all break-all">tesmarket.com/store/{slug}/preview</Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StorefrontWizard;
