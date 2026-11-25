import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Edit3,
  Trash2,
  ExternalLink,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { ListingDetailDto, ListingSummaryDto } from '@/types';
import { marketplaceService } from '@/services/marketplaceService';
import { getFullImageUrl } from '@/utils/imageUrl';
import { EditListingModal } from '@/components/marketplace/EditListingModal';

interface MyListingsTabProps {
  listings: ListingSummaryDto[];
  loading: boolean;
  onRefresh: () => void;
}

export const MyListingsTab: React.FC<MyListingsTabProps> = ({
  listings,
  loading,
  onRefresh,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<ListingDetailDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);

  const handleMarkSold = async (id: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      await marketplaceService.markAsSold(id);
      onRefresh();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Could not mark item as sold.');
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenEdit = async (id: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      const detail = await marketplaceService.getListingById(id);
      setEditingDetail(detail);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to load listing details.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      await marketplaceService.deleteListing(id);
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to delete listing.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#20251F]/60">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading your listings...</span>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#B7BEB2] bg-[#F6F7F5] py-12 px-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6E9E3] text-[#20251F]">
          <Package className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-[#20251F]">No marketplace listings yet</h3>
        <p className="mt-1 text-xs text-[#20251F]/65 max-w-sm mx-auto">
          Got a cycle, calculator, or textbooks to pass on? List them on the campus marketplace.
        </p>
        <Link
          to="/marketplace"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#A3D65C] px-4 py-2 text-xs font-semibold text-[#20251F] hover:bg-[#92c949] transition"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Go to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {actionError}
        </div>
      )}

      {listings.map((item) => {
        const isSold = item.status === 'SOLD';
        const isBusy = busyId === item.id;
        return (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#B7BEB2]/60 bg-[#F6F7F5] p-3.5 transition hover:border-[#20251F]/35"
          >
            <Link to={`/marketplace/${item.id}`} className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#B7BEB2]/50 bg-[#E6E9E3]">
                {item.primaryImageUrl ? (
                  <img
                    src={getFullImageUrl(item.primaryImageUrl)}
                    alt={item.title}
                    className={`h-full w-full object-cover ${isSold ? 'grayscale opacity-70' : ''}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#20251F]/40">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-[#20251F] truncate">{item.title}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      isSold
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-[#A3D65C]/30 text-[#20251F] border border-[#A3D65C]/70'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-extrabold text-[#20251F]">
                  {formatPrice(item.price)}
                  <span className="ml-2 font-medium text-[#20251F]/60">• {item.category}</span>
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Link
                to={`/marketplace/${item.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[#B7BEB2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-[#E6E9E3] transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Link>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleOpenEdit(item.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#B7BEB2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-[#E6E9E3] disabled:opacity-50 transition"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>

              {!isSold && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleMarkSold(item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Sold
                </button>
              )}

              {confirmDeleteId === item.id ? (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg border border-[#B7BEB2] bg-white px-2 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-[#E6E9E3] transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}

      {editingDetail && (
        <EditListingModal
          isOpen={true}
          listing={editingDetail}
          onClose={() => setEditingDetail(null)}
          onSuccess={() => {
            setEditingDetail(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
