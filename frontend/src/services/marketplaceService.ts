import { api, unwrapData } from './api';
import {
  ListingSummaryDto,
  ListingDetailDto,
  ListingFilterParams,
  UpdateListingFormData,
  PageResponse,
} from '@/types';

export const marketplaceService = {
  async getListings(params?: ListingFilterParams): Promise<PageResponse<ListingSummaryDto>> {
    const res = await api.get('/marketplace/listings', { params });
    const data = unwrapData<PageResponse<ListingSummaryDto>>(res);
    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
      };
    }
    return data;
  },

  async getListingById(id: string): Promise<ListingDetailDto> {
    const res = await api.get(`/marketplace/listings/${id}`);
    return unwrapData<ListingDetailDto>(res);
  },

  async createListing(formData: FormData): Promise<ListingDetailDto> {
    const res = await api.post('/marketplace/listings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapData<ListingDetailDto>(res);
  },

  async updateListing(id: string, data: UpdateListingFormData): Promise<ListingDetailDto> {
    const res = await api.put(`/marketplace/listings/${id}`, data);
    return unwrapData<ListingDetailDto>(res);
  },

  async markAsSold(id: string): Promise<ListingDetailDto> {
    const res = await api.patch(`/marketplace/listings/${id}/sold`, {});
    return unwrapData<ListingDetailDto>(res);
  },

  async deleteListing(id: string): Promise<void> {
    await api.delete(`/marketplace/listings/${id}`);
  },

  async getMyListings(page = 0, size = 20): Promise<PageResponse<ListingSummaryDto>> {
    const res = await api.get('/marketplace/listings/my-listings', {
      params: { page, size },
    });
    const data = unwrapData<PageResponse<ListingSummaryDto>>(res);
    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
      };
    }
    return data;
  },

  async initiateListingChat(listingId: string, recipientId: string): Promise<{ id: string }> {
    try {
      const res = await api.post('/chat/conversations', {
        contextType: 'LISTING',
        contextId: listingId,
        recipientId,
      });
      return unwrapData<{ id: string }>(res);
    } catch {
      return { id: `listing-${listingId}` };
    }
  },
};
