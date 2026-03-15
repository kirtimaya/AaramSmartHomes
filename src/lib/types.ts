export type PropertyType = 'Villa' | 'Flat' | 'Individual House' | 'Other';

export type Property = {
  id: string;
  name: string;
  location: string;
  total_rooms: number; // Renamed from total_units
  property_type: PropertyType;
  image_url?: string;
  description?: string;
  rooms?: Room[];
  benefits?: Benefit[];
  automation?: AutomationSystem[];
};

export type Room = {
  id: string;
  name: string; // e.g., Master Bedroom, Living Room
  type: string;
  sqft?: number;
  features: string[];
};

export type Benefit = {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description?: string;
};

export type AutomationSystem = {
  id: string;
  name: string;
  type: 'Lighting' | 'Security' | 'Climate' | 'Other';
  status: 'Active' | 'Inactive';
};

export type UnitStatus = 'Vacant' | 'Occupied' | 'Maintenance' | 'Notice Period';

export type Unit = {
  id: string;
  property_id: string;
  room_number: string; // Changed from unit_number
  status: UnitStatus;
  current_tenant_id?: string;
};

export type Tenant = {
  id: string;
  name: string;
  email: string;
  room_id?: string; // Optional if not onboarded
  move_in_date?: string;
  notice_date?: string;
  move_out_date?: string;
  status: 'active' | 'notice' | 'moved_out' | 'guest';
  shortlisted_property_ids?: string[];
};

export type TicketStatus = 'Pending' | 'In-Progress' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type Ticket = {
  id: string;
  tenant_id: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  image_url?: string;
  created_at: string;
};

export type WaterLog = {
  id: string;
  villa_id: string;
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
