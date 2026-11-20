import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantTenant, SaasPlanId } from '../../types/restaurant';

export const AuthPortalView: React.FC = () => {
  const {
    platformSurface,
    setPlatformSurface,
    selectedRegisterPlan,
    saasPlans,
    loginWithCredentials,
    registerTenantAccount,
    quickLaunchWorkspace,
    formatMoney,
  } = useRestaurant();

  const availablePlans = saasPlans.filter((p) => p.status === 'active');

  const isRegister = platformSurface === 'register';

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('abbakaryamary@gmail.com');
  const [loginPassword, setLoginPassword] = useState('savanna123');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Tenant state
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [plan, setPlan] = useState<SaasPlanId>(selectedRegisterPlan || availablePlans[0]?.id || 'Growth');
  useEffect(() => {
    if (selectedRegisterPlan) {
      setPlan(selectedRegisterPlan);
    }
  }, [selectedRegisterPlan]);
  const activeSelectedPlan =
    availablePlans.find((p) => p.id === plan || p.name === plan) || availablePlans[0];
  const [operatingModel, setOperatingModel] =
    useState<RestaurantTenant['operatingModel']>('dine_in_restaurant');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('HQ-01');
  const [phone, setPhone] = useState('+255 754 000 000');
  const [address, setAddress] = useState('Dar es Salaam, Tanzania');
  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = loginWithCredentials(loginEmail, loginPassword);
    if (!res.success) {
      setLoginError(res.error || 'Authentication failed.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const res = registerTenantAccount({
      orgName,
      ownerName,
      ownerEmail,
      password: regPassword,
      plan,
      operatingModel,
      branchName: branchName || `${orgName.trim()} — Main HQ`,
      branchCode: branchCode || 'HQ-01',
      phone,
      address,
    });
    if (!res.success) {
      setRegError(res.error || 'Could not register organization.');
    }
  };

  const presetCredentials = [
    {
      label: 'System Provider Admin',
      email: 'provider@restaurantos.io',
      pass: 'provider123',
      scope: 'Provider Accounts Control Site',
    },
    {
      label: 'Savanna Group Main HQ',
      email: 'abbakaryamary@gmail.com',
      pass: 'savanna123',
      scope: 'Multi-Branch HQ (3 Branches)',
    },
    {
      label: 'City Centre Branch Manager',
      email: 'grace.nyerere@savannagrill.co.tz',
      pass: 'branch123',
      scope: 'Branch Isolated Terminal (SAV-CBD)',
    },
    {
      label: 'Kona Fast Grill Owner',
      email: 'fatma.mwinyi@konachips.co.tz',
      pass: 'kona123',
      scope: 'Isolated Tenant (2 Branches)',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-sans flex flex-col">
      {/* Clean Top Bar */}
      <header className="bg-white border-b border-neutral-200 px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => setPlatformSurface('landing')}
          className="text-lg font-extrabold tracking-tight text-neutral-950 whitespace-nowrap shrink-0 cursor-pointer"
        >
          RestaurantOS
        </button>

        <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setPlatformSurface('landing')}
            className="text-neutral-600 hover:text-neutral-950 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Site</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatformSurface(isRegister ? 'login' : 'register')}
            className="px-4 py-2 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
          >
            {isRegister ? 'Sign In Instead' : 'Register Tenant'}
          </button>
        </div>
      </header>

      {/* Main Split Auth Canvas */}
      <div className="flex-1 max-w-[1160px] w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Context & Quick Demo Access */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-orange-600">
              {isRegister ? 'New Tenant Onboarding' : 'Platform Authentication'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 leading-tight">
              {isRegister
                ? 'Launch an isolated hospitality workspace for your group.'
                : 'Sign in to Provider Control, Main HQ, or your Branch terminal.'}
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {isRegister
                ? 'Your organization receives private branches, POS counters, BOM recipe storage, and branch mailboxes—completely isolated from other tenants.'
                : 'Access routes automatically by account role: System Providers open the Provider Control Site; Owners open Main HQ; Managers open their assigned branch.'}
            </p>
          </div>

          {/* Preset Accounts Directory for Instant Verification */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                <span>Quick-Fill Verified Accounts</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">Click to fill</span>
            </div>

            <div className="divide-y divide-neutral-100">
              {presetCredentials.map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => {
                    setPlatformSurface('login');
                    setLoginEmail(cred.email);
                    setLoginPassword(cred.pass);
                    setLoginError(null);
                  }}
                  className="w-full py-2.5 text-left hover:bg-neutral-50 rounded-lg px-2 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900 truncate">{cred.label}</div>
                    <div className="text-[11px] font-mono text-neutral-500 truncate">
                      {cred.email} · {cred.scope}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-orange-600 shrink-0">Use</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => quickLaunchWorkspace('provider')}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                One-Click Provider Site
              </button>
              <button
                type="button"
                onClick={() => quickLaunchWorkspace('savanna_hq')}
                className="flex-1 py-2 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold cursor-pointer"
              >
                One-Click Savanna HQ
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8">
          {/* Segmented Mode Switch */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg mb-6 w-fit">
            <button
              type="button"
              onClick={() => setPlatformSurface('login')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                !isRegister ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setPlatformSurface('register')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                isRegister ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Register Tenant
            </button>
          </div>

          {!isRegister ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-950">Sign in to your account</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Enter your System Provider or Hospitality Tenant credentials.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                  {loginError}
                </div>
              )}

              <div className="space-y-1.5 text-xs">
                <label className="block font-semibold text-neutral-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="abbakaryamary@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-sm focus:outline-hidden focus:border-neutral-950"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="block font-semibold text-neutral-700">Password</label>
                <div className="relative">
                  <input
                    type={showLoginPwd ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2.5 pr-10 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-sm focus:outline-hidden focus:border-neutral-950"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd((v) => !v)}
                    aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 cursor-pointer"
                  >
                    {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Sign In to Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Tenant isolation enforced on login
                </span>
                <button
                  type="button"
                  onClick={() => setPlatformSurface('register')}
                  className="font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  New restaurant group? Register
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-950">Register New Restaurant Tenant</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Starts immediately with an isolated 14-day trial organization, flagship branch, and owner mailbox.
                </p>
              </div>

              {regError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                  {regError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Organization / Group Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Serengeti Bistro Group"
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Asha Suleiman"
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Owner Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="asha@serengetibistro.co.tz"
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Account Password *</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">Flagship HQ Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Serengeti Bistro — Oysterbay HQ"
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    placeholder="HQ-01"
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono uppercase focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Operating Model</label>
                  <select
                    value={operatingModel}
                    onChange={(e) => setOperatingModel(e.target.value as RestaurantTenant['operatingModel'])}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                  >
                    <option value="dine_in_restaurant">Dine-In Restaurant</option>
                    <option value="fast_food_chips">Fast Food &amp; Counter Grill</option>
                    <option value="cafe_bistro">Cafe &amp; Bistro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Subscription Package</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as SaasPlanId)}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                  >
                    {availablePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatMoney(p.monthlyFeeTzs)}/mo · {p.maxBranches} branches)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeSelectedPlan && (
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-neutral-950">
                      Selected Package: {activeSelectedPlan.name}
                    </span>
                    <span className="font-mono font-bold text-orange-600">
                      {activeSelectedPlan.trialDays}-Day Trial &rarr; {formatMoney(activeSelectedPlan.monthlyFeeTzs)}/mo
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-600">
                    Quotas: {activeSelectedPlan.maxBranches} Branches · {activeSelectedPlan.maxStaffSeats} Staff Seats · {activeSelectedPlan.maxRecipes} BOM Recipes
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Includes: {activeSelectedPlan.includedModules.join(' · ')}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Business Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">City / Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-neutral-950"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Create Tenant &amp; Launch Workspace</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
