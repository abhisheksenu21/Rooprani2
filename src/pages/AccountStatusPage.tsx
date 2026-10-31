import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { BlurReveal } from '../components/ui/BlurReveal';
import { useAuth } from '../context/AuthContext';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import {
  buildEnquiryWithCustomerDetailsMessage,
  buildWhatsAppLink,
  formatInrPrice,
} from '../lib/whatsapp/buildWhatsAppUrl';

function formatEnquiryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function formatStatusText(status: string): string {
  switch (status) {
    case 'contacted':
      return 'Contacted';
    case 'completed':
      return 'Completed';
    default:
      return 'New Order';
  }
}

export function AccountStatusPage() {
  const navigate = useNavigate();
  const {
    firebaseUser,
    profile,
    enquiries,
    isAdmin,
    loading,
    googleAuthAvailable,
    authError,
    clearAuthError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOutUser,
    saveProfile,
  } = useAuth();

  // Auth form state (when signed out)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [localAuthError, setLocalAuthError] = useState<string | null>(null);

  // Profile edit state (when signed in)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useDocumentMetadata({
    title: firebaseUser ? 'My Profile — Rooprani' : 'Profile Sign In — Rooprani',
    description:
      'Sign in to your Rooprani profile to save your contact details and view your jewellery orders.',
  });

  useEffect(() => {
    setFullName(profile?.fullName || firebaseUser?.displayName || '');
    setPhone(profile?.phone || '');
  }, [profile, firebaseUser]);

  // If an authorized administrator opens Profile while signed in, direct straight to /admin
  if (!loading && firebaseUser && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleEmailAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingAuth || signingInGoogle) return;

    clearAuthError();
    setLocalAuthError(null);

    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalAuthError('Please enter a valid email address.');
      return;
    }

    if (!loginPassword) {
      setLocalAuthError('Please enter your password.');
      return;
    }

    setSubmittingAuth(true);
    try {
      if (authMode === 'signin') {
        const result = await signInWithEmail(trimmedEmail, loginPassword);
        if (result.ok && result.isAdmin) {
          navigate('/admin', { replace: true });
        }
      } else {
        if (signupName.trim().length < 2) {
          setLocalAuthError('Please enter your full name.');
          return;
        }
        if (signupPhone.trim()) {
          const digits = signupPhone.replace(/[^\d]/g, '');
          if (digits.length < 8 || digits.length > 15) {
            setLocalAuthError('Please enter a valid 10-digit mobile number.');
            return;
          }
        }
        if (loginPassword.length < 6) {
          setLocalAuthError('Password must be at least 6 characters long.');
          return;
        }

        const result = await signUpWithEmail({
          fullName: signupName.trim(),
          phone: signupPhone.trim(),
          email: trimmedEmail,
          password: loginPassword,
        });

        if (result.ok && result.isAdmin) {
          navigate('/admin', { replace: true });
        }
      }
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (submittingAuth || signingInGoogle) return;
    clearAuthError();
    setLocalAuthError(null);
    setSigningInGoogle(true);
    try {
      const result = await signInWithGoogle();
      if (result.ok && result.isAdmin) {
        navigate('/admin', { replace: true });
      }
    } finally {
      setSigningInGoogle(false);
    }
  };

  const handleSaveDetails = async (event: FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    setSaveMessage(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      setSaveError('Please enter your full name.');
      return;
    }

    if (trimmedPhone) {
      const digits = trimmedPhone.replace(/[^\d]/g, '');
      if (digits.length < 8 || digits.length > 15) {
        setSaveError('Please enter a valid 10-digit phone number.');
        return;
      }
    }

    setSaving(true);
    try {
      await saveProfile({ fullName: trimmedName, phone: trimmedPhone });
      setSaveMessage('Your profile details have been saved.');
      window.setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  const displayedAuthError = localAuthError || authError;

  return (
    <section className="pt-28 sm:pt-36 pb-24 sm:pb-32 px-4 sm:px-8 lg:px-12 bg-background">
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="border border-border-subtle bg-surface/50 p-10 sm:p-14 flex items-center justify-center gap-3 text-sm text-muted">
            <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
            <span>Loading your profile...</span>
          </div>
        ) : !firebaseUser ? (
          <div className="border border-border-subtle bg-surface/50 p-6 sm:p-12">
            <BlurReveal>
              <div className="flex items-center gap-2.5 text-xs tracking-[0.22em] text-primary mb-3">
                <UserIcon className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
                <span>ROOPRANI ACCOUNT</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground leading-tight text-balance">
                {authMode === 'signin'
                  ? 'Sign in to your account.'
                  : 'Create your Rooprani profile.'}
              </h1>

              <p className="mt-3 text-sm font-light text-foreground/85 leading-relaxed max-w-xl">
                Sign in with your email and password to save your contact details for effortless
                jewellery enquiries and view your order history.
              </p>

              {/* Interactive Mode Switcher */}
              <div className="mt-7 inline-flex border border-border-subtle bg-background p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    clearAuthError();
                    setLocalAuthError(null);
                  }}
                  className={`px-5 py-2.5 min-h-[40px] text-xs tracking-[0.18em] uppercase transition-colors cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    clearAuthError();
                    setLocalAuthError(null);
                  }}
                  className={`px-5 py-2.5 min-h-[40px] text-xs tracking-[0.18em] uppercase transition-colors cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {displayedAuthError && (
                <div
                  role="alert"
                  className="mt-6 border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs sm:text-sm text-amber-200"
                >
                  {displayedAuthError}
                </div>
              )}

              <form onSubmit={handleEmailAuthSubmit} noValidate className="mt-6 space-y-5">
                {authMode === 'signup' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="account-signup-name"
                        className="block text-xs tracking-[0.16em] text-muted uppercase mb-2"
                      >
                        Full Name *
                      </label>
                      <input
                        id="account-signup-name"
                        type="text"
                        autoComplete="name"
                        required
                        disabled={submittingAuth || signingInGoogle}
                        value={signupName}
                        onChange={(e) => {
                          setSignupName(e.target.value);
                          if (localAuthError) setLocalAuthError(null);
                        }}
                        placeholder="Your full name"
                        className="w-full min-h-[46px] bg-background border border-border-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted/55 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="account-signup-phone"
                        className="block text-xs tracking-[0.16em] text-muted uppercase mb-2"
                      >
                        Phone / WhatsApp Number
                      </label>
                      <input
                        id="account-signup-phone"
                        type="tel"
                        autoComplete="tel"
                        disabled={submittingAuth || signingInGoogle}
                        value={signupPhone}
                        onChange={(e) => {
                          setSignupPhone(e.target.value);
                          if (localAuthError) setLocalAuthError(null);
                        }}
                        placeholder="+91 98765 43210"
                        className="w-full min-h-[46px] bg-background border border-border-subtle px-4 py-2.5 text-sm text-foreground tabular-nums placeholder:text-muted/55 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="account-login-email"
                      className="block text-xs tracking-[0.16em] text-muted uppercase mb-2"
                    >
                      Email Address *
                    </label>
                    <input
                      id="account-login-email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={submittingAuth || signingInGoogle}
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        if (localAuthError) setLocalAuthError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full min-h-[46px] bg-background border border-border-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted/55 focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="account-login-password"
                      className="block text-xs tracking-[0.16em] text-muted uppercase mb-2"
                    >
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        id="account-login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                        required
                        disabled={submittingAuth || signingInGoogle}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (localAuthError) setLocalAuthError(null);
                        }}
                        placeholder={
                          authMode === 'signin' ? 'Enter your password' : 'At least 6 characters'
                        }
                        className="w-full min-h-[46px] bg-background border border-border-subtle pl-4 pr-12 py-2.5 text-sm text-foreground placeholder:text-muted/55 focus:border-primary focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={submittingAuth || signingInGoogle}
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[46px] bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
                  >
                    {submittingAuth ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>
                          {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                        </span>
                      </>
                    ) : (
                      <span>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    )}
                  </button>

                  {googleAuthAvailable && (
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      disabled={submittingAuth || signingInGoogle}
                      className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[46px] border border-border-subtle bg-background/60 text-xs tracking-[0.18em] uppercase text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
                    >
                      {signingInGoogle ? (
                        <>
                          <Loader2
                            className="w-4 h-4 animate-spin text-primary"
                            aria-hidden="true"
                          />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <span>Continue with Google</span>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </BlurReveal>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Customer Personal Details Card */}
            <div className="border border-border-subtle bg-surface/50 p-6 sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-border-subtle">
                <div>
                  <p className="text-xs tracking-[0.22em] text-primary mb-2">MY PROFILE</p>
                  <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground leading-tight">
                    {profile?.fullName || firebaseUser.displayName || 'Your Details'}
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-muted">
                    {profile?.email || firebaseUser.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] border border-border-subtle text-xs tracking-[0.16em] text-muted hover:text-foreground hover:border-primary/60 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
                  <span>SIGN OUT</span>
                </button>
              </div>

              <form onSubmit={handleSaveDetails} className="pt-6 space-y-5">
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Keep your contact details updated so your name, phone number, and email are
                  automatically filled whenever you enquire to buy a piece.
                </p>

                {saveError && (
                  <div
                    role="alert"
                    className="border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs sm:text-sm text-amber-200"
                  >
                    {saveError}
                  </div>
                )}

                {saveMessage && (
                  <div
                    role="status"
                    className="border border-primary/40 bg-background/80 px-4 py-3 text-xs sm:text-sm text-primary flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
                    <span>{saveMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="profile-full-name"
                      className="block text-xs tracking-[0.16em] text-muted uppercase mb-2"
                    >
                      Full Name *
                    </label>
                    <input
                      id="profile-full-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full min-h-[44px] bg-background border border-border-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs tracking-[0.16em] text-muted uppercase mb-2"
                    >
                      Phone / WhatsApp Number
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full min-h-[44px] bg-background border border-border-subtle px-4 py-2.5 text-sm text-foreground tabular-nums placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-xs tracking-[0.16em] text-muted uppercase mb-2"
                  >
                    Account Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    readOnly
                    value={profile?.email || firebaseUser.email || ''}
                    className="w-full min-h-[44px] bg-background/50 border border-border-subtle px-4 py-2.5 text-sm text-muted cursor-not-allowed"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[46px] bg-primary text-primary-foreground text-xs tracking-[0.2em] font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>SAVING...</span>
                      </>
                    ) : (
                      <span>SAVE PROFILE DETAILS</span>
                    )}
                  </button>

                  <Link
                    to="/#collection"
                    className="text-xs tracking-[0.18em] text-muted hover:text-primary transition-colors uppercase"
                  >
                    Browse Jewellery →
                  </Link>
                </div>
              </form>
            </div>

            {/* Past Jewellery Orders & Enquiries */}
            <div className="border border-border-subtle bg-surface/40 p-6 sm:p-10">
              <div className="pb-5 border-b border-border-subtle">
                <p className="text-xs tracking-[0.22em] text-primary mb-1.5">ORDER HISTORY</p>
                <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground">
                  Your jewellery orders &amp; enquiries.
                </h2>
              </div>

              {enquiries.length === 0 ? (
                <div className="py-10 text-center space-y-4">
                  <p className="text-sm text-muted">
                    You have not placed any jewellery orders or enquiries yet.
                  </p>
                  <Link
                    to="/#collection"
                    className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] border border-primary/60 text-xs tracking-[0.18em] text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    DISCOVER THE COLLECTION
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {enquiries.map((item) => {
                    const followupText = buildEnquiryWithCustomerDetailsMessage({
                      product: null,
                      customerName: item.customer_name,
                      customerPhone: item.customer_phone,
                      customerEmail: item.customer_email,
                      notes: `Following up on my order enquiry for ${item.product_name}${
                        item.product_sku ? ` (${item.product_sku})` : ''
                      }${item.preferred_size ? `, Size: ${item.preferred_size}` : ''}.`,
                    });
                    const waHref = buildWhatsAppLink(followupText);

                    return (
                      <div
                        key={item.id}
                        className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                            <span className="text-primary">{formatStatusText(item.status)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatEnquiryDate(item.created_at)}</span>
                            {item.product_sku && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Code {item.product_sku}</span>
                              </>
                            )}
                          </div>

                          <p className="font-serif text-lg sm:text-xl text-foreground">
                            {item.product_name}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-2.5 text-xs text-muted tabular-nums">
                            {item.product_price_inr !== null && (
                              <span>{formatInrPrice(item.product_price_inr)}</span>
                            )}
                            {item.preferred_size && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Size {item.preferred_size}</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{item.customer_phone}</span>
                          </div>
                        </div>

                        {waHref && (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] border border-border-subtle text-xs tracking-[0.16em] text-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap self-start sm:self-center"
                          >
                            <span>OPEN IN WHATSAPP</span>
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
