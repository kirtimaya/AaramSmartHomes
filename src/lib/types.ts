export type PropertyType = 'Villa' | 'Flat' | 'Individual House' | 'Other';

export type Property = {
  id: string;
  name: string;
  location: string;
  total_units: number;
  property_type: PropertyType;
  image_url?: string;
};

export type UnitStatus = 'Vacant' | 'Occupied' | 'Maintenance' | 'Notice Period';

export type Unit = {
  id: string;
  property_id: string;
  unit_number: string;
  status: UnitStatus;
  current_tenant_id?: string;
};

export type Tenant = {
  id: string;
  name: string;
  email: string;
  room_id: string;
  move_in_date: string;
  notice_date?: string;
  move_out_date?: string;
  status: 'active' | 'notice' | 'moved_out';
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
