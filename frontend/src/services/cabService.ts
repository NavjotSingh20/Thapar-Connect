import { api, unwrapData } from './api';
import {
  CabGroupSummaryDto,
  CabGroupDetailDto,
  CabMemberDto,
  CreateCabRequest,
  JoinCabRequest,
  CabFilterParams,
} from '@/types';

export const cabService = {
  async getCabGroups(params?: CabFilterParams): Promise<CabGroupSummaryDto[]> {
    const res = await api.get('/cabs', { params });
    const data = unwrapData<CabGroupSummaryDto[]>(res);
    return Array.isArray(data) ? data : (data as any)?.content || [];
  },

  async getCabGroupById(id: string): Promise<CabGroupDetailDto> {
    const res = await api.get(`/cabs/${id}`);
    return unwrapData<CabGroupDetailDto>(res);
  },

  async createCabGroup(payload: CreateCabRequest): Promise<CabGroupDetailDto> {
    const res = await api.post('/cabs', payload);
    return unwrapData<CabGroupDetailDto>(res);
  },

  async joinCabGroup(cabId: string, payload: JoinCabRequest): Promise<CabMemberDto> {
    const res = await api.post(`/cabs/${cabId}/join`, payload);
    return unwrapData<CabMemberDto>(res);
  },

  async acceptMember(cabId: string, memberId: string): Promise<CabMemberDto> {
    const res = await api.post(`/cabs/${cabId}/members/${memberId}/accept`, {});
    return unwrapData<CabMemberDto>(res);
  },

  async rejectMember(cabId: string, memberId: string): Promise<CabMemberDto> {
    const res = await api.post(`/cabs/${cabId}/members/${memberId}/reject`, {});
    return unwrapData<CabMemberDto>(res);
  },

  async closeCabGroup(cabId: string): Promise<CabGroupDetailDto> {
    const res = await api.patch(`/cabs/${cabId}/close`, {});
    return unwrapData<CabGroupDetailDto>(res);
  },

  async initiateCabChat(cabId: string, recipientId: string): Promise<{ id: string }> {
    const res = await api.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cabId,
      recipientId,
    });
    return unwrapData<{ id: string }>(res);
  },
};
