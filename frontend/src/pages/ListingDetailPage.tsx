import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  MessageSquare,
  ShieldAlert,
  Package,
  Edit3,
  CheckCircle2,
  Trash2,
  Share2,
  AlertCircle,
  Loader2,
  UserCheck,
  Bookmark,
} from 'lucide-react';
import { marketplaceService } from '@/services/marketplaceService';
import { useAuthStore } from '@/store/useAuthStore';
import { useSavedListingsStore } from '@/store/useSavedListingsStore';
import { ListingDetailDto } from '@/types';
import { EditListingModal } from '@/components/marketplace/EditListingModal';
import { getFullImageUrl } from '@/utils/imageUrl';
import { formatHostelName } from '@/constants/hostels';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const savedIds = useSavedListingsStore((s) => s.savedIds);
  const toggleSave = useSavedListingsStore((s) => s.toggleSave);
  const fetchSavedIds = useSavedListingsStore((s) => s.fetchSavedIds);
  const isSaved = Boolean(id && savedIds.includes(id));

  const [listing, setListing] = useState<ListingDetailDto | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await marketplaceService.getListingById(id);
        setListing(data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Listing not found or has been removed');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (currentUser) {
      fetchSavedIds();
    }
  }, [currentUser, fetchSavedIds]);

  const isSeller = Boolean(currentUser?.id && listing?.seller?.id === currentUser.id);
  const isAdmin = currentUser?.role === 'ADMIN';
  const isSold = listing?.status === 'SOLD';

  const formatPrice = (price?: number) => {
    if (price === undefined) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleMarkAsSold = async () => {
    if (!listing) return;
    try {
      setActionLoading(true);
      const updated = await marketplaceService.markAsSold(listing.id);
      setListing(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark listing as sold');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!listing) return;
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await marketplaceService.deleteListing(listing.id);
      navigate('/marketplace');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete listing');
      setActionLoading(false);
    }
  };

  const handleInitiateChat = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: `/marketplace/${listing?.id}` } } });
      return;
    }
    if (!listing?.seller?.id) return;
    try {
      setActionLoading(true);
      const conv = await marketplaceService.initiateListingChat(listing.id, listing.seller.id);
      navigate(`/chat?conversationId=${conv.id}`);
    } catch {
      navigate('/chat');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-[#20251F]" />
        <p className="mt-3 text-sm text-[#20251F]/60">Loading item details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#20251F]">Listing Unavailable</h2>
        <p className="mt-2 text-sm text-[#20251F]/70">
          {error || 'This listing may have been deleted or does not exist.'}
        </p>
        <button
          onClick={() => navigate('/marketplace')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#20251F] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#323930] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </button>
      </div>
    );
  }

  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const currentImageUrl = images[activeImageIndex]?.imageUrl;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/marketplace')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </button>

        <div className="flex items-center gap-2">
          {!isSeller && (
            <button
              onClick={() => {
                if (!currentUser) {
                  navigate('/login', { state: { from: { pathname: `/marketplace/${listing.id}` } } });
                  return;
                }
                toggleSave(listing.id).catch(() => {});
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isSaved
                  ? 'border-[#A3D65C] bg-[#A3D65C]/25 text-[#20251F]'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-[#20251F]' : ''}`} />
              {isSaved ? 'Saved' : 'Save Item'}
            </button>
          )}
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copiedLink ? 'Link Copied!' : 'Share Listing'}
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery on left, Details & Seller on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Gallery (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Photo View */}
          <div className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {currentImageUrl ? (
              <img
                src={getFullImageUrl(currentImageUrl)}
                alt={listing.title}
                className={`h-full w-full object-contain bg-slate-950/5 dark:bg-slate-950/40 ${isSold ? 'grayscale contrast-75' : ''
                  }`}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                <Package className="h-16 w-16 stroke-[1.5]" />
                <span className="mt-2 text-sm font-medium">No photo available</span>
              </div>
            )}

            {/* SOLD Overlay */}
            {isSold && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px]">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2 text-sm font-extrabold tracking-widest text-white uppercase shadow-xl border border-red-400">
                  <CheckCircle2 className="h-5 w-5" />
                  ITEM SOLD
                </span>
              </div>
            )}

            {/* Category Pill */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-md shadow">
                {listing.category}
              </span>
            </div>
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-square h-18 sm:h-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${activeImageIndex === idx
                      ? 'border-[#A3D65C] shadow-md scale-95'
                      : 'border-[#B7BEB2]/50 opacity-70 hover:opacity-100'
                    }`}
                >
                  <img src={getFullImageUrl(img.imageUrl)} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Safety Notice Banner */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 flex items-start space-x-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-semibold text-sm">Offline Settlement Policy</div>
              <p className="leading-relaxed">
                {listing.offlinePaymentDisclaimer ||
                  'Payments in v1 are settled directly offline between users.'}{' '}
                Inspect all goods in person on campus (library, cafeteria, or hostel reception) before handing
                over payment. Never make advance payments.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Listing Details & Seller Actions (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl border border-[#B7BEB2]/60 bg-white p-6 shadow-sm space-y-4">
            {/* Price and Condition */}
            <div className="flex items-center justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-[#20251F]">
                {formatPrice(listing.price)}
              </span>
              <span className="rounded-md border border-[#B7BEB2]/60 bg-[#E6E9E3] px-3 py-1 text-xs font-semibold text-[#20251F]">
                Condition: {listing.condition}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-[#20251F] leading-snug">
              {listing.title}
            </h1>

            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#20251F]/60 pt-2 border-t border-[#B7BEB2]/30">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#20251F]/50 shrink-0" />
                <span>{formatHostelName(listing.hostel)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#20251F]/50 shrink-0" />
                <span>
                  Listed {new Date(listing.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-[#B7BEB2]/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#20251F]/50 mb-2">
                Item Description
              </h3>
              <p className="text-sm text-[#20251F]/80 whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Seller Profile Card (NO phone number!) */}
          <div className="rounded-2xl border border-[#B7BEB2]/60 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#20251F]/50 mb-3">
              Seller Information
            </h3>
            <div className="flex items-center space-x-3.5">
              {listing.seller?.profilePictureUrl ? (
                <img
                  src={getFullImageUrl(listing.seller.profilePictureUrl)}
                  alt={listing.seller.name}
                  className="h-12 w-12 rounded-full object-cover border border-[#B7BEB2]/60"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E6E9E3] font-bold text-[#20251F] border border-[#B7BEB2]/60 text-base">
                  {listing.seller?.name ? listing.seller.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-sm font-semibold text-[#20251F] truncate">
                    {listing.seller?.name || 'Thapar Student'}
                  </h4>
                  <UserCheck className="h-4 w-4 text-[#20251F] shrink-0" />
                </div>
                <p className="text-xs text-[#20251F]/60 mt-0.5 truncate">
                  Resident of {formatHostelName(listing.seller?.hostel || listing.hostel)}
                </p>
              </div>
            </div>

            {/* Buyer CTA: Direct Chat */}
            {!isSeller && !isSold && (
              <button
                onClick={handleInitiateChat}
                disabled={actionLoading}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#A3D65C] px-5 py-3 text-sm font-bold text-[#20251F] shadow-xs hover:bg-[#92c949] disabled:opacity-50 transition"
              >
                <MessageSquare className="h-4 w-4" />
                Chat with Seller
              </button>
            )}

            {!isSeller && isSold && (
              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-center text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                This item has been sold and is no longer available.
              </div>
            )}
          </div>

          {/* Seller / Admin Management Actions */}
          {(isSeller || isAdmin) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {isSeller ? 'Seller Management Controls' : 'Admin Controls'}
              </h3>

              {isSeller && !isSold && (
                <button
                  onClick={handleMarkAsSold}
                  disabled={actionLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Sold
                </button>
              )}

              {isSeller && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  disabled={actionLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Listing Details
                </button>
              )}

              <button
                onClick={handleDeleteListing}
                disabled={actionLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 transition"
              >
                <Trash2 className="h-4 w-4" />
                {isAdmin && !isSeller ? 'Remove Listing (Admin)' : 'Delete Listing'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Listing Modal */}
      {editModalOpen && listing && (
        <EditListingModal
          isOpen={editModalOpen}
          listing={listing}
          onClose={() => setEditModalOpen(false)}
          onSuccess={(updated) => {
            setListing(updated);
          }}
        />
      )}
    </div>
  );
};
