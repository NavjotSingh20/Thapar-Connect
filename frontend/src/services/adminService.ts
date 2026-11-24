import { api, unwrapData } from './api';
import {
  CabGroupDetailDto,
  ListingDetailDto,
  ReportDto,
  ReportStatus,
  UpdateReportStatusRequest,
  UserDto,
} from '@/types';

export const adminService = {
  async getReports(): Promise<ReportDto[]> {
    const res = await api.get('/admin/reports');
    const data = unwrapData<any>(res);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async updateReportStatus(id: string, status: ReportStatus): Promise<ReportDto> {
    const payload: UpdateReportStatusRequest = { status };
    const res = await api.patch(`/admin/reports/${id}`, payload);
    return unwrapData<ReportDto>(res);
  },

  async getListings(): Promise<ListingDetailDto[]> {
    const res = await api.get('/admin/listings');
    const data = unwrapData<any>(res);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async deleteListing(id: string): Promise<void> {
    await api.delete(`/admin/listings/${id}`);
  },

  async getCabs(): Promise<CabGroupDetailDto[]> {
    const res = await api.get('/admin/cabs');
    const data = unwrapData<any>(res);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async deleteCab(id: string): Promise<void> {
    await api.delete(`/admin/cabs/${id}`);
  },

  async getUsers(): Promise<UserDto[]> {
    const res = await api.get('/admin/users');
    const data = unwrapData<any>(res);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async banUser(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/ban`, {});
  },

  async unbanUser(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/unban`, {});
  },
};
