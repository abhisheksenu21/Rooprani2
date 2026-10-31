import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  Edit3,
  ExternalLink,
  Loader2,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { ResilientImage } from '../../components/ui/ResilientImage';
import { useAdminCatalogue } from '../../context/AdminCatalogueContext';
import { useAuth } from '../../context/AuthContext';
import { useDocumentMetadata } from '../../hooks/useDocumentMetadata';
import {
  buildCustomerDirectWhatsAppLink,
  formatInrPrice,
} from '../../lib/whatsapp/buildWhatsAppUrl';
import {
  fetchAdminSupabaseStatus,
  triggerAdminSupabaseSync,
  updateAdminEnquiryStatus,
  type SupabaseStatusResponse,
} from '../../services/adminApi';
import { isProductAvailable } from '../../types/catalogue';

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

const VERCEL_ENV_TEMPLATE = `VITE_SUPABASE_URL=https://gszzzhfzysxtjncmbkjc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VWVwWVIi7WrHY6TOs_DSaA_vKpUMinh
SUPABASE_URL=https://gszzzhfzysxtjncmbkjc.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_VWVwWVIi7WrHY6TOs_DSaA_vKpUMinh
SESSION_SECRET=rooprani_production_hmac_secret_2026_secure`;

export function AdminOverviewPage() {
  const { summary, products, enquiries, loading, error, reloadAdminData, showNotice } =
    useAdminCatalogue();
  const { getIdToken } = useAuth();
  const [updatingEnquiryId, setUpdatingEnquiryId] = useState<number | null>(null);

  const [sbStatus, setSbStatus] = useState<SupabaseStatusResponse | null>(null);
  const [sbLoading, setSbLoading] = useState(true);
  const [sbSyncing, setSbSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedVercelEnv, setCopiedVercelEnv] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);

  useDocumentMetadata({
    title: 'Dashboard — Rooprani Admin',
    description:
      'Overview of Rooprani jewellery catalogue metrics, customer orders, Supabase database sync, and Vercel deployment readiness.',
  });

  const loadSupabaseStatus = useCallback(async () => {
    setSbLoading(true);
    try {
      const res = await fetchAdminSupabaseStatus(getIdToken);
      setSbStatus(res);
    } catch {
      // Non-fatal diagnostics check
    } finally {
      setSbLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadSupabaseStatus();
  }, [loadSupabaseStatus]);

  const handleCopySql = async () => {
    const sqlText = sbStatus?.diagnostics.migrationSql;
    if (!sqlText) return;
    try {
      await navigator.clipboard.writeText(sqlText);
      setCopiedSql(true);
      showNotice(
        'success',
        'Supabase SQL schema copied. Paste and click Run in your Supabase SQL Editor.'
      );
      window.setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      showNotice(
        'error',
        'Unable to copy automatically. Open supabase/migrations/001_rooprani_catalogue_and_rls.sql.'
      );
    }
  };

  const handleCopyVercelEnv = async () => {
    try {
      await navigator.clipboard.writeText(VERCEL_ENV_TEMPLATE);
      setCopiedVercelEnv(true);
      showNotice(
        'success',
        'Vercel Environment Variables template copied. Paste into Vercel Project Settings -> Environment Variables.'
      );
      window.setTimeout(() => setCopiedVercelEnv(false), 3000);
    } catch {
      showNotice('error', 'Unable to copy automatically. Copy the variables from the panel below.');
    }
  };

  const handleSyncSupabase = async () => {
    setSbSyncing(true);
    try {
      const result = await triggerAdminSupabaseSync(getIdToken);
      setSbStatus({
        diagnostics: result.diagnostics,
        pendingOrderSyncCount: result.pendingOrderSyncCount,
        architecture: result.architecture,
      });
      showNotice(
        'success',
        `Cloud sync complete (${result.syncedProductsCount} product(s), ${result.syncedCategoriesCount} categor(ies), ${result.syncedOrdersCount} order(s), ${result.syncedUsersCount} login(s)).`
      );
    } catch (err) {
      await loadSupabaseStatus();
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Unable to sync with Supabase yet.'
      );
    } finally {
      setSbSyncing(false);
    }
  };

  const recentProducts = products.slice(0, 6);
  const recentEnquiries = enquiries.slice(0, 10);
  const arch = sbStatus?.architecture;

  const handleStatusChange = async (enquiryId: number, status: string) => {
    setUpdatingEnquiryId(enquiryId);
    try {
      await updateAdminEnquiryStatus(getIdToken, enquiryId, status);
      await reloadAdminData();
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Unable to update enquiry status.'
      );
    } finally {
      setUpdatingEnquiryId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#8C6B3C] font-medium">
            Overview
          </p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-normal text-[#221A15]">
            Catalogue &amp; Orders Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            void reloadAdminData();
            void loadSupabaseStatus();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] border border-[#D5C9B8] bg-[#FFFDFA] text-xs tracking-[0.14em] uppercase text-[#4A3F36] hover:border-[#221A15] hover:text-[#221A15] transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 stroke-[1.6] ${loading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="border border-[#E5B8B2] bg-[#FDF2F0] px-4 py-3 text-sm text-[#8C2318]"
        >
          {error}
        </div>
      )}

      {/* 4 Summary Cards from Live Database */}
      <section aria-label="Catalogue summary metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#E2D8C8] bg-[#FFFDFA] divide-y sm:divide-y-0 sm:divide-x divide-[#E2D8C8]">
          <div className="p-6">
            <p className="text-xs tracking-[0.14em] uppercase text-[#6B5E53]">Total Products</p>
            <p className="mt-2 font-serif text-4xl text-[#221A15] tabular-nums">
              {loading ? '—' : summary.totalProducts}
            </p>
          </div>

          <div className="p-6">
            <p className="text-xs tracking-[0.14em] uppercase text-[#6B5E53]">
              Published Products
            </p>
            <p className="mt-2 font-serif text-4xl text-[#1F5E3B] tabular-nums">
              {loading ? '—' : summary.publishedProducts}
            </p>
          </div>

          <div className="p-6">
            <p className="text-xs tracking-[0.14em] uppercase text-[#6B5E53]">Customer Orders</p>
            <p className="mt-2 font-serif text-4xl text-[#8C6B3C] tabular-nums">
              {loading ? '—' : enquiries.length}
            </p>
          </div>

          <div className="p-6">
            <p className="text-xs tracking-[0.14em] uppercase text-[#6B5E53]">Total Categories</p>
            <p className="mt-2 font-serif text-4xl text-[#221A15] tabular-nums">
              {loading ? '—' : summary.totalCategories}
            </p>
          </div>
        </div>
      </section>

      {/* Cloud Database, Supabase Sync & Vercel Serverless Architecture Panel */}
      <section aria-labelledby="supabase-connection-heading">
        <div className="border border-[#E2D8C8] bg-[#FFFDFA] p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B5E53]">
                <Database className="w-4 h-4 text-[#8C6B3C] stroke-[1.6]" aria-hidden="true" />
                <span className="uppercase tracking-[0.16em] text-[#8C6B3C] font-medium">
                  Cloud Backend &amp; Vercel Engine
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-xs text-[#4A3F36]">
                  {sbStatus?.diagnostics.projectId || 'gszzzhfzysxtjncmbkjc'}
                </span>
                {arch && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#4A3F36]">
                      {arch.primaryDatabase === 'postgresql'
                        ? `PostgreSQL (${arch.postgresSource}) + Supabase Sync`
                        : 'Supabase Cloud Primary'}
                    </span>
                  </>
                )}
                {!sbLoading && sbStatus && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        sbStatus.diagnostics.authReachable
                          ? 'text-[#1F5E3B] font-medium'
                          : 'text-[#9F2D20] font-medium'
                      }
                    >
                      {sbStatus.diagnostics.authReachable
                        ? sbStatus.diagnostics.tablesReady
                          ? 'Vercel & Cloud Tables Ready'
                          : 'Connected · Run 1-Step SQL Setup'
                        : 'Unreachable'}
                    </span>
                  </>
                )}
              </div>

              <h2
                id="supabase-connection-heading"
                className="font-serif text-2xl font-normal text-[#221A15]"
              >
                {sbStatus?.diagnostics.tablesReady
                  ? 'Scalable Cloud Database & Vercel Serverless API Active'
                  : 'Complete 1-Step Cloud Table Setup for Supabase & Vercel'}
              </h2>

              <p className="text-xs sm:text-sm text-[#6B5E53] max-w-3xl leading-relaxed">
                {sbStatus?.diagnostics.tablesReady
                  ? 'Catalogue categories, products, images, customer logins, and orders automatically persist to Supabase Cloud and remain live across Vercel Serverless deployments.'
                  : 'Your backend is pre-built with Vercel Serverless API routing (/api/index.js + vercel.json) and dual PostgreSQL/Supabase persistence. Run the SQL schema once in your Supabase SQL Editor so products, images, logins, and orders persist permanently on Vercel.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {!sbStatus?.diagnostics.tablesReady && sbStatus?.diagnostics.migrationSql && (
                <button
                  type="button"
                  onClick={() => void handleCopySql()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.14em] uppercase font-medium hover:bg-[#3A2D25] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span>Copied SQL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span>1. Copy SQL Schema</span>
                    </>
                  )}
                </button>
              )}

              <a
                href={
                  sbStatus?.diagnostics.sqlEditorUrl ||
                  'https://supabase.com/dashboard/project/gszzzhfzysxtjncmbkjc/sql/new'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] border border-[#D5C9B8] bg-[#FAF6F0] text-xs tracking-[0.14em] uppercase text-[#221A15] hover:border-[#221A15] transition-colors whitespace-nowrap"
              >
                <span>
                  {sbStatus?.diagnostics.tablesReady ? 'Open Supabase' : '2. Open SQL Editor'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[1.6]" aria-hidden="true" />
              </a>

              <button
                type="button"
                disabled={sbSyncing || sbLoading}
                onClick={() => void handleSyncSupabase()}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] border border-[#8C6B3C] text-xs tracking-[0.14em] uppercase text-[#221A15] hover:bg-[#FAF6F0] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {sbSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <span>
                    {sbStatus?.diagnostics.tablesReady
                      ? `Sync Catalogue & Orders (${sbStatus.pendingOrderSyncCount} pending)`
                      : '3. Verify & Sync'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {sbStatus && (
            <div className="pt-3 border-t border-[#EAE1D3] flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B5E53]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-[#4A3F36]">Cloud Schema:</span>
                {(
                  [
                    ['profiles', sbStatus.diagnostics.tables.profiles],
                    ['user_logins', sbStatus.diagnostics.tables.user_logins],
                    ['orders', sbStatus.diagnostics.tables.orders],
                    ['enquiries', sbStatus.diagnostics.tables.enquiries],
                    ['categories', sbStatus.diagnostics.tables.categories],
                    ['products', sbStatus.diagnostics.tables.products],
                    ['product-images', sbStatus.diagnostics.storageBucketReady],
                  ] as const
                ).map(([name, ready], idx) => (
                  <span key={name} className="inline-flex items-center gap-1">
                    {idx > 0 && (
                      <span className="text-[#C8BCAE] mr-1.5" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <span className="font-mono">{name}</span>
                    <span className={ready ? 'text-[#1F5E3B]' : 'text-[#8C6B3C]'}>
                      ({ready ? 'ready' : 'pending SQL'})
                    </span>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowVercelGuide((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs tracking-[0.12em] uppercase text-[#7A5B30] hover:text-[#221A15] transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Vercel Deployment Config</span>
                {showVercelGuide ? (
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
          )}

          {showVercelGuide && (
            <div className="pt-4 border-t border-[#EAE1D3] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-[#5A4E44] leading-relaxed">
                  <span className="font-medium text-[#1F5E3B]">
                    Zero-Config GitHub → Vercel Ready:
                  </span>{' '}
                  You can push to GitHub and deploy directly on Vercel with{' '}
                  <span className="font-medium text-[#221A15]">zero Environment Variables</span>{' '}
                  required (<span className="font-mono">vercel.json</span> +{' '}
                  <span className="font-mono">api/index.js</span> + built-in Supabase Cloud defaults).
                  The template below is purely optional if you ever add a custom PostgreSQL pooler:
                </p>

                <button
                  type="button"
                  onClick={() => void handleCopyVercelEnv()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] border border-[#D5C9B8] bg-[#FAF6F0] text-xs tracking-[0.12em] uppercase text-[#221A15] hover:border-[#221A15] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  {copiedVercelEnv ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#1F5E3B]" aria-hidden="true" />
                      <span>Copied Optional Env</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy Optional Env</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-[#FAF6F0] border border-[#DED4C5] p-3.5 text-xs font-mono text-[#3B2F26] overflow-x-auto leading-relaxed">
                {VERCEL_ENV_TEMPLATE}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* Customer Orders & Enquiries Section */}
      <section aria-labelledby="recent-enquiries-heading" className="space-y-4">
        <div>
          <h2
            id="recent-enquiries-heading"
            className="font-serif text-2xl sm:text-3xl font-normal text-[#221A15]"
          >
            Customer Orders &amp; Enquiries
          </h2>
          <p className="text-xs text-[#6B5E53] mt-0.5">
            Purchase orders and WhatsApp enquiries submitted by customers
          </p>
        </div>

        <div className="border border-[#E2D8C8] bg-[#FFFDFA]">
          {recentEnquiries.length === 0 ? (
            <div className="py-10 px-6 text-center text-sm text-[#6B5E53]">
              No customer orders have been submitted yet. When a visitor submits the Buy / Enquiry
              form on any jewellery piece, their contact and order details appear here and sync to
              Supabase.
            </div>
          ) : (
            <div className="divide-y divide-[#EAE1D3]">
              {recentEnquiries.map((enquiry) => {
                const replyUrl = buildCustomerDirectWhatsAppLink({
                  customerPhone: enquiry.customer_phone,
                  customerName: enquiry.customer_name,
                  productName: enquiry.product_name,
                });

                return (
                  <div
                    key={enquiry.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#6B5E53]">
                        <span className="font-medium text-[#221A15]">{enquiry.customer_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{enquiry.customer_phone}</span>
                        <span aria-hidden="true">·</span>
                        <span>{enquiry.customer_email}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatShortDate(enquiry.created_at)}</span>
                      </div>
                      <p className="text-sm font-medium text-[#221A15]">
                        {enquiry.product_name}
                        {enquiry.product_price_inr !== null
                          ? ` — ${formatInrPrice(enquiry.product_price_inr)}`
                          : ''}
                        {enquiry.preferred_size ? ` · Size ${enquiry.preferred_size}` : ''}
                      </p>
                      {enquiry.notes && (
                        <p className="text-xs text-[#6B5E53]">Note: {enquiry.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <select
                        aria-label={`Status for ${enquiry.customer_name}`}
                        disabled={updatingEnquiryId === enquiry.id}
                        value={enquiry.status}
                        onChange={(e) => void handleStatusChange(enquiry.id, e.target.value)}
                        className="min-h-[40px] bg-[#FAF6F0] border border-[#D5C9B8] px-3 py-1.5 text-xs text-[#221A15] focus:border-[#8C6B3C] focus:outline-none"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="completed">Completed</option>
                      </select>

                      {replyUrl && (
                        <a
                          href={replyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.12em] uppercase hover:bg-[#3A2D25] transition-colors whitespace-nowrap"
                        >
                          <span>Reply</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Recent Products Section */}
      <section aria-labelledby="recent-products-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="recent-products-heading"
              className="font-serif text-2xl sm:text-3xl font-normal text-[#221A15]"
            >
              Recent Products
            </h2>
            <p className="text-xs text-[#6B5E53] mt-0.5">
              Latest additions and updates in the Rooprani catalogue
            </p>
          </div>

          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs tracking-[0.14em] uppercase text-[#7A5B30] hover:text-[#221A15] transition-colors whitespace-nowrap"
          >
            <span>All Products</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="border border-[#E2D8C8] bg-[#FFFDFA]">
          {loading ? (
            <div className="divide-y divide-[#EAE1D3]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-16 bg-[#EFE8DC] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-[#EFE8DC]" />
                    <div className="h-3 w-32 bg-[#EFE8DC]" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentProducts.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-4">
              <p className="font-serif text-2xl text-[#221A15]">No products in catalogue yet.</p>
              <p className="text-sm text-[#6B5E53]">
                Add your first jewellery piece to publish it on the Rooprani website.
              </p>
              <Link
                to="/admin/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.16em] uppercase font-medium hover:bg-[#3A2D25] transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Add First Product</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2D8C8] bg-[#FAF6F0] text-[11px] tracking-[0.15em] uppercase text-[#6B5E53]">
                    <th className="py-3.5 px-5 font-medium">Product</th>
                    <th className="py-3.5 px-4 font-medium">Category</th>
                    <th className="py-3.5 px-4 font-medium text-right">Price</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE1D3] text-sm">
                  {recentProducts.map((product) => {
                    const available = isProductAvailable(product.availability_status);
                    return (
                      <tr key={product.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3.5 min-w-[200px]">
                            <div className="w-11 h-14 shrink-0 overflow-hidden border border-[#DED4C5] bg-[#EFE8DC]">
                              <ResilientImage
                                src={product.image_urls[0] ?? ''}
                                alt={product.title}
                                containerClassName="w-full h-full"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#221A15] truncate max-w-[260px]">
                                {product.title}
                              </p>
                              <p className="text-xs text-[#7D7064] tabular-nums">
                                Updated {formatShortDate(product.updated_at)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#4A3F36] whitespace-nowrap">
                          {product.category_name}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#221A15] tabular-nums whitespace-nowrap">
                          {formatInrPrice(product.price_inr)}
                        </td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <span
                            className={
                              product.is_published
                                ? 'text-[#1F5E3B] font-medium'
                                : 'text-[#8C6B3C] font-medium'
                            }
                          >
                            {product.is_published ? 'Published' : 'Draft'}
                          </span>
                          <span className="text-[#9E9284] mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span className={available ? 'text-[#4A3F36]' : 'text-[#9F2D20]'}>
                            {available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] border border-[#D5C9B8] text-xs tracking-[0.12em] uppercase text-[#221A15] hover:border-[#221A15] transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
