import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from 'lucide-react';
import { ResilientImage } from '../ui/ResilientImage';
import { useAdminCatalogue } from '../../context/AdminCatalogueContext';
import { useAuth } from '../../context/AuthContext';
import {
  AdminAuthExpiredError,
  createAdminProduct,
  deleteAdminMediaAsset,
  updateAdminProduct,
  uploadAdminMediaAsset,
} from '../../services/adminApi';
import { isProductAvailable, type Product } from '../../types/catalogue';

interface StagedPhotoItem {
  key: string;
  kind: 'existing' | 'local';
  previewUrl: string;
  file?: File;
}

interface AdminProductFormProps {
  mode: 'create' | 'edit';
  initialProduct?: Product;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_RAW_FILE_BYTES = 10 * 1024 * 1024; // 10 MB before compression, 4 MB server cap

async function prepareFileForUpload(
  file: File
): Promise<{ filename: string; mimeType: string; dataBase64: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`"${file.name}" is unsupported. Please choose JPG, PNG, or WebP images.`);
  }

  // Direct base64 if file is already <= 1.8 MB (stays comfortably below Vercel 4.5 MB serverless body limit)
  if (file.size <= 1.8 * 1024 * 1024) {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Unable to read "${file.name}".`));
      reader.readAsDataURL(file);
    });
    return {
      filename: file.name,
      mimeType: file.type,
      dataBase64,
    };
  }

  // Smooth client-side resize to <= 1600px JPEG so large studio photos fit cleanly under 4 MB
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Unable to process "${file.name}".`));
      element.src = objectUrl;
    });

    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas unavailable for image optimization.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    return {
      filename: file.name.replace(/\.[^.]+$/, '.jpg'),
      mimeType: 'image/jpeg',
      dataBase64: compressedDataUrl,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AdminProductForm({ mode, initialProduct }: AdminProductFormProps) {
  const { categories, syncAfterMutation } = useAdminCatalogue();
  const { getIdToken, signOutUser } = useAuth();
  const navigate = useNavigate();

  const [categoryId, setCategoryId] = useState<string>(initialProduct?.category_id ?? '');
  const [title, setTitle] = useState<string>(initialProduct?.title ?? initialProduct?.name ?? '');
  const [description, setDescription] = useState<string>(initialProduct?.description ?? '');
  const [photos, setPhotos] = useState<StagedPhotoItem[]>(() =>
    (initialProduct?.image_urls ?? []).map((url, idx) => ({
      key: `existing-${idx}-${url}`,
      kind: 'existing',
      previewUrl: url,
    }))
  );
  const [priceInput, setPriceInput] = useState<string>(
    initialProduct ? String(initialProduct.price_inr) : ''
  );
  const [sku, setSku] = useState<string>(initialProduct?.sku ?? '');
  const [finish, setFinish] = useState<string>(initialProduct?.variants?.finish ?? '');
  const [sizesInput, setSizesInput] = useState<string>(
    initialProduct?.variants?.sizes?.join(', ') ?? ''
  );
  const [availability, setAvailability] = useState<'available' | 'unavailable'>(() =>
    initialProduct
      ? isProductAvailable(initialProduct.availability_status)
        ? 'available'
        : 'unavailable'
      : 'available'
  );
  const [publishingStatus, setPublishingStatus] = useState<'published' | 'draft'>(() =>
    initialProduct ? (initialProduct.is_published ? 'published' : 'draft') : 'published'
  );
  const [isFeatured, setIsFeatured] = useState<boolean>(initialProduct?.is_featured ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    percent: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Default to first available category in create mode once categories load
  useEffect(() => {
    if (mode === 'create' && !categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [mode, categoryId, categories]);

  // Revoke any local preview blob URLs on unmount
  useEffect(() => {
    const trackedUrls = objectUrlsRef.current;
    return () => {
      trackedUrls.forEach((url) => URL.revokeObjectURL(url));
      trackedUrls.clear();
    };
  }, []);

  const parsedPrice = useMemo(() => {
    const trimmed = priceInput.trim();
    if (!trimmed) return NaN;
    // Reject scientific notation or negative signs
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return NaN;
    return Number(trimmed);
  }, [priceInput]);

  const isFormValid = useMemo(() => {
    const hasCategory = Number.isInteger(Number(categoryId)) && Number(categoryId) > 0;
    const cleanTitle = title.trim();
    const hasValidTitle = cleanTitle.length >= 3 && cleanTitle.length <= 160;
    const hasValidDescription = description.trim().length >= 5;
    const hasPhotos = photos.length > 0;
    const hasValidPrice =
      Number.isFinite(parsedPrice) && parsedPrice >= 0 && parsedPrice <= 100_000_000;

    return hasCategory && hasValidTitle && hasValidDescription && hasPhotos && hasValidPrice;
  }, [categoryId, title, description, photos.length, parsedPrice]);

  const handleSelectPhotoFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    setFormError(null);
    const nextItems: StagedPhotoItem[] = [];

    for (const file of Array.from(fileList)) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setFormError(
          `"${file.name}" is not a supported image format. Please upload JPG, PNG, or WebP files.`
        );
        event.target.value = '';
        return;
      }
      if (file.size > MAX_RAW_FILE_BYTES) {
        setFormError(`"${file.name}" exceeds the 10 MB maximum file size.`);
        event.target.value = '';
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      nextItems.push({
        key: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'local',
        previewUrl,
        file,
      });
    }

    setPhotos((prev) => [...prev, ...nextItems]);
    event.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed?.kind === 'local') {
        URL.revokeObjectURL(removed.previewUrl);
        objectUrlsRef.current.delete(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    setPhotos((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      if (item) {
        copy.splice(toIndex, 0, item);
      }
      return copy;
    });
  };

  const handleSetMainPhoto = (index: number) => {
    if (index === 0) return;
    handleMovePhoto(index, 0);
  };

  const resetForAnotherProduct = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();

    setCategoryId(categories[0]?.id ?? '');
    setTitle('');
    setDescription('');
    setPhotos([]);
    setPriceInput('');
    setSku('');
    setFinish('');
    setSizesInput('');
    setAvailability('available');
    setPublishingStatus('published');
    setIsFeatured(false);
    setFormError(null);
    setUploadProgress(null);
    setCreatedProduct(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return; // Prevent duplicate clicks

    setFormError(null);

    const numericCategoryId = Number(categoryId);
    const cleanTitle = title.trim().replace(/\s+/g, ' ');
    const cleanDescription = description.trim();

    if (!Number.isInteger(numericCategoryId) || numericCategoryId <= 0) {
      setFormError('Please select a category.');
      return;
    }
    if (cleanTitle.length < 3 || cleanTitle.length > 160) {
      setFormError('Product title must be between 3 and 160 characters.');
      return;
    }
    if (cleanDescription.length < 5) {
      setFormError('Please provide a product description (at least 5 characters).');
      return;
    }
    if (photos.length === 0) {
      setFormError('Please select at least one product photo.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError('Please enter a valid non-negative price in INR.');
      return;
    }

    setSubmitting(true);
    const newlyUploadedAssetIds: number[] = [];

    try {
      const localCount = photos.filter((p) => p.kind === 'local').length;
      let uploadedSoFar = 0;

      if (localCount > 0) {
        setUploadProgress({ current: 0, total: localCount, percent: 5 });
      }

      const resolvedImageUrls: string[] = [];

      for (const item of photos) {
        if (item.kind === 'existing') {
          resolvedImageUrls.push(item.previewUrl);
        } else if (item.file) {
          const prepared = await prepareFileForUpload(item.file);
          const uploaded = await uploadAdminMediaAsset(getIdToken, prepared);
          if (uploaded.id > 0) {
            newlyUploadedAssetIds.push(uploaded.id);
          }
          resolvedImageUrls.push(uploaded.url);
          uploadedSoFar += 1;
          setUploadProgress({
            current: uploadedSoFar,
            total: localCount,
            percent: Math.round((uploadedSoFar / localCount) * 100),
          });
        }
      }

      const sizes = sizesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        categoryId: numericCategoryId,
        title: cleanTitle,
        description: cleanDescription,
        imageUrls: resolvedImageUrls,
        priceInr: Math.round(parsedPrice),
        sku: sku.trim() || null,
        availabilityStatus: availability,
        isPublished: publishingStatus === 'published',
        isFeatured: publishingStatus === 'published' ? isFeatured : false,
        finish: finish.trim() || null,
        sizes,
      };

      if (mode === 'create') {
        const saved = await createAdminProduct(getIdToken, payload);
        await syncAfterMutation(
          saved.is_published
            ? `"${saved.title}" has been published to the Rooprani catalogue.`
            : `"${saved.title}" has been saved as a draft.`
        );
        setCreatedProduct(saved);
      } else if (initialProduct) {
        const targetId = initialProduct.numeric_id ?? Number(initialProduct.id);
        const updated = await updateAdminProduct(getIdToken, targetId, payload);
        await syncAfterMutation(`Changes to "${updated.title}" have been saved.`);
        navigate('/admin/products');
      }
    } catch (err) {
      // Clean up any newly uploaded files if the subsequent upload or DB write failed
      if (newlyUploadedAssetIds.length > 0) {
        await Promise.all(
          newlyUploadedAssetIds.map((assetId) => deleteAdminMediaAsset(getIdToken, assetId))
        );
      }

      if (err instanceof AdminAuthExpiredError) {
        await signOutUser();
        navigate('/account', { replace: true });
        return;
      }

      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to save product. Your entered details have been preserved.'
      );
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (mode === 'create' && createdProduct) {
    return (
      <div className="bg-[#FFFDFA] border border-[#E2D8C8] p-8 sm:p-10 max-w-2xl space-y-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="w-6 h-6 text-[#8C6B3C] stroke-[1.75] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#221A15]">
              {createdProduct.is_published ? 'Product Published' : 'Draft Saved'}
            </h2>
            <p className="text-sm text-[#5A4E44] leading-relaxed">
              <span className="font-medium text-[#221A15]">{createdProduct.title}</span> has been
              saved to your cloud catalogue database under{' '}
              <span className="font-medium text-[#221A15]">{createdProduct.category_name}</span>.
              {createdProduct.is_published &&
              isProductAvailable(createdProduct.availability_status)
                ? ' It is now live in the public Rooprani catalogue.'
                : ' Because it is marked as a draft or unavailable, it remains hidden from public enquiry.'}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#EAE1D3] flex flex-wrap items-center gap-3">
          <Link
            to="/admin/products"
            className="px-6 py-3 min-h-[44px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.16em] uppercase font-medium hover:bg-[#3A2D25] transition-colors inline-flex items-center justify-center whitespace-nowrap"
          >
            View All Products
          </Link>

          <button
            type="button"
            onClick={resetForAnotherProduct}
            className="px-6 py-3 min-h-[44px] border border-[#C8B9A3] bg-transparent text-xs tracking-[0.16em] uppercase text-[#221A15] hover:border-[#221A15] transition-colors cursor-pointer whitespace-nowrap"
          >
            Add Another Product
          </button>

          {createdProduct.is_published &&
            isProductAvailable(createdProduct.availability_status) && (
              <Link
                to={`/products/${createdProduct.slug}`}
                className="px-4 py-3 min-h-[44px] text-xs tracking-[0.16em] uppercase text-[#7A5B30] hover:text-[#221A15] transition-colors inline-flex items-center whitespace-nowrap"
              >
                View Live Page →
              </Link>
            )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-[#FFFDFA] border border-[#E2D8C8] p-6 sm:p-8 lg:p-10 max-w-4xl space-y-7"
    >
      {formError && (
        <div
          role="alert"
          className="border border-[#E5B8B2] bg-[#FDF2F0] px-4 py-3.5 text-sm text-[#8C2318] flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#9F2D20]" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      {/* FIELD 1 — Select Category */}
      <div>
        <label
          htmlFor="product-category-select"
          className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
        >
          1. Select Category <span className="text-[#9F2D20]">*</span>
        </label>
        <select
          id="product-category-select"
          required
          disabled={submitting || categories.length === 0}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full min-h-[46px] bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-2.5 text-sm text-[#221A15] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
        >
          {categories.length === 0 ? (
            <option value="">No categories available — create a category first</option>
          ) : (
            <>
              <option value="" disabled>
                Choose a jewellery category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* FIELD 2 — Product Title */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label
            htmlFor="product-title-input"
            className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36]"
          >
            2. Product Title <span className="text-[#9F2D20]">*</span>
          </label>
          <span className="text-xs text-[#7D7064] tabular-nums">
            {title.trim().length}/160
          </span>
        </div>
        <input
          id="product-title-input"
          type="text"
          required
          maxLength={160}
          disabled={submitting}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Rajwada Polki & Pearl Choker"
          className="w-full min-h-[46px] bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-2.5 text-sm text-[#221A15] placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
        />
      </div>

      {/* FIELD 3 — Product Description */}
      <div>
        <label
          htmlFor="product-description-input"
          className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
        >
          3. Product Description <span className="text-[#9F2D20]">*</span>
        </label>
        <textarea
          id="product-description-input"
          rows={4}
          required
          disabled={submitting}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe craftsmanship, plating, stones, dimensions, and styling details..."
          className="w-full bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-3 text-sm text-[#221A15] placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
        />
      </div>

      {/* FIELD 4 — Product Photos */}
      <div className="space-y-4 pt-2 border-t border-[#EAE1D3]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36]">
              4. Product Photos <span className="text-[#9F2D20]">*</span>
            </span>
            <p className="text-xs text-[#6B5E53] mt-1">
              Supports JPG, PNG, and WebP. The first photo is used as the main product thumbnail.
            </p>
          </div>

          <label
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] border border-[#8C6B3C] bg-[#FBF7EE] text-xs tracking-[0.14em] uppercase font-medium text-[#3B2D1D] hover:bg-[#231B16] hover:text-[#F6F1E9] hover:border-[#231B16] transition-colors whitespace-nowrap ${
              submitting ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
            }`}
          >
            <ImagePlus className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
            <span>Select Photos</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={submitting}
              onChange={handleSelectPhotoFiles}
              className="sr-only"
            />
          </label>
        </div>

        {/* Upload Progress Bar */}
        {uploadProgress && (
          <div className="space-y-1.5 bg-[#FAF6F0] border border-[#E2D8C8] p-3.5">
            <div className="flex items-center justify-between text-xs text-[#4A3F36] tabular-nums">
              <span>
                Uploading photo {uploadProgress.current} of {uploadProgress.total}...
              </span>
              <span>{uploadProgress.percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#E6DDD0] overflow-hidden">
              <div
                className="h-full bg-[#8C6B3C] transition-all duration-200"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Photo Preview & Reordering Grid */}
        {photos.length === 0 ? (
          <div className="border border-dashed border-[#CFC2AE] bg-[#FAF6F0] py-10 px-4 text-center">
            <p className="text-sm text-[#5A4E44]">No product photos selected yet.</p>
            <p className="text-xs text-[#7D7064] mt-1">
              Upload one or more clear photographs of the jewellery piece.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.key}
                className={`border bg-[#FAF6F0] p-2 flex flex-col justify-between ${
                  index === 0 ? 'border-[#8C6B3C]' : 'border-[#DED4C5]'
                }`}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EFE8DC]">
                  <ResilientImage
                    src={photo.previewUrl}
                    alt={`Product preview ${index + 1}`}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute top-2 left-2 bg-[#231B16]/90 text-[#F6F1E9] px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase font-medium">
                      Main Thumbnail
                    </span>
                  )}
                </div>

                <div className="pt-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={submitting || index === 0}
                        onClick={() => handleMovePhoto(index, index - 1)}
                        aria-label={`Move photo ${index + 1} earlier`}
                        className="w-7 h-7 border border-[#D5C9B8] flex items-center justify-center text-[#4A3F36] hover:border-[#221A15] disabled:opacity-35 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={submitting || index === photos.length - 1}
                        onClick={() => handleMovePhoto(index, index + 1)}
                        aria-label={`Move photo ${index + 1} later`}
                        className="w-7 h-7 border border-[#D5C9B8] flex items-center justify-center text-[#4A3F36] hover:border-[#221A15] disabled:opacity-35 cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemovePhoto(index)}
                      aria-label={`Remove photo ${index + 1}`}
                      className="w-7 h-7 border border-[#D5C9B8] flex items-center justify-center text-[#8C2318] hover:bg-[#FDF2F0] hover:border-[#9F2D20] disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {index > 0 && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSetMainPhoto(index)}
                      className="w-full py-1 text-[11px] tracking-[0.1em] uppercase text-[#7A5B30] hover:text-[#221A15] border-t border-[#E6DDD0] inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Star className="w-3 h-3" aria-hidden="true" />
                      <span>Set as Main</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FIELD 5 — Product Price & Optional Product Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-[#EAE1D3]">
        <div>
          <label
            htmlFor="product-price-input"
            className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
          >
            5. Product Price (INR ₹) <span className="text-[#9F2D20]">*</span>
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#6B5E53]"
            >
              ₹
            </span>
            <input
              id="product-price-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              disabled={submitting}
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="2490"
              className="w-full min-h-[46px] bg-[#FAF6F0] border border-[#D5C9B8] pl-9 pr-4 py-2.5 text-sm text-[#221A15] tabular-nums placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="product-sku-input"
            className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
          >
            Product Code / SKU (Optional)
          </label>
          <input
            id="product-sku-input"
            type="text"
            disabled={submitting}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. RR-BG-205"
            className="w-full min-h-[46px] bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-2.5 text-sm text-[#221A15] placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      {/* Optional Finish & Sizes Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="product-finish-input"
            className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
          >
            Finish / Material Detail (Optional)
          </label>
          <input
            id="product-finish-input"
            type="text"
            disabled={submitting}
            value={finish}
            onChange={(e) => setFinish(e.target.value)}
            placeholder="e.g. Antique Champagne Gold"
            className="w-full min-h-[44px] bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-2 text-sm text-[#221A15] placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="product-sizes-input"
            className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
          >
            Sizes (Optional, comma-separated)
          </label>
          <input
            id="product-sizes-input"
            type="text"
            disabled={submitting}
            value={sizesInput}
            onChange={(e) => setSizesInput(e.target.value)}
            placeholder="e.g. 2.4, 2.6, 2.8 or Adjustable"
            className="w-full min-h-[44px] bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-2 text-sm text-[#221A15] placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      {/* FIELD 7 — Availability & Publishing Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-[#EAE1D3]">
        <div>
          <label
            htmlFor="product-availability-select"
            className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
          >
            7. Availability <span className="text-[#9F2D20]">*</span>
          </label>
          <select
            id="product-availability-select"
            disabled={submitting}
            value={availability}
            onChange={(e) => setAvailability(e.target.value as 'available' | 'unavailable')}
            className="w-full min-h-[46px] bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-2.5 text-sm text-[#221A15] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
          >
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="product-publishing-select"
            className="block text-xs tracking-[0.15em] uppercase font-medium text-[#4A3F36] mb-2"
          >
            Publishing Status <span className="text-[#9F2D20]">*</span>
          </label>
          <select
            id="product-publishing-select"
            disabled={submitting}
            value={publishingStatus}
            onChange={(e) => setPublishingStatus(e.target.value as 'published' | 'draft')}
            className="w-full min-h-[46px] bg-[#FAF6F0] border border-[#D5C9B8] px-4 py-2.5 text-sm text-[#221A15] focus:border-[#8C6B3C] focus:outline-none transition-colors disabled:opacity-60"
          >
            <option value="published">Published (Visible on Website)</option>
            <option value="draft">Draft (Hidden from Public Catalogue)</option>
          </select>
        </div>
      </div>

      {publishingStatus === 'published' && (
        <div>
          <label className="inline-flex items-center gap-2.5 text-sm text-[#4A3F36] cursor-pointer">
            <input
              type="checkbox"
              disabled={submitting}
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 accent-[#8C6B3C]"
            />
            <span>Highlight as the Featured Piece on the Rooprani Homepage</span>
          </label>
        </div>
      )}

      {/* FIELD 9 — Add Product / Save Changes Button */}
      <div className="pt-5 border-t border-[#EAE1D3] flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/admin/products"
          className="px-5 py-3 min-h-[46px] border border-[#D5C9B8] text-xs tracking-[0.15em] uppercase text-[#4A3F36] hover:border-[#221A15] hover:text-[#221A15] transition-colors inline-flex items-center justify-center whitespace-nowrap"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={!isFormValid || submitting}
          className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[48px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.18em] uppercase font-medium hover:bg-[#3A2D25] transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
              <span>{mode === 'create' ? 'Saving Product...' : 'Updating Product...'}</span>
            </>
          ) : (
            <span>{mode === 'create' ? 'Add Product' : 'Save Changes'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
