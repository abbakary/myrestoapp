import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  ChefHat,
  Check,
  CreditCard,
  Layers,
  ShieldCheck,
  Smartphone,
  Mail,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { LandingPageId, SaasPlanId } from '../../types/restaurant';

interface EditorialImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

const EditorialImage: React.FC<EditorialImageProps> = ({ src, alt, fallbackTitle, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white p-8 text-center ${className}`}
      >
        <Building2 className="w-8 h-8 text-orange-400 mb-3" />
        <div className="text-sm font-semibold">{fallbackTitle}</div>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const PublicLandingSite: React.FC = () => {
  const {
    landingPage,
    setLandingPage,
    setPlatformSurface,
    setSelectedRegisterPlan,
    quickLaunchWorkspace,
    submitLeadInquiry,
    currency,
    toggleCurrency,
    formatMoney,
    providerStats,
    saasPlans,
  } = useRestaurant();

  const publicPlans = saasPlans.filter((p) => p.status === 'active' && p.isPublic);

  // Pricing billing toggle (lives inside Pricing section, never inside Top Bar)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Demo / Lead Capture form state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branchesCount, setBranchesCount] = useState('2');
  const [planInterest, setPlanInterest] = useState<SaasPlanId>('Growth');
  const [notes, setNotes] = useState('');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSubmittedCompany, setLeadSubmittedCompany] = useState<string | null>(null);

  const navigateLanding = (page: LandingPageId) => {
    setLandingPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleChoosePlan = (planId: SaasPlanId) => {
    setSelectedRegisterPlan(planId);
    setPlatformSurface('register');
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadError(null);
    if (!companyName.trim() || !contactName.trim() || !email.includes('@')) {
      setLeadError('Enter your hospitality group name, contact person, and a valid work email.');
      return;
    }
    const created = submitLeadInquiry({
      companyName,
      contactName,
      email,
      phone: phone || '+255 754 000 000',
      branchesCount: Number(branchesCount) || 1,
      planInterest,
      notes,
    });
    setLeadSubmittedCompany(created.companyName);
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setNotes('');
  };

  const navItems: { id: LandingPageId; label: string }[] = [
    { id: 'home', label: 'Overview' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'pricing', label: 'Packages & Pricing' },
    { id: 'customers', label: 'Customers' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-sans flex flex-col">
      {/* ================= TOP BAR CONTRACT (3 ZONES, gap-8) ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean wordmark */}
          <button
            type="button"
            onClick={() => navigateLanding('home')}
            className="text-lg font-extrabold tracking-tight text-neutral-950 whitespace-nowrap shrink-0 cursor-pointer"
          >
            RestaurantOS
          </button>

          {/* Zone 2: Concise single-line nav links */}
          <nav aria-label="Platform navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
            {navItems.map((item) => {
              const active = landingPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateLanding(item.id)}
                  className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                    active
                      ? 'text-neutral-950 font-semibold border-b-2 border-orange-600'
                      : 'hover:text-neutral-950 hover:underline underline-offset-4'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPlatformSurface('login')}
              className="whitespace-nowrap shrink-0 hover:text-neutral-950 hover:underline underline-offset-4 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setPlatformSurface('register')}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        {/* Mobile secondary page switcher */}
        <div className="md:hidden border-t border-neutral-200 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar text-xs">
          <div className="flex items-center gap-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateLanding(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 ${
                  landingPage === item.id ? 'font-bold text-orange-600' : 'text-neutral-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPlatformSurface('login')}
            className="whitespace-nowrap shrink-0 font-semibold text-neutral-900"
          >
            Sign In
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* ================= PAGE 1: OVERVIEW (HOME) ================= */}
        {landingPage === 'home' && (
          <>
            {/* Hero Section */}
            <section className="max-w-[1200px] mx-auto px-6 pt-12 pb-14 lg:pt-16 lg:pb-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
                  <div className="space-y-5">
                    <div className="text-xs font-medium text-neutral-500">
                      Multi-Tenant Hospitality SaaS · Dar es Salaam · Arusha · East Africa
                    </div>
                    <h1
                      className="font-extrabold tracking-tight text-neutral-950 leading-[1.08]"
                      style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
                    >
                      Operational control from counter POS to multi-branch HQ.
                    </h1>
                    <p className="text-base text-neutral-600 leading-relaxed max-w-[60ch]">
                      RestaurantOS connects isolated restaurant tenants, branch POS terminals, live Kitchen Display tickets, standardized BOM food costing, waiter referral commissions, and system-wide provider governance in one platform.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPlatformSurface('register')}
                        className="px-5 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span>Register Restaurant Tenant</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlatformSurface('login')}
                        className="px-5 py-3 rounded-lg bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Sign In to Workspace
                      </button>
                    </div>

                    {/* Instant Interactive Environment Access Bar */}
                    <div className="pt-4 border-t border-neutral-200 space-y-2.5">
                      <div className="text-xs font-semibold text-neutral-500">
                        Explore live platform environments directly
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => quickLaunchWorkspace('provider')}
                          className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          System Provider Control Site
                        </button>
                        <button
                          type="button"
                          onClick={() => quickLaunchWorkspace('savanna_hq')}
                          className="px-3 py-2 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Savanna Group Main HQ
                        </button>
                        <button
                          type="button"
                          onClick={() => quickLaunchWorkspace('kona_hq')}
                          className="px-3 py-2 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Kona Fast Grill Tenant
                        </button>
                        <button
                          type="button"
                          onClick={() => quickLaunchWorkspace('cashier_pos')}
                          className="px-3 py-2 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Masaki Cashier POS
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900">
                    <EditorialImage
                      src="/src/assets/images/saas_hero_dining_1795164945997.jpg"
                      alt="RestaurantOS dining floor, POS counter, and open kitchen service"
                      fallbackTitle="RestaurantOS Live Operations Floor"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <div className="text-xs text-neutral-300 font-mono">
                        Masaki HQ · City Centre · Arusha · Sinza · Kariakoo
                      </div>
                      <div className="text-base font-bold mt-1">
                        Unified POS, Kitchen Display, Recipe BOM Costing &amp; Branch Ledger
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-width 4-Column Platform Proof Strip below Hero */}
              <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-neutral-200 pt-8">
                <div className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="text-xs text-neutral-500">Isolated Tenant Organizations</div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-neutral-950 mt-1">
                    {providerStats.totalTenants} Groups
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Zero cross-tenant data leakage</div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="text-xs text-neutral-500">Active Hospitality Branches</div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-neutral-950 mt-1">
                    {providerStats.totalBranches} Stores
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Central HQ command &amp; branch switch</div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="text-xs text-neutral-500">Live Tracked Branch GMV</div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-neutral-950 mt-1">
                    {formatMoney(providerStats.platformGmvTzs)}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Real-time POS &amp; QR settlements</div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="text-xs text-neutral-500">Subscription Cadence</div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-orange-600 mt-1">
                    14-Day Trial
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Instant flagship branch setup</div>
                </div>
              </div>
            </section>

            {/* Asymmetric Bento Grid: Core SaaS Capabilities */}
            <section className="bg-white border-y border-neutral-200 py-16">
              <div className="max-w-[1200px] mx-auto px-6 space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="text-xs font-semibold text-orange-600">Platform Architecture</div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                      Four operational layers built for high-margin kitchens.
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateLanding('solutions')}
                    className="text-sm font-semibold text-neutral-900 hover:text-orange-600 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Explore all workflows</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Marquee Wide Card (col-span-2) */}
                  <div className="lg:col-span-2 border border-neutral-200 rounded-2xl overflow-hidden bg-[#FAFAFA] grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                      <div className="space-y-3">
                        <div className="text-xs font-mono text-neutral-500">01. Multi-Tenant &amp; Main HQ Control</div>
                        <h3 className="text-xl font-bold text-neutral-950">
                          Strict branch isolation with instant Main HQ consolidation.
                        </h3>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          Each hospitality tenant operates its own private catalog, branches, staff payroll, and mailboxes. Main HQ approves discounts, transfers store stock between sister branches, and opens any branch terminal in one click.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs font-semibold text-neutral-800">
                        <button
                          type="button"
                          onClick={() => quickLaunchWorkspace('savanna_hq')}
                          className="inline-flex items-center gap-1.5 text-orange-600 hover:underline cursor-pointer"
                        >
                          <span>Launch Main HQ Overview</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="h-56 md:h-auto bg-neutral-900">
                      <EditorialImage
                        src="/src/assets/images/saas_branch_network_1795164946778.jpg"
                        alt="Multi-branch restaurant storefront and terrace tables"
                        fallbackTitle="Multi-Branch Hospitality Network"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Right Feature Block */}
                  <div className="border border-neutral-200 rounded-2xl p-6 sm:p-8 bg-white flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="text-xs font-mono text-neutral-500">02. System Provider Site</div>
                      <h3 className="text-xl font-bold text-neutral-950">
                        Centralized SaaS tenant &amp; account governance.
                      </h3>
                      <p className="text-sm text-neutral-600 leading-relaxed">
                        Platform administrators manage tenant subscriptions, branch quotas, pending account approvals, invoice settlements, inbound leads, and audited tenant inspections from one control console.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quickLaunchWorkspace('provider')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-950 hover:text-orange-600 cursor-pointer"
                    >
                      <span>Open System Provider Control</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Left Card */}
                  <div className="border border-neutral-200 rounded-2xl p-6 sm:p-8 bg-white flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="text-xs font-mono text-neutral-500">03. Operational Recipe BOM</div>
                      <h3 className="text-lg font-bold text-neutral-950">
                        Sub-recipes, batch production, and yield loss deduction.
                      </h3>
                      <p className="text-sm text-neutral-600 leading-relaxed">
                        Supports both made-to-order kitchen deduction and 100-plate batch prep orders with shortage checks, approved substitutes, and daily count variance reconciliation.
                      </p>
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">
                      Main Store · Kitchen Line · Sub-Recipe Pool
                    </div>
                  </div>

                  {/* Bottom Wide Card */}
                  <div className="lg:col-span-2 border border-neutral-200 rounded-2xl overflow-hidden bg-[#FAFAFA] grid grid-cols-1 md:grid-cols-2">
                    <div className="h-56 md:h-auto bg-neutral-900">
                      <EditorialImage
                        src="/src/assets/images/saas_kitchen_bom_1795164945258.jpg"
                        alt="Executive chef and inventory lead inspecting standardized prep containers"
                        fallbackTitle="Kitchen BOM Preparation"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 sm:p-8 flex flex-col justify-between space-y-5">
                      <div className="space-y-3">
                        <div className="text-xs font-mono text-neutral-500">04. Cashier POS, Waiter QR &amp; EOD Audit</div>
                        <h3 className="text-xl font-bold text-neutral-950">
                          Every tender, waiter commission, and void tracked end-to-end.
                        </h3>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          Waiters share personal QR links with 5% commission attribution. Cashiers process split Cash, M-Pesa, Airtel Money, and Card payments while Owners audit drafts and kitchen rejections live.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateLanding('pricing')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                      >
                        <span>Compare SaaS Plans &amp; Limits</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Live SaaS Packages Section Directly on Landing Overview */}
            <section className="max-w-[1200px] mx-auto px-6 py-16 space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="text-xs font-semibold text-orange-600">
                    Live SaaS Packages · Controlled from System Provider Site
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                    Choose a hospitality package built for your branch footprint.
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Packages below sync live from the System Provider Control Console. Any fee, branch quota, or visibility update published by the System Provider reflects here immediately.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap shrink-0">
                  <div className="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        billingCycle === 'monthly' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        billingCycle === 'annual' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
                      }`}
                    >
                      Annual
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={toggleCurrency}
                    className="px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 cursor-pointer"
                  >
                    {currency}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {publicPlans.map((plan) => {
                  const discountMult = billingCycle === 'annual' ? (100 - plan.annualDiscountPct) / 100 : 1;
                  const effectiveMonthly = Math.round(plan.monthlyFeeTzs * discountMult);
                  const isPopular = Boolean(plan.isFeatured);
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 border ${
                        isPopular
                          ? 'bg-neutral-950 text-white border-neutral-900'
                          : 'bg-white text-neutral-900 border-neutral-200'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className={`text-xs font-medium ${isPopular ? 'text-orange-400' : 'text-neutral-500'}`}>
                              {plan.audience}
                            </div>
                            <h3 className="text-xl font-extrabold mt-1">{plan.name}</h3>
                          </div>
                          {isPopular && (
                            <span className="text-[11px] font-mono font-bold text-orange-400 shrink-0">
                              RECOMMENDED
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-current/10">
                          <div className="text-3xl font-extrabold font-mono tabular-nums">
                            {formatMoney(effectiveMonthly)}
                          </div>
                          <div className={`text-xs mt-1 ${isPopular ? 'text-neutral-400' : 'text-neutral-500'}`}>
                            per month · {billingCycle === 'annual' ? `${plan.annualDiscountPct}% annual discount` : 'monthly billing'} · {plan.trialDays}-day free trial
                          </div>
                        </div>

                        <p className={`text-sm leading-relaxed ${isPopular ? 'text-neutral-300' : 'text-neutral-600'}`}>
                          {plan.summary}
                        </p>

                        <ul className="space-y-2 text-xs pt-2">
                          <li className="flex items-center gap-2 font-mono font-semibold">
                            <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-orange-400' : 'text-emerald-600'}`} />
                            <span>Branch Quota: Up to {plan.maxBranches} isolated {plan.maxBranches === 1 ? 'store' : 'stores'}</span>
                          </li>
                          <li className="flex items-center gap-2 font-mono font-semibold">
                            <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-orange-400' : 'text-emerald-600'}`} />
                            <span>Staff Seats: Up to {plan.maxStaffSeats} operators · {plan.maxRecipes} BOM recipes</span>
                          </li>
                          {plan.includedModules.map((mod) => (
                            <li key={mod} className="flex items-start gap-2">
                              <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-orange-400' : 'text-emerald-600'}`} />
                              <span>{mod}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleChoosePlan(plan.id)}
                        className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isPopular
                            ? 'bg-orange-600 hover:bg-orange-700 text-white'
                            : 'bg-neutral-950 hover:bg-neutral-800 text-white'
                        }`}
                      >
                        Choose {plan.name} &amp; Register
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* End-to-End SaaS Package & Provider Flow Showcase */}
            <section className="bg-white border-t border-neutral-200 py-16">
              <div className="max-w-[1200px] mx-auto px-6 space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="text-xs font-semibold text-orange-600">How Packages Flow End-to-End</div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                      From Landing Package selection to Provider billing &amp; branch quota enforcement.
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => quickLaunchWorkspace('provider')}
                    className="text-xs font-bold text-slate-900 hover:text-orange-600 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Manage Packages in Provider Control Site</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    {
                      step: 'STEP 01',
                      title: 'Select Package on Landing',
                      desc: 'Hospitality groups pick Starter, Growth, Enterprise, or any custom provider-published package directly from Overview or Pricing.',
                      actionLabel: 'Register With Plan',
                      onAction: () => handleChoosePlan(publicPlans[1]?.id || publicPlans[0]?.id || 'Growth'),
                    },
                    {
                      step: 'STEP 02',
                      title: 'Isolated Tenant & Trial Created',
                      desc: 'Registration creates a dedicated SaasOrganization, Flagship HQ branch (HQ-01), isolated POS/BOM data store, and owner login.',
                      actionLabel: 'Open Registration',
                      onAction: () => setPlatformSurface('register'),
                    },
                    {
                      step: 'STEP 03',
                      title: 'Quota-Guarded Branch Expansion',
                      desc: 'Main HQ owners add sister branches up to their package maxBranches quota, sharing standardized BOM recipes & HQ directives.',
                      actionLabel: 'Inspect Savanna HQ',
                      onAction: () => quickLaunchWorkspace('savanna_hq'),
                    },
                    {
                      step: 'STEP 04',
                      title: 'Provider Lifecycle & Upgrades',
                      desc: 'System Provider edits fees, toggles landing visibility, upgrades tenant plans, records billing renewals, or suspends delinquent tenants.',
                      actionLabel: 'Open Provider Site',
                      onAction: () => quickLaunchWorkspace('provider'),
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="bg-[#FAFAFA] border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-2.5">
                        <div className="text-[11px] font-mono font-bold text-orange-600">{item.step}</div>
                        <h3 className="text-base font-bold text-neutral-950">{item.title}</h3>
                        <p className="text-xs text-neutral-600 leading-relaxed">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={item.onAction}
                        className="text-xs font-semibold text-neutral-950 hover:text-orange-600 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ================= PAGE 2: SOLUTIONS ================= */}
        {landingPage === 'solutions' && (
          <section className="max-w-[1200px] mx-auto px-6 py-12 lg:py-16 space-y-12">
            <div className="max-w-3xl space-y-4">
              <div className="text-xs font-semibold text-orange-600">Hospitality Operations Stack</div>
              <h1
                className="font-extrabold tracking-tight text-neutral-950 leading-[1.1]"
                style={{ fontSize: 'clamp(2rem, 3.6vw, 3.25rem)', textWrap: 'balance' }}
              >
                Built for East African restaurants, fast-grill counters, and multi-city groups.
              </h1>
              <p className="text-base text-neutral-600 leading-relaxed">
                Every workflow maps directly to real dining-room and back-of-house accountability—from ingredient sack intake to customer QR ordering and System Provider billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  num: '01.',
                  title: 'Cashier POS & Split Tender Register',
                  icon: CreditCard,
                  copy: 'Process dine-in tables, takeaway pickup, delivery tickets, held open tabs, custom off-menu specials, and split Cash + M-Pesa + Card payments with automatic drawer float calculation.',
                  metric: 'Sub-2s ticket handoff to Kitchen KDS',
                },
                {
                  num: '02.',
                  title: 'Operational Recipe BOM & Batch Prep',
                  icon: ChefHat,
                  copy: 'Author multi-line recipes with edible yield percentages, intermediate sub-recipe bases (e.g. Beef Stew Base), batch scaling calculators, shortage resolution, and catering event costing.',
                  metric: 'Automatic deduction at Kitchen Start or Sale',
                },
                {
                  num: '03.',
                  title: 'Waiter Referral Links & Commission Ledger',
                  icon: Smartphone,
                  copy: 'Every waiter receives a trackable QR dining portal URL (/w/CODE). Commissions calculate only on verified paid orders and settle cleanly through payroll records.',
                  metric: 'Configurable % or fixed-per-order rules',
                },
                {
                  num: '04.',
                  title: 'Main HQ Overview & Inter-Branch Transfers',
                  icon: Layers,
                  copy: 'Group owners inspect consolidated sales across Masaki, City Centre, and Arusha, dispatch inter-branch stock transfers from surplus stores, and send HQ email broadcasts.',
                  metric: 'Zero cross-tenant mixing across SaaS accounts',
                },
                {
                  num: '05.',
                  title: 'Branch & HQ Email Center',
                  icon: Mail,
                  copy: 'Dedicated branch mailboxes for catering bookings, supplier invoices, and HQ policy directives, complete with unread inbox counts inside the ERP header.',
                  metric: 'Intra-tenant directory routing & broadcasts',
                },
                {
                  num: '06.',
                  title: 'System Provider Accounts Control Site',
                  icon: ShieldCheck,
                  copy: 'SaaS platform operators control tenant lifecycle (Active, Trial, Suspended), upgrade plans, enforce branch quotas, approve pending users, and convert demo leads in one click.',
                  metric: 'Complete immutable provider audit trail',
                },
              ].map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.num}
                    className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-neutral-500">{cap.num}</span>
                        <Icon className="w-5 h-5 text-orange-600" />
                      </div>
                      <h2 className="text-lg font-bold text-neutral-950">{cap.title}</h2>
                      <p className="text-sm text-neutral-600 leading-relaxed">{cap.copy}</p>
                    </div>
                    <div className="pt-4 border-t border-neutral-100 text-xs font-mono text-neutral-700">
                      {cap.metric}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-neutral-950 text-white rounded-2xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-bold">Ready to onboard your first branch?</h3>
                <p className="text-sm text-neutral-300">
                  Create an isolated tenant organization with your flagship HQ branch in under 60 seconds, or launch the live demo workspaces immediately.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPlatformSurface('register')}
                  className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold cursor-pointer"
                >
                  Create Tenant Account
                </button>
                <button
                  type="button"
                  onClick={() => navigateLanding('pricing')}
                  className="px-5 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold cursor-pointer"
                >
                  View Pricing
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 3: PRICING ================= */}
        {landingPage === 'pricing' && (
          <section className="max-w-[1200px] mx-auto px-6 py-12 lg:py-16 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="text-xs font-semibold text-orange-600">Transparent SaaS Subscriptions</div>
                <h1
                  className="font-extrabold tracking-tight text-neutral-950 leading-[1.1]"
                  style={{ fontSize: 'clamp(2rem, 3.6vw, 3.25rem)', textWrap: 'balance' }}
                >
                  Predictable monthly pricing scaled by branch count.
                </h1>
                <p className="text-sm text-neutral-600">
                  All plans include isolated tenant storage, mobile QR customer ordering, and KDS synchronization.
                </p>
              </div>

              {/* Billing Cycle & Currency Controls inside Pricing Toolbar */}
              <div className="flex items-center gap-3 flex-wrap shrink-0">
                <div className="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      billingCycle === 'annual' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
                    }`}
                  >
                    Annual (Save 15%)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleCurrency}
                  className="px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 cursor-pointer"
                >
                  Currency: {currency}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {publicPlans.map((plan) => {
                const discountMult = billingCycle === 'annual' ? (100 - plan.annualDiscountPct) / 100 : 1;
                const effectiveMonthly = Math.round(plan.monthlyFeeTzs * discountMult);
                const isPopular = Boolean(plan.isFeatured);
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 border ${
                      isPopular
                        ? 'bg-neutral-950 text-white border-neutral-900'
                        : 'bg-white text-neutral-900 border-neutral-200'
                    }`}
                  >
                    <div className="space-y-4">
                      <div>
                        <div className={`text-xs font-medium ${isPopular ? 'text-orange-400' : 'text-neutral-500'}`}>
                          {plan.audience}
                        </div>
                        <h2 className="text-xl font-extrabold mt-1">{plan.name}</h2>
                      </div>

                      <div className="pt-2 border-t border-current/10">
                        <div className="text-3xl font-extrabold font-mono tabular-nums">
                          {formatMoney(effectiveMonthly)}
                        </div>
                        <div className={`text-xs mt-1 ${isPopular ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          per month · billed {billingCycle} {billingCycle === 'annual' ? `(${plan.annualDiscountPct}% off)` : ''} · {plan.trialDays}-day trial
                        </div>
                      </div>

                      <p className={`text-sm leading-relaxed ${isPopular ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {plan.summary}
                      </p>

                      <ul className="space-y-2.5 text-xs pt-2">
                        <li className="flex items-center gap-2 font-mono font-semibold">
                          <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-orange-400' : 'text-emerald-600'}`} />
                          <span>Branch Quota: {plan.maxBranches} isolated {plan.maxBranches === 1 ? 'store' : 'stores'}</span>
                        </li>
                        <li className="flex items-center gap-2 font-mono font-semibold">
                          <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-orange-400' : 'text-emerald-600'}`} />
                          <span>Staff Seats: {plan.maxStaffSeats} operators · {plan.maxRecipes} recipes</span>
                        </li>
                        {plan.includedModules.map((mod) => (
                          <li key={mod} className="flex items-start gap-2">
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-orange-400' : 'text-emerald-600'}`} />
                            <span>{mod}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChoosePlan(plan.id)}
                      className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isPopular
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-neutral-950 hover:bg-neutral-800 text-white'
                      }`}
                    >
                      Start {plan.trialDays}-Day Trial on {plan.name}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Package Lifecycle Matrix */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-neutral-950">How Package Flow &amp; Provider Controls Connect</h3>
                  <p className="text-xs text-neutral-500">
                    System Providers manage prices, branch quotas, and public visibility directly from the Provider Console.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quickLaunchWorkspace('provider')}
                  className="text-xs font-bold text-orange-600 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Open Provider Packages Control &rarr;
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="font-mono font-bold text-neutral-900">1. Trial &rarr; Paid Renewal</div>
                  <p className="text-neutral-600 leading-relaxed">
                    Self-registered tenants start in trial status with full branch isolation until the System Provider records payment or activates billing.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="font-mono font-bold text-neutral-900">2. Branch Quota Guard</div>
                  <p className="text-neutral-600 leading-relaxed">
                    Tenants can add new branches inside Main HQ up to their subscribed package limit ({publicPlans.map((p) => `${p.name}: ${p.maxBranches}`).join(', ')}).
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="font-mono font-bold text-neutral-900">3. Instant Plan Upgrades</div>
                  <p className="text-neutral-600 leading-relaxed">
                    Upgrading a tenant on the Provider site immediately unlocks higher branch quotas and updates monthly recurring billing.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 4: CUSTOMERS & DEMO INQUIRY ================= */}
        {landingPage === 'customers' && (
          <section className="max-w-[1200px] mx-auto px-6 py-12 lg:py-16 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Left: Attributable Customer Case Studies */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-orange-600">Verified Tenant Deployments</div>
                  <h1
                    className="font-extrabold tracking-tight text-neutral-950 leading-[1.1]"
                    style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', textWrap: 'balance' }}
                  >
                    Trusted by multi-branch grill houses and fast-service operators.
                  </h1>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
                    <div className="text-xs font-mono text-neutral-500">
                      Savanna Hospitality Group · 3 Branches (Masaki HQ, City Centre, Arusha)
                    </div>
                    <p className="text-sm text-neutral-800 leading-relaxed">
                      &ldquo;Moving our Beef Stew Base and Wali Nyama recipes into RestaurantOS batch production eliminated unrecorded kitchen stock shrinkage across Masaki and City Centre, cutting food cost variance to under 1.8% within 60 days.&rdquo;
                    </p>
                    <div className="text-xs font-semibold text-neutral-950">
                      Abbakary Amary · Managing Director, Savanna Hospitality Group
                    </div>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
                    <div className="text-xs font-mono text-neutral-500">
                      Kona Fast Grill Group · 2 Branches (Sinza Main, Kariakoo Express)
                    </div>
                    <p className="text-sm text-neutral-800 leading-relaxed">
                      &ldquo;Before switching, counter M-Pesa settlements and potato sack usage across Sinza and Kariakoo lived in separate notebooks. Now Main HQ reconciles both branches every evening in under 5 minutes.&rdquo;
                    </p>
                    <div className="text-xs font-semibold text-neutral-950">
                      Fatma Mwinyi · Founder, Kona Fast Grill Group
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Validated Lead / Demo Request Form wired directly into Provider Control Site */}
              <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-neutral-950">Request Guided Multi-Branch Onboarding</h2>
                  <p className="text-xs text-neutral-500">
                    Submissions appear live inside the System Provider Accounts Control Site for instant tenant provisioning.
                  </p>
                </div>

                {leadSubmittedCompany && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                    <div className="font-bold">
                      Inquiry received for {leadSubmittedCompany}
                    </div>
                    <p>
                      Your onboarding request is queued inside the System Provider Control Console. Want to inspect it or provision immediately?
                    </p>
                    <button
                      type="button"
                      onClick={() => quickLaunchWorkspace('provider')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                    >
                      View in System Provider Control Site
                    </button>
                  </div>
                )}

                {leadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                    {leadError}
                  </div>
                )}

                <form onSubmit={handleLeadSubmit} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Restaurant / Group Name *</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Zanzibar Spice Kitchen"
                        className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Contact Name *</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Work Email *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@company.co.tz"
                        className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:outline-hidden focus:border-neutral-950"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Phone / WhatsApp</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+255 754 000 000"
                        className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:outline-hidden focus:border-neutral-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Branch Count</label>
                      <input
                        type="number"
                        min={1}
                        value={branchesCount}
                        onChange={(e) => setBranchesCount(e.target.value)}
                        className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:outline-hidden focus:border-neutral-950"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Target SaaS Plan</label>
                      <select
                        value={planInterest}
                        onChange={(e) => setPlanInterest(e.target.value as SaasPlanId)}
                        className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                      >
                        {publicPlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Operational Notes</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe POS counters, BOM kitchens, or catering volumes..."
                      className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Submit Onboarding Inquiry
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ================= QUIET FOOTER ================= */}
      <footer className="bg-white border-t border-neutral-200 py-10 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-neutral-500">
          <div className="space-y-1">
            <div className="text-sm font-extrabold text-neutral-950">RestaurantOS</div>
            <div>Multi-Tenant Hospitality ERP, POS, Recipe BOM &amp; System Provider Control</div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium text-neutral-700">
            <button type="button" onClick={() => navigateLanding('home')} className="hover:text-neutral-950 cursor-pointer">
              Overview
            </button>
            <button type="button" onClick={() => navigateLanding('solutions')} className="hover:text-neutral-950 cursor-pointer">
              Solutions
            </button>
            <button type="button" onClick={() => navigateLanding('pricing')} className="hover:text-neutral-950 cursor-pointer">
              Pricing
            </button>
            <button type="button" onClick={() => navigateLanding('customers')} className="hover:text-neutral-950 cursor-pointer">
              Customers
            </button>
            <button type="button" onClick={() => setPlatformSurface('login')} className="hover:text-neutral-950 cursor-pointer">
              Sign In
            </button>
            <button type="button" onClick={() => setPlatformSurface('register')} className="hover:text-neutral-950 cursor-pointer">
              Register Tenant
            </button>
            <button
              type="button"
              onClick={() => quickLaunchWorkspace('provider')}
              className="text-orange-600 font-semibold hover:underline cursor-pointer"
            >
              System Provider Console
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
