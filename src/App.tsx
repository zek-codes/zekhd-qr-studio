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
  Share2,
  Sparkles,
  MapPin,
  Building,
  User,
  Phone,
  Briefcase,
  Globe,
  Mail,
  Sun,
  Moon,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  RotateCcw
} from 'lucide-react';

/* ==========================================================================
   CONSTANTS (put at the top of the code so they are easy to edit)
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
 * Standardize Zimbabwean phone numbers:
 * Converts local numbers starting with '0' (e.g. 0782676441) to international format '+263782676441'
 */
export function formatPhoneNumber(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Remove spaces, hyphens, and brackets
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
 * Standardize website URLs by adding https:// if missing
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
 * Generate standard vCard 3.0 string
 */
export function buildVCard(details: ContactDetails): string {
  const formattedPhone = formatPhoneNumber(details.phone);
  const formattedUrl = formatWebsite(details.website);

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${details.fullName.trim()}`,
  ];

  // Try splitting full name into given & family name for N field
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
    // Escaping special characters
    const cleanAddress = details.address.trim().replace(/,/g, '\\,');
    lines.push(`ADR;TYPE=WORK:;;${cleanAddress};;;;`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zek_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
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

  // Apply dark mode class to html element
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

  // Handle quantity change
  const handleQuantityInput = (val: string) => {
    if (val === '') {
      setQuantity(1);
      setQuantityError('');
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      setQuantityError('Please enter a valid number');
      return;
    }
    if (parsed < 1) {
      setQuantity(1);
      setQuantityError('Minimum quantity is 1 card');
    } else if (parsed > MAX_QUANTITY) {
      setQuantity(MAX_QUANTITY);
      setQuantityError(`Maximum quantity is ${MAX_QUANTITY} cards`);
    } else {
      setQuantity(parsed);
      setQuantityError('');
    }
  };

  const handleIncrement = () => {
    setQuantity((prev) => {
      const next = Math.min(prev + 1, MAX_QUANTITY);
      if (next === MAX_QUANTITY) setQuantityError(`Maximum order is ${MAX_QUANTITY} cards`);
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
        width: 600, // High-resolution output
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

  // Construct WhatsApp order message
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
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-[#061e16] text-white' : 'bg-[#f4f7f5] text-slate-900'} flex flex-col font-sans selection:bg-[#3ec9a0]/30 selection:text-[#0b3d2e]`}>
      
      {/* ====================================================================
          HEADER
          ==================================================================== */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${isDarkMode ? 'bg-[#0b3d2e]/90 border-teal-900/40' : 'bg-white/95 border-emerald-100'} px-4 py-3 shadow-xs`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          
          {/* Brand & Wordmark */}
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 border shadow-xs ${isDarkMode ? 'bg-white/10 border-teal-500/30' : 'bg-white border-emerald-100'}`}>
              <img
                src="/assets/aistudio/1_20261030_001843_0000_9349db2c.png"
                alt="ZEK HD Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-[#0b3d2e] dark:text-[#3ec9a0]">
                  ZEK HD
                </span>
                <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-teal-900/60 text-[#3ec9a0] border border-teal-700/50' : 'bg-emerald-100 text-[#0b3d2e]'}`}>
                  QR Studio
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Zimbabwe's tech and design partner
              </p>
            </div>
          </div>

          {/* Controls: Dark Mode Toggle & Direct Help */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className={`p-2 rounded-xl transition-all duration-150 border ${
                isDarkMode
                  ? 'bg-emerald-950/70 border-teal-800 text-teal-300 hover:bg-teal-900/50'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN CONTAINER (Mobile-First Layout)
          ==================================================================== */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 sm:py-8 flex flex-col justify-start">
        
        {/* PROGRESS INDICATOR */}
        <section aria-label="Order Progress" className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0b3d2e] dark:text-[#3ec9a0]">
              Step {currentStep} of 3
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {currentStep === 1 && 'Choose Card'}
              {currentStep === 2 && 'Contact Details'}
              {currentStep === 3 && 'QR & Delivery'}
            </span>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((stepNum) => {
              const isActive = currentStep === stepNum;
              const isPast = currentStep > stepNum;
              return (
                <div
                  key={stepNum}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-[#3ec9a0] shadow-sm shadow-[#3ec9a0]/30'
                      : isPast
                      ? 'bg-[#0b3d2e] dark:bg-[#3ec9a0]/70'
                      : isDarkMode
                      ? 'bg-slate-800'
                      : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>

          {/* Step Badges Row */}
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 px-1">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center space-x-1 ${currentStep === 1 ? 'text-[#0b3d2e] dark:text-[#3ec9a0]' : ''}`}
            >
              <span>1. Card Type</span>
            </button>
            <button
              onClick={() => {
                if (selectedCard) setCurrentStep(2);
              }}
              disabled={!selectedCard}
              className={`flex items-center space-x-1 ${currentStep === 2 ? 'text-[#0b3d2e] dark:text-[#3ec9a0]' : ''} ${!selectedCard ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span>2. Details</span>
            </button>
            <span className={`flex items-center space-x-1 ${currentStep === 3 ? 'text-[#0b3d2e] dark:text-[#3ec9a0]' : ''}`}>
              <span>3. Order & QR</span>
            </span>
          </div>
        </section>

        {/* ==================================================================
            STEP 1: CHOOSE YOUR CARD
            ================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b3d2e] dark:text-white">
                What would you like your QR on?
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Select your high-durability premium card finish. All cards are professionally encoded and precision printed.
              </p>
            </div>

            {/* TWO LARGE SELECTABLE CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option A: PVC Card */}
              <button
                type="button"
                onClick={() => setSelectedCard('pvc')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                  selectedCard === 'pvc'
                    ? 'border-[#3ec9a0] bg-emerald-50/70 dark:bg-teal-950/40 ring-4 ring-[#3ec9a0]/20 shadow-md'
                    : isDarkMode
                    ? 'border-slate-800 bg-[#0d2e24] hover:border-slate-700'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Checkmark bubble */}
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl ${selectedCard === 'pvc' ? 'bg-[#0b3d2e] text-[#3ec9a0]' : isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                    selectedCard === 'pvc'
                      ? 'bg-[#3ec9a0] border-[#3ec9a0] text-[#0b3d2e]'
                      : 'border-slate-400/50'
                  }`}>
                    {selectedCard === 'pvc' && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      PVC Card
                    </h2>
                    <span className="text-xl font-extrabold text-[#0b3d2e] dark:text-[#3ec9a0]">
                      ${PVC_PRICE}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / card</span>
                    </span>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Printed QR on a durable PVC business card. $5 per card.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-teal-900/50 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3ec9a0]" />
                  <span>Durable, waterproof matte finish</span>
                </div>
              </button>

              {/* Option B: NFC Smart Card */}
              <button
                type="button"
                onClick={() => setSelectedCard('nfc')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                  selectedCard === 'nfc'
                    ? 'border-[#3ec9a0] bg-emerald-50/70 dark:bg-teal-950/40 ring-4 ring-[#3ec9a0]/20 shadow-md'
                    : isDarkMode
                    ? 'border-slate-800 bg-[#0d2e24] hover:border-slate-700'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Popular / Smart badge */}
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl ${selectedCard === 'nfc' ? 'bg-[#0b3d2e] text-[#3ec9a0]' : isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white shadow-xs">
                      TAP + SCAN
                    </span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                      selectedCard === 'nfc'
                        ? 'bg-[#3ec9a0] border-[#3ec9a0] text-[#0b3d2e]'
                        : 'border-slate-400/50'
                    }`}>
                      {selectedCard === 'nfc' && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      NFC Smart Card
                    </h2>
                    <span className="text-xl font-extrabold text-[#0b3d2e] dark:text-[#3ec9a0]">
                      ${NFC_PRICE}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / card</span>
                    </span>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    QR printed plus a tap-to-share NFC chip. $10 per card.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-teal-900/50 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-[#3ec9a0]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant contactless phone tap sharing</span>
                </div>
              </button>
            </div>

            {/* HIGHLIGHTED BADGE: "Free delivery in Harare CBD" */}
            <div className={`flex items-center justify-center space-x-2 p-3.5 rounded-xl border ${
              isDarkMode
                ? 'bg-[#0b3d2e]/80 border-teal-500/30 text-teal-200'
                : 'bg-emerald-50 border-emerald-200 text-[#0b3d2e]'
            } shadow-xs font-medium text-sm text-center`}>
              <MapPin className="w-4 h-4 text-[#3ec9a0] shrink-0" />
              <span>
                <strong className="font-bold underline decoration-[#3ec9a0] underline-offset-2">Free delivery in Harare CBD</strong> on all card orders!
              </span>
            </div>

            {/* QUANTITY SELECTOR */}
            <div className={`p-5 rounded-2xl border ${
              isDarkMode ? 'bg-[#0d2e24] border-slate-800' : 'bg-white border-slate-200'
            } shadow-xs space-y-3`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label htmlFor={qtyInputId} className="block text-sm font-bold text-slate-900 dark:text-white">
                    How many cards?
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Order from 1 up to {MAX_QUANTITY} cards
                  </p>
                </div>

                {/* Minus, Input, Plus */}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border font-bold text-lg transition-all ${
                      quantity <= 1
                        ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-700'
                        : isDarkMode
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                    }`}
                    aria-label="Decrease quantity"
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
                    className={`w-20 text-center py-2 px-2 text-lg font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= MAX_QUANTITY}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border font-bold text-lg transition-all ${
                      quantity >= MAX_QUANTITY
                        ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-700'
                        : isDarkMode
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                    }`}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quantity Error Message */}
              {quantityError && (
                <p className="text-xs text-amber-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {quantityError}
                </p>
              )}

              {/* LIVE TOTAL LINE */}
              <div className="pt-3 border-t border-slate-200 dark:border-teal-900/60 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Estimated Total:
                </span>
                <span className="text-2xl font-black text-[#0b3d2e] dark:text-[#3ec9a0]">
                  {selectedCard ? `Total: $${currentTotal}` : 'Select a card'}
                </span>
              </div>
            </div>

            {/* CONTINUE BUTTON */}
            <div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!selectedCard}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 transition-all duration-200 ${
                  selectedCard
                    ? 'bg-[#0b3d2e] text-white hover:bg-[#072b20] active:scale-[0.99] shadow-lg shadow-[#0b3d2e]/25 cursor-pointer dark:bg-[#3ec9a0] dark:text-[#061e16] dark:hover:bg-[#35b58f]'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                }`}
              >
                <span>Continue to Contact Details</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              {!selectedCard && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Please select either PVC Card or NFC Smart Card above to continue.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================
            STEP 2: YOUR CONTACT DETAILS
            ================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b3d2e] dark:text-white">
                Your contact details
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Provide the details you want programmed onto your vCard QR code.
              </p>
            </div>

            {/* NOTE: "All cards will carry this same QR." */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-[#0b3d2e]/60 border-teal-800 text-teal-200' : 'bg-emerald-50 border-emerald-200 text-[#0b3d2e]'
            }`}>
              <ShieldCheck className="w-5 h-5 text-[#3ec9a0] shrink-0" />
              <p className="text-xs sm:text-sm font-semibold">
                Note: All cards will carry this same QR.
              </p>
            </div>

            {/* FORM FIELDS */}
            <div className={`p-5 sm:p-6 rounded-2xl border ${
              isDarkMode ? 'bg-[#0d2e24] border-slate-800' : 'bg-white border-slate-200'
            } shadow-xs space-y-4`}>
              
              {/* Full Name (Required) */}
              <div>
                <label htmlFor={fullNameInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
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
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                      fieldErrors.fullName
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                        : isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Phone (Required, auto-converted starting 0 to +263) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={phoneInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  {details.phone.startsWith('0') && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-[#3ec9a0]">
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
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                      fieldErrors.phone
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                        : isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Numbers starting with 0 automatically convert to Zimbabwe code (+263).
                </p>
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Job Title & Company (2 columns on sm) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={jobTitleInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
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
                      className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={companyInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Company
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      id={companyInputId}
                      type="text"
                      placeholder="e.g. ZEK HD Zimbabwe"
                      value={details.company}
                      onChange={(e) => setDetails({ ...details, company: e.target.value })}
                      className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor={emailInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id={emailInputId}
                    type="email"
                    placeholder="e.g. tendai@zekhd.co.zw"
                    value={details.email}
                    onChange={(e) => {
                      setDetails({ ...details, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                      fieldErrors.email
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                        : isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Website (auto https://) */}
              <div>
                <label htmlFor={websiteInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Website
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    id={websiteInputId}
                    type="text"
                    placeholder="e.g. zekhd.co.zw"
                    value={details.website}
                    onChange={(e) => setDetails({ ...details, website: e.target.value })}
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  https:// is automatically prepended if omitted.
                </p>
              </div>

              {/* Address */}
              <div>
                <label htmlFor={addressInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id={addressInputId}
                    type="text"
                    placeholder="e.g. Samora Machel Ave, Harare, Zimbabwe"
                    value={details.address}
                    onChange={(e) => setDetails({ ...details, address: e.target.value })}
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3ec9a0] ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Error banner if QR generation fails */}
            {qrGenerationError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500 text-red-500 text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{qrGenerationError}</span>
              </div>
            )}

            {/* BUTTONS: Back and Generate my QR */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`py-4 px-5 rounded-2xl font-bold text-sm flex items-center justify-center space-x-1.5 border transition-all ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={generateQRCode}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-base bg-[#0b3d2e] text-white hover:bg-[#072b20] active:scale-[0.99] shadow-lg shadow-[#0b3d2e]/25 cursor-pointer dark:bg-[#3ec9a0] dark:text-[#061e16] dark:hover:bg-[#35b58f] flex items-center justify-center space-x-2 transition-all duration-200"
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
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b3d2e] dark:text-white">
                Your QR & order
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Your vCard 3.0 static QR code is ready. Review your order details and place on WhatsApp.
              </p>
            </div>

            {/* QR CODE & PREVIEW BOX */}
            <div className={`p-6 rounded-3xl border ${
              isDarkMode ? 'bg-[#0d2e24] border-slate-800' : 'bg-white border-slate-200'
            } shadow-md flex flex-col items-center text-center space-y-4`}>
              
              {/* QR Image with quiet zone */}
              <div className="relative p-4 rounded-2xl bg-white shadow-md border border-slate-200 flex flex-col items-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="vCard 3.0 QR Code"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <p className="text-xs text-slate-400">Generating QR...</p>
                  </div>
                )}
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-2">
                  vCard 3.0 • Quiet-Zone Margin
                </span>
              </div>

              {/* Note: "Scan with your phone camera to test." */}
              <div className="flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                <Smartphone className="w-4 h-4 text-[#3ec9a0]" />
                <span>Scan with your phone camera to test.</span>
              </div>

              {/* Button: "Download QR (PNG)" */}
              <button
                type="button"
                onClick={handleDownloadQR}
                className={`py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 border transition-all ${
                  isDarkMode
                    ? 'bg-slate-800 border-teal-700/50 text-[#3ec9a0] hover:bg-slate-700'
                    : 'bg-emerald-50 border-emerald-200 text-[#0b3d2e] hover:bg-emerald-100'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Download QR (PNG)</span>
              </button>
            </div>

            {/* INTERACTIVE PHYSICAL CARD PREVIEW */}
            <div className={`p-5 rounded-2xl border ${
              isDarkMode ? 'bg-[#0b3d2e]/40 border-teal-900/60' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Card Mockup Preview ({selectedCard === 'nfc' ? 'NFC Smart Card' : 'PVC Card'})
                </span>
                <button
                  type="button"
                  onClick={() => setCardPreviewSide(cardPreviewSide === 'front' ? 'back' : 'front')}
                  className="text-xs font-semibold text-[#0b3d2e] dark:text-[#3ec9a0] hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Flip to {cardPreviewSide === 'front' ? 'Back' : 'Front'}
                </button>
              </div>

              {/* Business Card Render */}
              <div className="w-full aspect-16/9 max-w-sm mx-auto rounded-2xl p-5 shadow-xl relative overflow-hidden bg-linear-to-br from-[#0b3d2e] via-[#082a20] to-[#041610] text-white flex flex-col justify-between border border-teal-500/20">
                {/* Subtle sheen highlight */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#3ec9a0]/15 rounded-full blur-2xl pointer-events-none" />

                {cardPreviewSide === 'front' ? (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-white p-0.5 flex items-center justify-center shadow-xs">
                          <img
                            src="/assets/aistudio/1_20261030_001843_0000_9349db2c.png"
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-extrabold tracking-tight text-sm text-white">ZEK HD</span>
                      </div>
                      {selectedCard === 'nfc' && (
                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-[#3ec9a0] border border-[#3ec9a0]/30">
                          <Radio className="w-3 h-3" />
                          <span>NFC CHIP</span>
                        </div>
                      )}
                    </div>

                    <div className="my-auto">
                      <h3 className="font-extrabold text-base tracking-wide text-white">
                        {details.fullName || 'Your Full Name'}
                      </h3>
                      <p className="text-xs text-[#3ec9a0] font-medium">
                        {details.jobTitle || 'Your Job Title'}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {details.company || 'Your Company'}
                      </p>
                    </div>

                    <div className="flex items-end justify-between text-[9px] text-slate-400 border-t border-white/10 pt-2">
                      <span>{formatPhoneNumber(details.phone) || '+263...'}</span>
                      <span className="font-semibold text-[#3ec9a0]">Tap or Scan to Connect</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between h-full p-2">
                    <div className="space-y-1 text-left max-w-[55%]">
                      <p className="text-xs font-bold text-white">Direct Contact vCard</p>
                      <p className="text-[10px] text-slate-300">Hold phone near or scan QR</p>
                      <div className="pt-2 text-[9px] text-slate-400 truncate">
                        {details.email || 'email@example.com'}
                      </div>
                      <div className="text-[9px] text-[#3ec9a0] truncate">
                        {formatWebsite(details.website) || 'zekhd.co.zw'}
                      </div>
                    </div>
                    {qrDataUrl && (
                      <div className="p-1 bg-white rounded-lg shadow-md shrink-0">
                        <img src={qrDataUrl} alt="Card QR" className="w-20 h-20" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <div className={`p-5 rounded-2xl border ${
              isDarkMode ? 'bg-[#0d2e24] border-slate-800' : 'bg-white border-slate-200'
            } shadow-xs space-y-3`}>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#3ec9a0]">
                  Ready to print
                </span>
              </h2>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="flex justify-between items-center pt-1">
                  <span>Card Type:</span>
                  <strong className="text-slate-900 dark:text-white">
                    {selectedCard === 'nfc' ? 'NFC Smart Card' : 'PVC Card'}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span>Quantity:</span>
                  <strong className="text-slate-900 dark:text-white">{quantity} card{quantity > 1 ? 's' : ''}</strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span>Price per card:</span>
                  <strong className="text-slate-900 dark:text-white">${unitPrice}</strong>
                </div>

                <div className="flex justify-between items-center pt-2 text-base font-black text-[#0b3d2e] dark:text-[#3ec9a0]">
                  <span>Total Amount:</span>
                  <span>${currentTotal}</span>
                </div>
              </div>

              {/* Highlighted Delivery Benefit */}
              <div className="pt-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-[#3ec9a0]">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Free delivery in Harare CBD</span>
                </div>
              </div>
            </div>

            {/* DELIVERY QUESTION */}
            <div className={`p-5 rounded-2xl border ${
              isDarkMode ? 'bg-[#0d2e24] border-slate-800' : 'bg-white border-slate-200'
            } shadow-xs space-y-3`}>
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                Are you in Harare CBD?
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsInHarareCBD(true)}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                    isInHarareCBD
                      ? 'border-[#3ec9a0] bg-emerald-50 dark:bg-teal-950/50 text-[#0b3d2e] dark:text-[#3ec9a0] ring-2 ring-[#3ec9a0]/30'
                      : isDarkMode
                      ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Check className={`w-4 h-4 ${isInHarareCBD ? 'opacity-100' : 'opacity-0'}`} />
                  <span>Yes, Harare CBD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsInHarareCBD(false)}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                    !isInHarareCBD
                      ? 'border-[#3ec9a0] bg-emerald-50 dark:bg-teal-950/50 text-[#0b3d2e] dark:text-[#3ec9a0] ring-2 ring-[#3ec9a0]/30'
                      : isDarkMode
                      ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Check className={`w-4 h-4 ${!isInHarareCBD ? 'opacity-100' : 'opacity-0'}`} />
                  <span>No, Outside CBD</span>
                </button>
              </div>

              {/* Delivery Outcome Notice */}
              <div className="pt-1">
                {isInHarareCBD ? (
                  <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-[#3ec9a0] bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Free delivery: Your order qualifies for free delivery in Harare CBD!</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Delivery outside Harare CBD: we&apos;ll quote you on WhatsApp</span>
                  </div>
                )}
              </div>
            </div>

            {/* BIG GREEN BUTTON "Order on WhatsApp" */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                className="w-full py-4 px-6 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center space-x-3 transition-all duration-200 active:scale-[0.99] shadow-xl text-white cursor-pointer bg-[#25D366] hover:bg-[#20ba5a] shadow-[#25D366]/30"
              >
                {/* WhatsApp Chat Icon */}
                <svg
                  className="w-6 h-6 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Order on WhatsApp</span>
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-1.5 border transition-all ${
                  isDarkMode
                    ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit Details</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ====================================================================
          FOOTER
          ==================================================================== */}
      <footer className={`mt-auto border-t py-6 px-4 text-center text-xs transition-colors ${
        isDarkMode
          ? 'bg-[#041610] border-teal-950 text-slate-400'
          : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            © ZEK HD 2026. Zimbabwe&apos;s tech and design partner.
          </p>
          <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-400 dark:text-slate-500">
            <span>PVC & NFC Solutions</span>
            <span>•</span>
            <span>Harare CBD Free Delivery</span>
            <span>•</span>
            <span>+263 78 267 6441</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
