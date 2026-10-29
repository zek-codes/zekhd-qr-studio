/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  Radio,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Check,
  Download,
  MapPin,
  Building,
  User,
  Phone,
  Briefcase,
  Globe,
  Mail,
  Sun,
  Moon,
  Paperclip,
  RotateCw,
  AlertCircle,
  Smartphone,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

/* ==========================================================================
   CONSTANTS (at the top of the code, easy to edit)
   ========================================================================== */
export const PVC_PRICE = 5; // USD per card
export const NFC_PRICE = 10; // USD per card
export const WHATSAPP_NUMBER = '263782676441';
export const MAX_QUANTITY = 100;

export type CardType = 'pvc' | 'nfc';

export interface ContactDetails {
  fullName: string;
  phone: string;
  jobTitle: string;
  company: string;
  email: string;
  website: string;
  address: string;
}

/**
 * Converts local numbers starting with 0 to Zimbabwe international code +263
 */
export function formatPhoneNumber(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const clean = trimmed.replace(/[\s\-()]/g, '');

  if (clean.startsWith('0')) {
    return '+263' + clean.slice(1);
  }
  if (clean.startsWith('263')) {
    return '+' + clean;
  }
  return clean;
}

/**
 * Prepend https:// if protocol is missing
 */
export function formatWebsite(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Generate standard vCard 3.0 specification
 */
export function buildVCard(details: ContactDetails): string {
  const formattedPhone = formatPhoneNumber(details.phone);
  const formattedUrl = formatWebsite(details.website);

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${details.fullName.trim()}`,
  ];

  const nameParts = details.fullName.trim().split(/\s+/);
  if (nameParts.length > 1) {
    const family = nameParts.slice(1).join(' ');
    const given = nameParts[0];
    lines.push(`N:${family};${given};;;`);
  } else {
    lines.push(`N:${details.fullName.trim()};;;;`);
  }

  if (details.company.trim()) {
    lines.push(`ORG:${details.company.trim()}`);
  }
  if (details.jobTitle.trim()) {
    lines.push(`TITLE:${details.jobTitle.trim()}`);
  }
  if (formattedPhone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${formattedPhone}`);
  }
  if (details.email.trim()) {
    lines.push(`EMAIL;TYPE=WORK,INTERNET:${details.email.trim()}`);
  }
  if (formattedUrl) {
    lines.push(`URL:${formattedUrl}`);
  }
  if (details.address.trim()) {
    const cleanAddress = details.address.trim().replace(/,/g, '\\,');
    lines.push(`ADR;TYPE=WORK:;;${cleanAddress};;;;`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export default function App() {
  // Theme state: defaults to false (light content area with dark green header/footer matching zek.co.zw)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zek_theme');
      if (saved) return saved === 'dark';
    }
    return false;
  });

  // Step state (1, 2, 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Card Selection & Quantity
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityError, setQuantityError] = useState<string>('');

  // Step 2: Contact Details
  const [details, setDetails] = useState<ContactDetails>({
    fullName: '',
    phone: '',
    jobTitle: '',
    company: '',
    email: '',
    website: '',
    address: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ContactDetails, string>>>({});

  // Step 3: QR Code & Delivery
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrGenerationError, setQrGenerationError] = useState<string>('');
  const [isInHarareCBD, setIsInHarareCBD] = useState<boolean>(true);
  const [cardPreviewSide, setCardPreviewSide] = useState<'front' | 'back'>('front');

  // Accessible unique IDs for form controls
  const qtyInputId = useId();
  const fullNameInputId = useId();
  const phoneInputId = useId();
  const jobTitleInputId = useId();
  const companyInputId = useId();
  const emailInputId = useId();
  const websiteInputId = useId();
  const addressInputId = useId();

  // Apply dark class to document root for theme switching
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zek_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zek_theme', 'light');
    }
  }, [isDarkMode]);

  // Derived price & total
  const unitPrice = selectedCard === 'nfc' ? NFC_PRICE : PVC_PRICE;
  const currentTotal = selectedCard ? unitPrice * quantity : 0;

  // Handle quantity changes
  const handleQuantityInput = (val: string) => {
    if (val === '') {
      setQuantity(1);
      setQuantityError('');
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      setQuantityError('Please enter a whole number from 1 to 100.');
      return;
    }
    if (parsed < 1) {
      setQuantity(1);
      setQuantityError('Minimum quantity is 1 card.');
    } else if (parsed > MAX_QUANTITY) {
      setQuantity(MAX_QUANTITY);
      setQuantityError(`Maximum quantity is ${MAX_QUANTITY} cards.`);
    } else {
      setQuantity(parsed);
      setQuantityError('');
    }
  };

  const handleIncrement = () => {
    setQuantity((prev) => {
      const next = Math.min(prev + 1, MAX_QUANTITY);
      if (next === MAX_QUANTITY) setQuantityError(`Maximum quantity is ${MAX_QUANTITY} cards.`);
      else setQuantityError('');
      return next;
    });
  };

  const handleDecrement = () => {
    setQuantity((prev) => {
      const next = Math.max(prev - 1, 1);
      setQuantityError('');
      return next;
    });
  };

  // Step 2 Form Validation
  const validateStep2 = (): boolean => {
    const errors: Partial<Record<keyof ContactDetails, string>> = {};

    if (!details.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (details.fullName.trim().length < 2) {
      errors.fullName = 'Please enter a valid full name';
    }

    if (!details.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const cleaned = details.phone.replace(/[\s\-()]/g, '');
      if (cleaned.length < 8) {
        errors.phone = 'Please enter a complete phone number';
      }
    }

    if (details.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Generate QR Code
  const generateQRCode = async () => {
    if (!validateStep2()) return;

    try {
      setQrGenerationError('');
      const vcardContent = buildVCard(details);

      // Generate PNG data URL with quiet-zone margin, black on white, error correction M
      const dataUrl = await QRCode.toDataURL(vcardContent, {
        errorCorrectionLevel: 'M',
        margin: 4, // quiet-zone margin
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        width: 600,
      });

      setQrDataUrl(dataUrl);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setQrGenerationError('Please shorten your details.');
    }
  };

  // Download QR Code PNG
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const cleanName = (details.fullName.trim() || 'zek-hd')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${cleanName}-vcard-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open WhatsApp with formatted order message
  const handleWhatsAppOrder = () => {
    const cardName = selectedCard === 'nfc' ? 'NFC smart card' : 'PVC card';
    const deliveryText = isInHarareCBD ? 'Harare CBD (free)' : 'Outside Harare CBD';

    const lines: string[] = [
      `Hi ZEK HD, I'd like ${quantity} x ${cardName} at $${unitPrice} each (total $${currentTotal}) printed with my vCard QR.`,
      '',
      `Delivery: ${deliveryText}`,
      `Name: ${details.fullName.trim()}`,
    ];

    if (details.jobTitle.trim()) {
      lines.push(`Title: ${details.jobTitle.trim()}`);
    }
    if (details.company.trim()) {
      lines.push(`Company: ${details.company.trim()}`);
    }

    const formattedPhone = formatPhoneNumber(details.phone);
    if (formattedPhone) {
      lines.push(`Phone: ${formattedPhone}`);
    }
    if (details.email.trim()) {
      lines.push(`Email: ${details.email.trim()}`);
    }
    const formattedUrl = formatWebsite(details.website);
    if (formattedUrl) {
      lines.push(`Website: ${formattedUrl}`);
    }
    if (details.address.trim()) {
      lines.push(`Address: ${details.address.trim()}`);
    }

    const fullMessage = lines.join('\n');
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
      
      {/* ====================================================================
          TOP BAR & HEADER (Matches zek.co.zw: dark green #0a2e22 bar)
          ==================================================================== */}
      <header className="sticky top-0 z-50 bg-[#0a2e22] text-white border-b border-[#144233] shadow-md px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          
          {/* Logo & Header Wordmark */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-white/20">
              <img
                src="/assets/aistudio/1_20261030_001843_0000_9349db2c.png"
                alt="ZEK HD Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  ZEK HD
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#12b5a0]/20 text-[#5cd65c] border border-[#12b5a0]/40">
                  QR Studio
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#95b8ab]">
                zek.co.zw
              </p>
            </div>
          </div>

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#113a2d] hover:bg-[#164a39] text-[#95b8ab] hover:text-white border border-[#1b5240] transition-colors"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-teal-300" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ====================================================================
          HERO BANNER SECTION (Dark Green #0a2e22 to #0b3d2e with subtle dot pattern)
          ==================================================================== */}
      <section className="bg-gradient-to-b from-[#0a2e22] to-[#0b3d2e] text-white pt-7 pb-8 px-4 border-b border-[#144233] relative overflow-hidden">
        {/* Dot Pattern Overlay */}
        <div className="absolute inset-0 zek-dot-pattern opacity-40 pointer-events-none" />

        <div className="max-w-2xl mx-auto relative z-10 text-center sm:text-left">
          
          {/* Small uppercase pill badge */}
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#12b5a0]/15 border border-[#12b5a0]/40 text-[#5cd65c] text-[11px] font-bold tracking-widest uppercase mb-3.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cd65c] animate-pulse" />
            <span>ZIMBABWE&apos;S TECH &amp; DESIGN PARTNER</span>
          </div>

          {/* Dynamic Step Headings with gradient keyword */}
          {currentStep === 1 && (
            <>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                What would you like your <span className="zek-gradient-text">QR</span> on?
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#95b8ab]">
                Choose your card type. We print your QR and deliver it to you.
              </p>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Your <span className="zek-gradient-text">Contact</span> Details
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#95b8ab]">
                Fill in the details you want encoded onto your vCard QR.
              </p>
            </>
          )}

          {currentStep === 3 && (
            <>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Your <span className="zek-gradient-text">QR</span> &amp; Order
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#95b8ab]">
                Review your vCard QR code and send your order straight to WhatsApp.
              </p>
            </>
          )}

          {/* Step Progress Indicator (3 Steps) */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold mb-2 text-[#95b8ab]">
              <span className="text-[#5cd65c] font-bold tracking-wider uppercase text-[11px]">
                Step {currentStep} of 3
              </span>
              <span>
                {currentStep === 1 && 'Choose Card'}
                {currentStep === 2 && 'Contact Details'}
                {currentStep === 3 && 'Order & QR'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((step) => {
                const isActive = currentStep === step;
                const isPast = currentStep > step;
                return (
                  <div
                    key={step}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'zek-gradient-bg shadow-sm shadow-[#12b5a0]/50'
                        : isPast
                        ? 'bg-[#12b5a0]'
                        : 'bg-[#154636]'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          MAIN CONTENT AREA (Mobile-First, Light background #f4f8f6 by default, theme-aware)
          ==================================================================== */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8">
        
        {/* ==================================================================
            STEP 1: CHOOSE YOUR CARD
            ================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            
            {/* Two Large Selectable Cards (20px rounded, subtle shadow, pale green tag chips) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option A: PVC Card */}
              <button
                type="button"
                onClick={() => setSelectedCard('pvc')}
                className={`relative text-left p-5 sm:p-6 rounded-[20px] border-2 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  selectedCard === 'pvc'
                    ? 'border-[#12b5a0] bg-white dark:bg-[#0d3226] ring-4 ring-[#12b5a0]/20 shadow-md'
                    : 'border-[var(--zek-card-border)] bg-[var(--zek-card-bg)] hover:border-[#12b5a0]/50 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--zek-tag-bg)] text-[var(--zek-tag-text)]">
                      Standard
                    </span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                      selectedCard === 'pvc'
                        ? 'bg-[#12b5a0] border-[#12b5a0] text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedCard === 'pvc' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <h2 className="text-xl font-extrabold text-[var(--zek-text-main)] mb-1">
                    PVC Card
                  </h2>
                  <p className="text-xs text-[var(--zek-text-muted)] leading-relaxed mb-4">
                    Printed QR on a durable PVC business card. $5 per card.
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--zek-card-border)]">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--zek-text-muted)]">Price</span>
                    <span className="text-2xl font-black text-[#0b684c] dark:text-[#5cd65c]">
                      ${PVC_PRICE}
                      <span className="text-xs font-normal text-[var(--zek-text-muted)]"> / card</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-[var(--zek-text-muted)]">
                    <CreditCard className="w-3.5 h-3.5 text-[#12b5a0]" />
                    <span>Durable printed PVC card</span>
                  </div>
                </div>
              </button>

              {/* Option B: NFC Smart Card */}
              <button
                type="button"
                onClick={() => setSelectedCard('nfc')}
                className={`relative text-left p-5 sm:p-6 rounded-[20px] border-2 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  selectedCard === 'nfc'
                    ? 'border-[#12b5a0] bg-white dark:bg-[#0d3226] ring-4 ring-[#12b5a0]/20 shadow-md'
                    : 'border-[var(--zek-card-border)] bg-[var(--zek-card-bg)] hover:border-[#12b5a0]/50 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--zek-tag-bg)] text-[var(--zek-tag-text)]">
                      TAP + SCAN
                    </span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                      selectedCard === 'nfc'
                        ? 'bg-[#12b5a0] border-[#12b5a0] text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedCard === 'nfc' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <h2 className="text-xl font-extrabold text-[var(--zek-text-main)] mb-1">
                    NFC Smart Card
                  </h2>
                  <p className="text-xs text-[var(--zek-text-muted)] leading-relaxed mb-4">
                    QR printed plus a tap-to-share NFC chip. $10 per card.
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--zek-card-border)]">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--zek-text-muted)]">Price</span>
                    <span className="text-2xl font-black text-[#0b684c] dark:text-[#5cd65c]">
                      ${NFC_PRICE}
                      <span className="text-xs font-normal text-[var(--zek-text-muted)]"> / card</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-[var(--zek-text-muted)]">
                    <Radio className="w-3.5 h-3.5 text-[#12b5a0]" />
                    <span>Instant contactless phone tap sharing</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Highlighted Badge: "Free delivery in Harare CBD on all card orders!" */}
            <div className="flex items-center justify-center space-x-2 p-3.5 rounded-[16px] bg-[var(--zek-tag-bg)] border border-[#12b5a0]/30 text-[var(--zek-tag-text)] text-xs sm:text-sm font-semibold shadow-xs text-center">
              <MapPin className="w-4 h-4 text-[#12b5a0] shrink-0" />
              <span>Free delivery in Harare CBD on all card orders!</span>
            </div>

            {/* Quantity Selector Card */}
            <div className="p-5 sm:p-6 rounded-[20px] bg-[var(--zek-card-bg)] border border-[var(--zek-card-border)] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label htmlFor={qtyInputId} className="block text-sm font-extrabold text-[var(--zek-text-main)]">
                    How many cards?
                  </label>
                  <p className="text-xs text-[var(--zek-text-muted)]">
                    Whole number from 1 to {MAX_QUANTITY}
                  </p>
                </div>

                {/* Minus, Input, Plus */}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border font-bold text-lg transition-all ${
                      quantity <= 1
                        ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-700'
                        : 'bg-[var(--zek-card-bg)] border-[var(--zek-card-border)] hover:border-[#12b5a0] text-[var(--zek-text-main)] cursor-pointer'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    id={qtyInputId}
                    type="number"
                    min={1}
                    max={MAX_QUANTITY}
                    value={quantity}
                    onChange={(e) => handleQuantityInput(e.target.value)}
                    className="w-20 text-center py-2.5 px-2 text-lg font-bold rounded-xl border border-[var(--zek-input-border)] bg-[var(--zek-input-bg)] text-[var(--zek-text-main)] focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20"
                  />

                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= MAX_QUANTITY}
                    aria-label="Increase quantity"
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border font-bold text-lg transition-all ${
                      quantity >= MAX_QUANTITY
                        ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-700'
                        : 'bg-[var(--zek-card-bg)] border-[var(--zek-card-border)] hover:border-[#12b5a0] text-[var(--zek-text-main)] cursor-pointer'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Validation error message */}
              {quantityError && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {quantityError}
                </p>
              )}

              {/* Live Total Line */}
              <div className="pt-3 border-t border-[var(--zek-card-border)] flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--zek-text-muted)]">
                  Total price:
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#0b684c] dark:text-[#5cd65c]">
                  {selectedCard ? `Total: $${currentTotal}` : 'Select a card'}
                </span>
              </div>
            </div>

            {/* Continue Button (Disabled until card type is chosen) */}
            <div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!selectedCard}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 transition-all ${
                  selectedCard
                    ? 'zek-gradient-btn zek-glow-btn text-white cursor-pointer active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 dark:bg-[#12362b] dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <span>Continue to Contact Details</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              {!selectedCard && (
                <p className="text-center text-xs text-[var(--zek-text-muted)] mt-2">
                  Please pick a card type above to continue.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================
            STEP 2: CONTACT DETAILS
            ================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            
            {/* Note: "All cards will carry this same QR." */}
            <div className="p-4 rounded-[16px] bg-[var(--zek-tag-bg)] border border-[#12b5a0]/30 text-[var(--zek-tag-text)] text-xs sm:text-sm font-semibold flex items-center gap-2.5">
              <Check className="w-4 h-4 text-[#12b5a0] shrink-0 stroke-[3]" />
              <span>All cards will carry this same QR.</span>
            </div>

            {/* Form Fields Card */}
            <div className="p-5 sm:p-6 rounded-[20px] bg-[var(--zek-card-bg)] border border-[var(--zek-card-border)] shadow-xs space-y-4">
              
              {/* Full Name (Required) */}
              <div>
                <label htmlFor={fullNameInputId} className="block text-xs font-bold uppercase tracking-wider text-[var(--zek-text-main)] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id={fullNameInputId}
                    type="text"
                    placeholder="e.g. Tendai Mukaro"
                    value={details.fullName}
                    onChange={(e) => {
                      setDetails({ ...details, fullName: e.target.value });
                      if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: undefined });
                    }}
                    className={`w-full pl-10 pr-3.5 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20 bg-[var(--zek-input-bg)] text-[var(--zek-text-main)] ${
                      fieldErrors.fullName ? 'border-red-500 bg-red-50/40' : 'border-[var(--zek-input-border)]'
                    }`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Phone (Required, convert numbers starting with 0 to +263) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={phoneInputId} className="block text-xs font-bold uppercase tracking-wider text-[var(--zek-text-main)]">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  {details.phone.startsWith('0') && (
                    <span className="text-[11px] font-semibold text-[#0b684c] dark:text-[#5cd65c]">
                      Converts to {formatPhoneNumber(details.phone)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id={phoneInputId}
                    type="tel"
                    placeholder="e.g. 0782676441 or +263782676441"
                    value={details.phone}
                    onChange={(e) => {
                      setDetails({ ...details, phone: e.target.value });
                      if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: undefined });
                    }}
                    className={`w-full pl-10 pr-3.5 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20 bg-[var(--zek-input-bg)] text-[var(--zek-text-main)] ${
                      fieldErrors.phone ? 'border-red-500 bg-red-50/40' : 'border-[var(--zek-input-border)]'
                    }`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Job Title & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={jobTitleInputId} className="block text-xs font-bold uppercase tracking-wider text-[var(--zek-text-main)] mb-1">
                    Job Title
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <input
                      id={jobTitleInputId}
                      type="text"
                      placeholder="e.g. Managing Director"
                      value={details.jobTitle}
                      onChange={(e) => setDetails({ ...details, jobTitle: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[var(--zek-input-border)] text-sm font-medium focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20 bg-[var(--zek-input-bg)] text-[var(--zek-text-main)]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={companyInputId} className="block text-xs font-bold uppercase tracking-wider text-[var(--zek-text-main)] mb-1">
                    Company
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      id={companyInputId}
                      type="text"
                      placeholder="e.g. ZEK HD"
                      value={details.company}
                      onChange={(e) => setDetails({ ...details, company: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[var(--zek-input-border)] text-sm font-medium focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20 bg-[var(--zek-input-bg)] text-[var(--zek-text-main)]"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor={emailInputId} className="block text-xs font-bold uppercase tracking-wider text-[var(--zek-text-main)] mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id={emailInputId}
                    type="email"
                    placeholder="e.g. name@company.co.zw"
                    value={details.email}
                    onChange={(e) => {
                      setDetails({ ...details, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    className={`w-full pl-10 pr-3.5 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20 bg-[var(--zek-input-bg)] text-[var(--zek-text-main)] ${
                      fieldErrors.email ? 'border-red-500 bg-red-50/40' : 'border-[var(--zek-input-border)]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.email}</p>
                )}
              </div>

              {/* Website (auto https://) */}
              <div>
                <label htmlFor={websiteInputId} className="block text-xs font-bold uppercase tracking-wider text-[var(--zek-text-main)] mb-1">
                  Website
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    id={websiteInputId}
                    type="text"
                    placeholder="e.g. zek.co.zw"
                    value={details.website}
                    onChange={(e) => setDetails({ ...details, website: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[var(--zek-input-border)] text-sm font-medium focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20 bg-[var(--zek-input-bg)] text-[var(--zek-text-main)]"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor={addressInputId} className="block text-xs font-bold uppercase tracking-wider text-[var(--zek-text-main)] mb-1">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id={addressInputId}
                    type="text"
                    placeholder="e.g. Samora Machel Ave, Harare"
                    value={details.address}
                    onChange={(e) => setDetails({ ...details, address: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[var(--zek-input-border)] text-sm font-medium focus:outline-hidden focus:border-[#12b5a0] focus:ring-2 focus:ring-[#12b5a0]/20 bg-[var(--zek-input-bg)] text-[var(--zek-text-main)]"
                  />
                </div>
              </div>
            </div>

            {/* Error Message if QR data is too big */}
            {qrGenerationError && (
              <div className="p-4 rounded-[16px] bg-red-500/10 border border-red-500 text-red-500 text-xs sm:text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{qrGenerationError}</span>
              </div>
            )}

            {/* Buttons: Back and Generate my QR */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="py-4 px-5 rounded-2xl font-bold text-sm flex items-center justify-center space-x-1.5 border border-[var(--zek-card-border)] bg-[var(--zek-card-bg)] text-[var(--zek-text-main)] hover:border-[#12b5a0] cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={generateQRCode}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-base zek-gradient-btn zek-glow-btn text-white flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Generate my QR</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            STEP 3: YOUR QR AND ORDER
            ================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            
            {/* QR Card Container */}
            <div className="p-6 rounded-[20px] bg-[var(--zek-card-bg)] border border-[var(--zek-card-border)] shadow-md flex flex-col items-center text-center space-y-4">
              
              {/* QR Image with quiet zone margin, black on white */}
              <div className="p-4 rounded-2xl bg-white shadow-xs border border-slate-200">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="vCard QR Code"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Text under QR: "Scan with your phone camera to test." */}
              <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-[var(--zek-text-main)]">
                <Smartphone className="w-4 h-4 text-[#12b5a0]" />
                <span>Scan with your phone camera to test.</span>
              </div>

              {/* Button: "Download QR (PNG)" */}
              <button
                type="button"
                onClick={handleDownloadQR}
                className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 border border-[#12b5a0]/40 bg-[var(--zek-tag-bg)] text-[var(--zek-tag-text)] hover:bg-[#12b5a0]/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#12b5a0]" />
                <span>Download QR (PNG)</span>
              </button>
            </div>

            {/* CARD MOCKUP PREVIEW */}
            <div className="p-5 sm:p-6 rounded-[20px] bg-[var(--zek-card-bg)] border border-[var(--zek-card-border)] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--zek-text-muted)] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#12b5a0]" />
                  {selectedCard === 'nfc' ? 'NFC CARD' : 'PVC CARD'}
                </span>
                <button
                  type="button"
                  onClick={() => setCardPreviewSide(cardPreviewSide === 'front' ? 'back' : 'front')}
                  className="text-xs font-bold text-[#0b684c] dark:text-[#5cd65c] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Flip to {cardPreviewSide === 'front' ? 'Back' : 'Front'}
                </button>
              </div>

              {/* Card Surface */}
              <div className="w-full aspect-16/9 max-w-sm mx-auto rounded-[20px] p-5 shadow-xl relative overflow-hidden bg-gradient-to-br from-[#0a2e22] via-[#07251b] to-[#041610] text-white flex flex-col justify-between border border-[#12b5a0]/30">
                <div className="absolute inset-0 zek-dot-pattern opacity-30 pointer-events-none" />
                
                {cardPreviewSide === 'front' ? (
                  <>
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-white p-0.5 flex items-center justify-center">
                          <img
                            src="/assets/aistudio/1_20261030_001843_0000_9349db2c.png"
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-extrabold tracking-tight text-sm text-white">ZEK HD</span>
                      </div>
                      {/* Show the NFC CHIP tag ONLY for NFC */}
                      {selectedCard === 'nfc' && (
                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#12b5a0]/20 text-[10px] font-bold text-[#5cd65c] border border-[#12b5a0]/40">
                          <Radio className="w-3 h-3" />
                          <span>NFC CHIP</span>
                        </div>
                      )}
                    </div>

                    {/* Contact Details (Front) - NEVER show placeholder text! */}
                    <div className="relative z-10 my-auto space-y-0.5">
                      <h3 className="font-extrabold text-base tracking-wide text-white">
                        {details.fullName.trim()}
                      </h3>
                      {details.jobTitle.trim() && (
                        <p className="text-xs text-[#5cd65c] font-semibold">
                          {details.jobTitle.trim()}
                        </p>
                      )}
                      {details.company.trim() && (
                        <p className="text-[11px] text-slate-300 font-medium">
                          {details.company.trim()}
                        </p>
                      )}
                    </div>

                    <div className="relative z-10 flex items-end justify-between text-[10px] text-[#95b8ab] border-t border-white/10 pt-2">
                      <span>{formatPhoneNumber(details.phone)}</span>
                      <span className="font-bold text-[#5cd65c]">
                        {selectedCard === 'nfc' ? 'Tap & Scan' : 'Scan to Connect'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="relative z-10 flex items-center justify-between h-full p-2">
                    <div className="space-y-1 text-left max-w-[55%]">
                      <div className="w-6 h-6 rounded-md bg-white p-0.5 flex items-center justify-center mb-1">
                        <img
                          src="/assets/aistudio/1_20261030_001843_0000_9349db2c.png"
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-xs font-bold text-white">Scan for vCard</p>
                      {details.email.trim() && (
                        <p className="text-[9px] text-[#95b8ab] truncate">{details.email.trim()}</p>
                      )}
                      {details.website.trim() && (
                        <p className="text-[9px] text-[#5cd65c] truncate">{formatWebsite(details.website)}</p>
                      )}
                    </div>
                    {qrDataUrl && (
                      <div className="p-1 bg-white rounded-xl shadow-md shrink-0">
                        <img src={qrDataUrl} alt="Card QR" className="w-20 h-20" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <div className="p-5 sm:p-6 rounded-[20px] bg-[var(--zek-card-bg)] border border-[var(--zek-card-border)] shadow-xs space-y-3">
              <h2 className="text-base font-extrabold text-[var(--zek-text-main)] flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--zek-tag-bg)] text-[var(--zek-tag-text)]">
                  {quantity} card{quantity > 1 ? 's' : ''}
                </span>
              </h2>

              <div className="space-y-2 text-sm text-[var(--zek-text-muted)] divide-y divide-[var(--zek-card-border)]">
                <div className="flex justify-between items-center pt-1">
                  <span>Card type:</span>
                  <strong className="text-[var(--zek-text-main)]">
                    {selectedCard === 'nfc' ? 'NFC Smart Card' : 'PVC Card'}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span>Quantity:</span>
                  <strong className="text-[var(--zek-text-main)]">{quantity}</strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span>Price per card:</span>
                  <strong className="text-[var(--zek-text-main)]">${unitPrice}</strong>
                </div>

                <div className="flex justify-between items-center pt-2 text-base font-black text-[#0b684c] dark:text-[#5cd65c]">
                  <span>Total:</span>
                  <span>${currentTotal}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-1.5 text-xs font-bold text-[#0b684c] dark:text-[#5cd65c]">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Free delivery in Harare CBD</span>
              </div>
            </div>

            {/* QUESTION: "Are you in Harare CBD?" */}
            <div className="p-5 sm:p-6 rounded-[20px] bg-[var(--zek-card-bg)] border border-[var(--zek-card-border)] shadow-xs space-y-3">
              <label className="block text-sm font-extrabold text-[var(--zek-text-main)]">
                Are you in Harare CBD?
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsInHarareCBD(true)}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    isInHarareCBD
                      ? 'border-[#12b5a0] bg-[var(--zek-tag-bg)] text-[var(--zek-tag-text)] ring-2 ring-[#12b5a0]/30'
                      : 'border-[var(--zek-card-border)] bg-[var(--zek-card-bg)] text-[var(--zek-text-muted)] hover:border-slate-400'
                  }`}
                >
                  <Check className={`w-4 h-4 ${isInHarareCBD ? 'opacity-100' : 'opacity-0'}`} />
                  <span>Yes, Harare CBD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsInHarareCBD(false)}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    !isInHarareCBD
                      ? 'border-[#12b5a0] bg-[var(--zek-tag-bg)] text-[var(--zek-tag-text)] ring-2 ring-[#12b5a0]/30'
                      : 'border-[var(--zek-card-border)] bg-[var(--zek-card-bg)] text-[var(--zek-text-muted)] hover:border-slate-400'
                  }`}
                >
                  <Check className={`w-4 h-4 ${!isInHarareCBD ? 'opacity-100' : 'opacity-0'}`} />
                  <span>No, Outside CBD</span>
                </button>
              </div>

              {/* Delivery notification */}
              <div className="pt-1">
                {isInHarareCBD ? (
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#0b684c] dark:text-[#5cd65c] bg-[var(--zek-tag-bg)] p-3 rounded-xl border border-[#12b5a0]/30">
                    <MapPin className="w-4 h-4 shrink-0 text-[#12b5a0]" />
                    <span>Free delivery: Your order qualifies for free delivery in Harare CBD!</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                    <MapPin className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Delivery outside Harare CBD: we&apos;ll quote you on WhatsApp</span>
                  </div>
                )}
              </div>
            </div>

            {/* ORDER ON WHATSAPP SECTION */}
            <div className="space-y-3">
              
              {/* Step 1 & Step 2 text above button */}
              <div className="p-3.5 rounded-xl bg-[var(--zek-card-bg)] border border-[var(--zek-card-border)] text-xs font-bold text-[var(--zek-text-main)] text-center shadow-xs">
                Step 1: Download your QR (PNG). Step 2: Order on WhatsApp and attach it.
              </div>

              {/* Big Green Button: "Order on WhatsApp" (solid #25d366 with chat icon) */}
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                className="w-full py-4 px-6 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center space-x-3 transition-all duration-200 active:scale-[0.99] shadow-xl text-white cursor-pointer bg-[#25d366] hover:bg-[#20ba5a] shadow-[#25d366]/30"
              >
                <MessageCircle className="w-6 h-6 fill-white text-[#25d366]" />
                <span>Order on WhatsApp</span>
              </button>

              {/* Under the button: Highlighted note with paperclip icon */}
              <div className="flex items-start space-x-2 p-3.5 rounded-xl bg-emerald-500/10 border border-[#25d366]/40 text-[var(--zek-text-main)] text-xs font-semibold">
                <Paperclip className="w-4 h-4 text-[#25d366] shrink-0 mt-0.5" />
                <span>
                  After WhatsApp opens, tap the attach icon and send your downloaded QR image so we print it exactly.
                </span>
              </div>

              {/* Back to Edit Details Button */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-1.5 border border-[var(--zek-card-border)] bg-[var(--zek-card-bg)] text-[var(--zek-text-main)] hover:border-[#12b5a0] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit Details</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ====================================================================
          FOOTER (Dark green #0a2e22 matching zek.co.zw)
          ==================================================================== */}
      <footer className="mt-auto bg-[#0a2e22] text-[#95b8ab] border-t border-[#144233] py-8 px-4 text-center text-xs relative overflow-hidden">
        <div className="absolute inset-0 zek-dot-pattern opacity-25 pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center">
              <img
                src="/assets/aistudio/1_20261030_001843_0000_9349db2c.png"
                alt="ZEK HD Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">ZEK HD</span>
          </div>

          <div className="flex items-center justify-center space-x-2 text-white font-semibold">
            <Phone className="w-3.5 h-3.5 text-[#5cd65c]" />
            <a href="tel:+263782676441" className="hover:text-[#5cd65c] transition-colors">
              +263 78 267 6441
            </a>
          </div>

          <p className="font-medium text-[#95b8ab]">
            © ZEK HD 2026. Zimbabwe&apos;s tech and design partner.
          </p>
        </div>
      </footer>
    </div>
  );
}
