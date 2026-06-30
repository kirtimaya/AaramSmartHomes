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
  automation?: AutomationSystem[];
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

export type AutomationSystem = {
  id: string;
  name: string;
  type: 'Lighting' | 'Security' | 'Climate' | 'Other';
  status: 'Active' | 'Inactive';
  description?: string;
  image_url?: string;
};

export type UnitStatus = 'Vacant' | 'Occupied' | 'Maintenance' | 'Notice Period';

export type Unit = {
  id: string;
  property_id: string;
  room_number: string;
  status: UnitStatus;
  current_tenant_id?: string;
  lease_end_date?: string;
};

// ── Guest ────────────────────────────────────────────────────────────────────
// Registered users who are exploring properties but not yet tenants.
export type Guest = {
  id: string;           // = auth.uid()
  name: string;
  email: string;
  phone?: string;
  last_login_at?: string;
  created_at: string;
};

export type GuestShortlist = {
  id: string;
  guest_id: string;
  property_id: string;
  created_at: string;
};

// ── Tenant ───────────────────────────────────────────────────────────────────
// Active residents with approved portal access.
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

export type TicketStatus = 'Pending' | 'In-Progress' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketCategory = 'Maintenance' | 'Support' | 'TenantAccessRequest';

export type Ticket = {
  id: string;
  requester_id: string;        // guest or tenant user id
  requester_type: 'guest' | 'tenant';
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  image_url?: string;
  admin_note?: string;
  booking_id?: string;         // set for TenantAccessRequest tickets
  created_at: string;
  updated_at?: string;
};

export type WaterLog = {
  id: string;
  property_id: string;
  level_percentage: number;
  timestamp: string;
};

export type MealOptIn = {
  id: string;
  tenant_id: string;
  date: string;
  meal_type: 'Breakfast' | 'Lunch' | 'Dinner';
  opt_in: boolean;
};

// ── Visit & Booking ──────────────────────────────────────────────────────────

export type VisitRequest = {
  id: string;
  requester_id: string;
  requester_type: 'guest' | 'tenant';
  property_id: string;
  room_id?: string;
  preferred_date?: string;
  message?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
};

export type BookingStatus = 'pending' | 'paid' | 'confirmed' | 'cancelled';

export type RoomBooking = {
  id: string;
  guest_id: string;
  property_id: string;
  room_id?: string;
  token_amount: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  status: BookingStatus;
  created_at: string;
};

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'bill_locked'
  | 'tenant_approved'
  | 'booking_confirmed'
  | 'visit_confirmed';

export type Notification = {
  id: string;
  user_id: string;
  user_type: 'guest' | 'tenant';
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

// ── Electricity Bill Splitting ───────────────────────────────────────────────

export type RoomElectricConfig = {
  unit_id: string;           // FK → units.id
  has_ac: boolean;
  ac_units_used: number;
  is_occupied: boolean;
};

export type ElectricityBillStatus =
  | 'draft' | 'published'  // legacy values
  | 'pending' | 'validated' | 'rejected' | 'split_calculated' | 'locked';

export type ElectricityBill = {
  id: string;
  property_id: string;
  bill_month: string;
  usc_no?: string;
  present_reading?: number;
  previous_reading?: number;
  present_date?: string;
  previous_date?: string;
  total_units: number;
  total_amount: number;
  ac_rate_per_unit: number;
  bill_image_url?: string;
  image_url?: string;           // legacy field
  uploaded_by?: string;
  uploaded_by_name?: string;
  upload_source?: 'tenant' | 'admin';
  status: ElectricityBillStatus;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
};

export type TenantACSubmission = {
  id: string;
  bill_id: string;
  tenant_id: string;
  room_id: string;
  ac_units_submitted: number;
  submitted_at: string;
  is_admin_override: boolean;
  admin_override_value?: number;
};

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

export type RoomElectricityBill = {
  id: string;
  bill_id: string;
  unit_id: string;
  room_number: string;
  ac_units: number;
  ac_amount: number;
  common_share_units: number;
  common_share_amount: number;
  total_amount: number;
  status: 'unpaid' | 'paid';
};
