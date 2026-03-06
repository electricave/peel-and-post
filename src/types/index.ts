// ============================================================
// Database types — mirrors the Supabase schema exactly
// ============================================================

export type Role = 'customer' | 'studio'

export type OrderStatus =
  | 'pending'
  | 'artwork_needed'
  | 'in_review'
  | 'proof_sent'
  | 'proof_approved'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type ProofStatus = 'pending' | 'approved' | 'revision'

export type NotificationType =
  | 'proof_ready'
  | 'order_update'
  | 'message'
  | 'proof_approved'
  | 'shipped'

export type ArtworkFile = {
  id: string;
  order_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

export interface Profile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: number
  customer_id: string
  product: string
  quantity: number
  finish: string
  size: string
  shape: string
  turnaround: string
  notes: string | null
  estimated_total: number | null
  final_total: number | null
  status: OrderStatus
  tracking_number: string | null
  shipped_at: string | null
  estimated_ship_at: string | null
  delivered_at: string | null
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
}

export interface Proof {
  id: string
  order_id: string
  version: number
  file_url: string
  file_name: string
  file_size: number | null
  status: ProofStatus
  feedback: string | null
  reviewed_at: string | null
  uploaded_by: string | null
  created_at: string
}

export interface File {
  id: string
  order_id: string
  uploaded_by: string
  file_url: string
  file_name: string
  file_size: number | null
  file_type: string | null
  created_at: string
}

export interface Conversation {
  id: string
  order_id: string
  created_at: string
  // Joined
  orders?: Order
  messages?: Message[]
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  proof_id: string | null
  file_url: string | null
  file_name: string | null
  read_at: string | null
  created_at: string
  // Joined
  profiles?: Profile
  proofs?: Proof
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  order_id: string | null
  read: boolean
  created_at: string
}

// ============================================================
// Form / UI types
// ============================================================

export interface NewOrderForm {
  product: string
  quantity: number | 'custom'
  customQuantity?: number
  finish: string
  size: string | 'custom'
  customSize?: string
  shape: string
  turnaround: string
  notes: string
}

export interface ProofReviewForm {
  action: 'approve' | 'revision'
  feedback?: string
}

export interface BacklogItem {
  id: string
  phase: number
  title: string
  notes: string | null
  resolved: boolean
  created_at: string
}

// ============================================================
// API response types
// ============================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}
