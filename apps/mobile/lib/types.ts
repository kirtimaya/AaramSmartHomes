export type Property = {
  id: string;
  name: string;
  location: string;
  total_rooms: number;
  property_type: string;
  image_url?: string;
  description?: string;
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
};

export type Tenant = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  room_id?: string;
  property_id?: string;
  move_in_date?: string;
  status: 'active' | 'notice' | 'moved_out';
};

export type Ticket = {
  id: string;
  requester_id: string;
  requester_type: 'guest' | 'tenant';
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In-Progress' | 'Resolved';
  description: string;
  image_url?: string;
  admin_note?: string;
  created_at: string;
  updated_at?: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
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
  paid?: boolean;
};
