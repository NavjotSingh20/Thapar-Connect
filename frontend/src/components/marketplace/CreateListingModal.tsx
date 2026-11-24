import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, AlertCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { TIET_HOSTELS } from '@/constants/hostels';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '@/constants/marketplace';
import { marketplaceService } from '@/services/marketplaceService';
import { useAuthStore } from '@/store/useAuthStore';
import { ListingDetailDto, MarketplaceCategory, MarketplaceCondition } from '@/types';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newListing: ListingDetailDto) => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const currentUser = useAuthStore((state) => state.user);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('Cycle');
  const [condition, setCondition] = useState<MarketplaceCondition>('Used');
  const [price, setPrice] = useState<string>('');
  const [hostel, setHostel] = useState<string>(currentUser?.hostel || 'Hostel J');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (selectedImages.length + files.length > 5) {
      setError('You can upload a maximum of 5 photos.');
      return;
    }

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of files) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      // Validate MIME type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setError(`File "${file.name}" has an unsupported format. Use JPEG, PNG, or WebP.`);
        return;
      }

      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setError(null);
    setSelectedImages((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...validPreviews]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (selectedImages.length < 1) {
      setError('At least 1 photo is required (maximum 5 photos).');
      return;
    }
    if (selectedImages.length > 5) {
      setError('A maximum of 5 photos are allowed.');
      return;
    }

    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setError('Please enter a valid price greater than ₹0.');
      return;
    }
    if (numPrice > 1000000) {
      setError('Price cannot exceed ₹10,00,000.');
      return;
    }

    if (!title.trim()) {
      setError('Listing title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Item description is required.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('price', String(numPrice));
      formData.append('hostel', hostel || currentUser?.hostel || 'Hostel J');
      formData.append('description', description.trim());

      for (const image of selectedImages) {
        formData.append('images', image);
      }

      const created = await marketplaceService.createListing(formData);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create listing';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Post Item for Sale</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exclusively for Thapar Institute students & campus community
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="bg-amber-50 px-6 py-3 border-b border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/60 flex items-start space-x-2.5">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold">Campus Safety Notice:</span> Payments in v1 are settled directly
            offline between users. Always inspect items in person at a public campus location before exchanging
            cash or UPI.
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl bg-red-50 p-3.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo Upload Zone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-white">
                Photos <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedImages.length} of 5 photos added (1-5 required, max 5MB each)
              </span>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-5 gap-3 mb-3">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group bg-slate-100 dark:bg-slate-800"
                >
                  <img src={preview} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 rounded-full bg-red-600/90 p-1 text-white opacity-90 transition-opacity hover:opacity-100 shadow"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      Cover
                    </span>
                  )}
                </div>
              ))}

              {/* Add Photo Button */}
              {selectedImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 hover:border-[#20251F] bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <Upload className="h-5 w-5 text-slate-400 group-hover:text-[#20251F]" />
                  <span className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    + Add Photo
                  </span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              placeholder="e.g. Hero Mountain Bike 21-Speed, Casio fx-991EX Calculator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              >
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as MarketplaceCondition)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              >
                {MARKETPLACE_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Hostel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Price (INR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  required
                  placeholder="e.g. 1500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Hostel / Location
              </label>
              <select
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              >
                {TIET_HOSTELS.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe condition, reason for selling, inclusions, or pickup details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#A3D65C] hover:bg-[#92c949] px-6 py-2.5 text-sm font-bold text-[#20251F] shadow-xs disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
