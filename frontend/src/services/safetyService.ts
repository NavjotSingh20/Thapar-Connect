import { api, unwrapData } from './api';
import { BlockDto, BlockUserRequest, CreateReportRequest, ReportDto } from '@/types';

export const safetyService = {
  async report(payload: CreateReportRequest): Promise<ReportDto> {
    const res = await api.post('/safety/report', payload);
    return unwrapData<ReportDto>(res);
  },

  async blockUser(blockedUserId: string): Promise<void> {
    const payload: BlockUserRequest = { blockedUserId };
    await api.post('/safety/block', payload);
  },

  async unblockUser(userId: string): Promise<void> {
    await api.delete(`/safety/block/${userId}`);
  },

  async getBlockedUsers(): Promise<BlockDto[]> {
    const res = await api.get('/safety/blocked');
    const data = unwrapData<any>(res);
    return Array.isArray(data) ? data : [];
  },
};
