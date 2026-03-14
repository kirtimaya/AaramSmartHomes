import { Property, Unit, Tenant, Ticket, WaterLog } from './types';

export const mockProperties: Property[] = [
  { 
    id: 'p1', 
    name: 'Serene Duplex', 
    location: 'Goa, Anjuna', 
    total_units: 5, 
    property_type: 'Villa',
    image_url: '/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/realistic_villa_exterior_1773522363119.png'
  },
  { 
    id: 'p2', 
    name: 'The Azure Flats', 
    location: 'Goa, Vagator', 
    total_units: 5, 
    property_type: 'Flat',
    image_url: '/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/modern_apartment_exterior_1773521983114.png'
  },
  { 
    id: 'p3', 
    name: 'Orenda House', 
    location: 'Goa, Siolim', 
    total_units: 5, 
    property_type: 'Individual House',
    image_url: '/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/cozy_standalone_house_1773521999008.png'
  },
];

export const mockUnits: Unit[] = [
  { id: 'u1', property_id: 'p1', unit_number: '101', status: 'Occupied', current_tenant_id: 't1' },
  { id: 'u2', property_id: 'p1', unit_number: '102', status: 'Occupied', current_tenant_id: 't2' },
  { id: 'u3', property_id: 'p1', unit_number: '103', status: 'Notice Period', current_tenant_id: 't3' },
  { id: 'u4', property_id: 'p1', unit_number: '104', status: 'Vacant' },
  { id: 'u5', property_id: 'p1', unit_number: '105', status: 'Maintenance' },
  
  { id: 'u6', property_id: 'p2', unit_number: '201', status: 'Occupied', current_tenant_id: 't4' },
  { id: 'u7', property_id: 'p2', unit_number: '202', status: 'Vacant' },
  { id: 'u8', property_id: 'p2', unit_number: '203', status: 'Occupied', current_tenant_id: 't5' },
  { id: 'u9', property_id: 'p2', unit_number: '204', status: 'Occupied', current_tenant_id: 't6' },
  { id: 'u10', property_id: 'p2', unit_number: '205', status: 'Occupied', current_tenant_id: 't7' },
  
  { id: 'u11', property_id: 'p3', unit_number: '301', status: 'Occupied', current_tenant_id: 't8' },
  { id: 'u12', property_id: 'p3', unit_number: '302', status: 'Occupied', current_tenant_id: 't9' },
  { id: 'u13', property_id: 'p3', unit_number: '303', status: 'Occupied', current_tenant_id: 't10' },
  { id: 'u14', property_id: 'p3', unit_number: '304', status: 'Occupied', current_tenant_id: 't11' },
  { id: 'u15', property_id: 'p3', unit_number: '305', status: 'Vacant' },
];

export const mockTenants: Tenant[] = [
  { id: 't1', name: 'Aaryan Sharma', email: 'aaryan@example.com', room_id: 'r1', move_in_date: '2023-10-01', status: 'active' },
  { id: 't2', name: 'Ishita Kapoor', email: 'ishita@example.com', room_id: 'r2', move_in_date: '2023-11-15', status: 'active' },
  { id: 't3', name: 'Rohan Mehra', email: 'rohan@example.com', room_id: 'r3', move_in_date: '2023-01-20', notice_date: '2026-03-01', move_out_date: '2026-03-31', status: 'notice' },
];

export const mockTickets: Ticket[] = [
  { id: 'tk1', tenant_id: 't1', category: 'Plumbing', priority: 'High', status: 'Pending', description: 'Leaking faucet in the bathroom.', created_at: '2026-03-14T10:00:00Z' },
  { id: 'tk2', tenant_id: 't2', category: 'Electrical', priority: 'Medium', status: 'In-Progress', description: 'AC remote not working.', created_at: '2026-03-13T14:30:00Z' },
];

export const mockWaterLogs: WaterLog[] = [
  { id: 'w1', villa_id: 'v1', level_percentage: 85, timestamp: new Date().toISOString() },
  { id: 'w2', villa_id: 'v2', level_percentage: 42, timestamp: new Date().toISOString() },
  { id: 'w3', villa_id: 'v3', level_percentage: 15, timestamp: new Date().toISOString() },
];
