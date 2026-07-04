// ── Shared domain types ───────────────────────────────────────────────────────
// Single source of truth consumed by packages/ui, packages/core, and both apps.

export type PropertyType = 'Villa' | 'Flat' | 'Individual House' | 'Other';

export type Property = {
  id: string;
  name: string;
  location: string;
  total_rooms: number;
  property_type: PropertyType;
  image_url?: string;
  description?: string;
  usc_no?: string;
  ac_rate_per_unit?: number;
  rooms?: Room[];
  benefits?: Benefit[];
};

export type Room = {
  id: string;
  property_id?: string;
  name: string;
  type: string;
  sqft?: number;
  features: string[];
  image_urls?: string[];
  has_ac?: boolean;
  occupancy_status?: string;
  tenant_name?: string;
};

export type Benefit = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  image_url?: string;
};

// ── Tenant ────────────────────────────────────────────────────────────────────

export type Tenant = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  room_id?: string;
  property_id?: string;
  move_in_date?: string;
  notice_date?: string;
  move_out_date?: string;
  status: 'active' | 'notice' | 'moved_out';
};

// ── Tickets ───────────────────────────────────────────────────────────────────

export type TicketStatus   = 'Pending' | 'In-Progress' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type Ticket = {
  id: string;
  requester_id: string;
  requester_type: 'guest' | 'tenant';
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  image_url?: string;
  admin_note?: string;
  created_at: string;
  updated_at?: string;
};

// ── Billing ───────────────────────────────────────────────────────────────────

export type BillSplit = {
  id: string;
  bill_id: string;
  tenant_id: string;
  room_id: string;
  tenant_name?: string;
  ac_units: number;
  ac_charge: number;
  common_share: number;
  total_payable: number;
  locked_at?: string;
  paid?: boolean;
};

// ── Notifications ─────────────────────────────────────────────────────────────

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

// ── Guest ─────────────────────────────────────────────────────────────────────

export type Guest = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  last_login_at?: string;
  created_at: string;
};

// ── Visit Requests ────────────────────────────────────────────────────────────

export type VisitRequestStatus = 'pending' | 'confirmed' | 'cancelled';

export type VisitRequest = {
  id: string;
  requester_id: string;
  requester_type: 'guest' | 'tenant';
  property_id: string;
  property_name?: string;
  room_id?: string;
  preferred_date?: string;
  message?: string;
  status: VisitRequestStatus;
  created_at: string;
};

// ── Dish nutrition ────────────────────────────────────────────────────────────

export type NutritionStatus = 'none' | 'estimated' | 'approved';

export type Micro = {
  name: string;
  value: number;
  unit: string;
  rdv: number;
  benefit: string;
  color: string;
};

export type DishNutrition = {
  servingSize: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  fiber: number | null;
  micros: Micro[];
  wholeSpices: string[];
  benefits: string[];
  cookingTip: string | null;
  status: NutritionStatus;
  updatedAt: string | null;
};
