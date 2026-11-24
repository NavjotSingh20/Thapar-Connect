import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  AlertCircle,
  Zap,
  Loader2,
  Check,
} from 'lucide-react';
import { cabService } from '@/services/cabService';
import { CreateCabRequest, CabGroupDetailDto, LocationSuggestion } from '@/types';

interface CreateCabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCab: CabGroupDetailDto) => void;
}

const POPULAR_DESTINATIONS: LocationSuggestion[] = [
  { name: 'Chandigarh Airport (IXC)', latitude: 30.6735, longitude: 76.7885 },
  { name: 'Delhi IGI Airport (DEL)', latitude: 28.5562, longitude: 77.1000 },
  { name: 'Patiala Railway Station', latitude: 30.3340, longitude: 76.3980 },
  { name: 'Patiala Bus Stand', latitude: 30.3256, longitude: 76.4022 },
  { name: 'Rajpura Junction', latitude: 30.4840, longitude: 76.5938 },
  { name: 'Ambala Cantt Railway Station', latitude: 30.3312, longitude: 76.8406 },
];

const DEFAULT_PICKUP: LocationSuggestion = {
  name: 'Thapar University Campus, Patiala',
  latitude: 30.3533,
  longitude: 76.3686,
};

export const CreateCabModal: React.FC<CreateCabModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pickupPoint, setPickupPoint] = useState(DEFAULT_PICKUP.name);
  const pickupCoords = {
    lat: DEFAULT_PICKUP.latitude,
    lng: DEFAULT_PICKUP.longitude,
  };

  const [dropPoint, setDropPoint] = useState('');
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number }>({
    lat: 30.6735,
    lng: 76.7885,
  });

  // Tomorrow morning default
  const defaultDeparture = new Date(Date.now() + 12 * 3600 * 1000);
  defaultDeparture.setMinutes(0, 0, 0);
  const minDateTimeStr = new Date().toISOString().slice(0, 16);

  const [departureDateTime, setDepartureDateTime] = useState(
    new Date(defaultDeparture.getTime() - defaultDeparture.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );

  const [totalSeats, setTotalSeats] = useState<number>(4);
  const [estimatedFare, setEstimatedFare] = useState<string>('450');
  const [autoJoinEnabled, setAutoJoinEnabled] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectDestination = (dest: LocationSuggestion) => {
    setDropPoint(dest.name);
    setDropCoords({ lat: dest.latitude, lng: dest.longitude });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dropPoint.trim()) {
      setError('Please select or specify a drop-point destination.');
      return;
    }

    const departureInstant = new Date(departureDateTime).toISOString();
    if (new Date(departureDateTime).getTime() <= Date.now()) {
      setError('Departure time must be in the future.');
      return;
    }

    const fareNumber = parseFloat(estimatedFare);
    if (isNaN(fareNumber) || fareNumber <= 0) {
      setError('Estimated fare per person must be greater than zero.');
      return;
    }

    if (totalSeats < 2 || totalSeats > 8) {
      setError('Total seats must be between 2 and 8.');
      return;
    }

    const payload: CreateCabRequest = {
      pickupPoint,
      pickupLat: pickupCoords.lat,
      pickupLng: pickupCoords.lng,
      dropPoint: dropPoint.trim(),
      dropLat: dropCoords.lat,
      dropLng: dropCoords.lng,
      departureTime: departureInstant,
      totalSeats,
      estimatedFare: fareNumber,
      note: note.trim() || undefined,
      autoJoinEnabled,
    };

    setLoading(true);
    try {
      const created = await cabService.createCabGroup(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create cab pool. Please check your inputs.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Create a Cab Pool
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share a ride with verified Thapar students and split the fare
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Pickup Point */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pickup Point
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-thapar-700 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="e.g. Thapar University Campus, Patiala"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Defaults to Thapar Main Campus
            </p>
          </div>

          {/* Drop Point Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Destination / Drop-off
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-thapar-700 dark:text-thapar-400" />
              <input
                type="text"
                value={dropPoint}
                onChange={(e) => setDropPoint(e.target.value)}
                required
                placeholder="Search destination (e.g. Chandigarh Airport, Delhi T3)"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-thapar-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Quick Hub Chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POPULAR_DESTINATIONS.map((dest) => (
                <button
                  type="button"
                  key={dest.name}
                  onClick={() => handleSelectDestination(dest)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    dropPoint === dest.name
                      ? 'bg-thapar-700 text-white dark:bg-thapar-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {dest.name}
                </button>
              ))}
            </div>
          </div>

          {/* Departure Date and Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Departure Date & Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="datetime-local"
                value={departureDateTime}
                min={minDateTimeStr}
                onChange={(e) => setDepartureDateTime(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-thapar-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Seats and Fare grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Seats */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Total Seats (including you)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTotalSeats((s) => Math.max(2, s - 1))}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  -
                </button>
                <div className="flex-1 text-center font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {totalSeats} seats
                </div>
                <button
                  type="button"
                  onClick={() => setTotalSeats((s) => Math.min(8, s + 1))}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  +
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                You count as 1 seat ({totalSeats - 1} available for peers)
              </p>
            </div>

            {/* Estimated Fare per person */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Estimated Fare / Person (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-semibold text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={estimatedFare}
                  onChange={(e) => setEstimatedFare(e.target.value)}
                  required
                  placeholder="500"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs text-slate-800 focus:border-thapar-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Settled directly between riders offline
              </p>
            </div>
          </div>

          {/* Auto-join Toggle */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoJoinEnabled}
                onChange={(e) => setAutoJoinEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-thapar-700 focus:ring-thapar-700 dark:border-slate-700 dark:bg-slate-900"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Instant Auto-Join
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Allow peers to join and confirm seats immediately without requiring manual approval for each request.
                </p>
              </div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ride Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Leaving from Hostel J, AC Sedan, enough boot space for 2 suitcases."
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-thapar-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Action CTAs */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-thapar-700 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-thapar-800 disabled:opacity-50 dark:bg-thapar-800 dark:hover:bg-thapar-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating Pool...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Publish Pool
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
