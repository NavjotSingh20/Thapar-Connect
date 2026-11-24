export interface UserDto {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
  phone?: string;
  hostel?: string;
  rollNumber?: string;
  branch?: string;
  year?: number;
  role: 'USER' | 'ADMIN';
  isOnboarded: boolean;
  isBanned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface TokenRefreshResponse {
  accessToken: string;
}

export interface OnboardRequest {
  phoneNumber: string;
  hostel: string;
  rollNumber?: string;
  branch?: string;
  year?: number;
}

export interface UpdateUserRequest {
  phoneNumber?: string;
  phone?: string;
  hostel?: string;
  rollNumber?: string;
  branch?: string;
  year?: number;
}

export interface DevLoginRequest {
  email: string;
  name: string;
  role?: 'USER' | 'ADMIN';
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

export interface ApiError {
  success?: boolean;
  status?: number;
  error?: string;
  message: string;
  path?: string;
  timestamp?: string;
  errors?: Array<{ field: string; message: string; rejectedValue?: any }>;
}

export function getUserDisplayName(user?: UserDto | null): string {
  if (!user) return 'Student';
  return user.fullName || user.name || user.email.split('@')[0];
}

export interface LocationSuggestion {
  name: string;
  latitude: number;
  longitude: number;
}

export interface CabMemberDto {
  id: string;
  userId: string;
  cabGroupId: string;
  seatsRequested: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  note?: string;
  user?: {
    id: string;
    name: string;
    hostel?: string;
    phoneNumber?: string;
    phone?: string;
  };
  createdAt?: string;
}

export interface CabGroupSummaryDto {
  id: string;
  pickupPoint: string;
  pickupLat?: number;
  pickupLng?: number;
  dropPoint: string;
  dropLat: number;
  dropLng: number;
  departureTime: string;
  totalSeats: number;
  seatsTaken: number;
  seatsAvailable: number;
  estimatedFare: number;
  note?: string;
  autoJoinEnabled: boolean;
  status: 'OPEN' | 'FULL' | 'CLOSED' | 'EXPIRED';
  distanceKm?: number;
  myMemberStatus?: 'PENDING' | 'CONFIRMED' | 'REJECTED' | null;
  creator: {
    id: string;
    name: string;
    hostel: string;
    phoneNumber?: string;
    phone?: string;
  };
  createdAt?: string;
}

export interface CabGroupDetailDto extends CabGroupSummaryDto {
  members: CabMemberDto[];
}

export interface CreateCabRequest {
  pickupPoint: string;
  pickupLat: number;
  pickupLng: number;
  dropPoint: string;
  dropLat: number;
  dropLng: number;
  departureTime: string;
  totalSeats: number;
  estimatedFare: number;
  note?: string;
  autoJoinEnabled?: boolean;
}

export interface JoinCabRequest {
  seatsRequested: number;
  note?: string;
}

export interface CabFilterParams {
  query?: string;
  searchLat?: number;
  searchLng?: number;
  date?: string;
  timeWindow?: string;
  minSeats?: number;
  maxFare?: number;
  sortBy?: string;
}

export type MarketplaceCategory =
  | 'Cycle'
  | 'Calculator'
  | 'Books'
  | 'Electronics'
  | 'Furniture'
  | 'Hostel essentials'
  | 'Other';

export type MarketplaceCondition = 'New' | 'Like new' | 'Used' | 'Heavily used';

export type ListingStatus = 'AVAILABLE' | 'SOLD' | 'RESERVED';

export interface ListingImageDto {
  id: string;
  imageUrl: string;
  orderIndex: number;
  displayOrder?: number;
}

export interface ListingSellerDto {
  id: string;
  name: string;
  hostel: string;
  profilePictureUrl?: string;
  // CRITICAL: Strictly no phone or phoneNumber fields!
}

export interface ListingSummaryDto {
  id: string;
  title: string;
  category: MarketplaceCategory | string;
  condition: MarketplaceCondition | string;
  price: number;
  hostel: string;
  status: ListingStatus;
  primaryImageUrl?: string;
  seller?: ListingSellerDto;
  sellerId?: string;
  createdAt: string;
}

export interface ListingDetailDto {
  id: string;
  title: string;
  category: MarketplaceCategory | string;
  description: string;
  condition: MarketplaceCondition | string;
  price: number;
  hostel: string;
  status: ListingStatus;
  images: ListingImageDto[];
  seller: ListingSellerDto;
  offlinePaymentDisclaimer?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ListingFilterParams {
  query?: string;
  category?: MarketplaceCategory | string;
  hostel?: string;
  condition?: MarketplaceCondition | string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  size?: number;
}

export interface CreateListingFormData {
  title: string;
  category: MarketplaceCategory;
  description: string;
  condition: MarketplaceCondition;
  price: number;
  hostel?: string;
  images: File[];
}

export interface UpdateListingFormData {
  title: string;
  category: MarketplaceCategory;
  description: string;
  condition: MarketplaceCondition;
  price: number;
  hostel?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
}

export type ChatContextType = 'CAB_GROUP' | 'LISTING';

export interface CabGroupMemberSummaryDto {
  id: string;
  name: string;
  hostel?: string;
  phoneNumber?: string;
  phone?: string;
  profilePictureUrl?: string;
  role: 'HOST' | 'RIDER';
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  seats?: number;
}

export interface ConversationContextDto {
  type: string;
  id: string;
  title: string;
}

export interface ConversationSummaryDto {
  id: string;
  contextType: ChatContextType;
  contextId: string;
  contextTitle?: string;
  context?: ConversationContextDto;
  isGroup?: boolean;
  groupName?: string;
  memberCount?: number;
  members?: CabGroupMemberSummaryDto[];
  otherParticipant: {
    id: string;
    name: string;
    profilePictureUrl?: string;
    isBanned?: boolean;
  };
  lastMessage?: string | {
    content: string;
    createdAt: string;
    senderId?: string;
  };
  lastMessageAt?: string;
  unreadCount: number;
  isBlocked?: boolean;
  blockedByMe?: boolean;
  updatedAt?: string;
}

export interface ConversationDto {
  id: string;
  contextType: ChatContextType;
  contextId: string;
  participant1Id?: string;
  participant2Id?: string;
  user1Id?: string;
  user2Id?: string;
  isGroup?: boolean;
  title?: string;
  members?: CabGroupMemberSummaryDto[];
  contextTitle?: string;
  otherParticipant?: {
    id: string;
    name: string;
    profilePictureUrl?: string;
    isBanned?: boolean;
  };
  isBlocked?: boolean;
  blockedByMe?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderHostel?: string;
  senderProfilePictureUrl?: string;
  content: string;
  isRead: boolean;
  isSystem?: boolean;
  isDelivered?: boolean;
  createdAt: string;
}

export interface CreateConversationRequest {
  contextType: ChatContextType;
  contextId: string;
  recipientId?: string;
}

export interface SendMessageRequest {
  content: string;
}

export type ReportTargetType = 'USER' | 'LISTING' | 'CAB_GROUP' | 'MESSAGE';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED' | 'ACTIONED';

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
}

export interface ReportDto {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: string;
}

export interface BlockUserRequest {
  blockedUserId: string;
}

export interface BlockDto {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedUserName?: string;
  createdAt: string;
}

export interface UpdateReportStatusRequest {
  status: ReportStatus;
}
