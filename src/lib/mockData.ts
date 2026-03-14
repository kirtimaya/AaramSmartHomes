import { Villa, Room, Tenant, Ticket, WaterLog } from './types';

export const mockVillas: Villa[] = [
  { id: 'v1', name: 'Villa Serenity', location: 'Goa, Anjuna', total_rooms: 5 },
  { id: 'v2', name: 'Villa Azure', location: 'Goa, Vagator', total_rooms: 5 },
  { id: 'v3', name: 'Villa Orenda', location: 'Goa, Siolim', total_rooms: 5 },
];

export const mockRooms: Room[] = [
  { id: 'r1', villa_id: 'v1', room_number: '101', status: 'Occupied', current_tenant_id: 't1' },
  { id: 'r2', villa_id: 'v1', room_number: '102', status: 'Occupied', current_tenant_id: 't2' },
  { id: 'r3', villa_id: 'v1', room_number: '103', status: 'Notice Period', current_tenant_id: 't3' },
  { id: 'r4', villa_id: 'v1', room_number: '104', status: 'Vacant' },
  { id: 'r5', villa_id: 'v1', room_number: '105', status: 'Maintenance' },
  // ... more rooms for other villas
  { id: 'r6', villa_id: 'v2', room_number: '201', status: 'Occupied', current_tenant_id: 't4' },
  { id: 'r7', villa_id: 'v2', room_number: '202', status: 'Vacant' },
  { id: 'r8', villa_id: 'v2', room_number: '203', status: 'Occupied', current_tenant_id: 't5' },
  { id: 'r9', villa_id: 'v2', room_number: '204', status: 'Occupied', current_tenant_id: 't6' },
  { id: 'r10', villa_id: 'v2', room_number: '205', status: 'Occupied', current_tenant_id: 't7' },
  { id: 'r11', villa_id: 'v3', room_number: '301', status: 'Occupied', current_tenant_id: 't8' },
  { id: 'r12', villa_id: 'v3', room_number: '302', status: 'Occupied', current_tenant_id: 't9' },
  { id: 'r13', villa_id: 'v3', room_number: '303', status: 'Occupied', current_tenant_id: 't10' },
  { id: 'r14', villa_id: 'v3', room_number: '304', status: 'Occupied', current_tenant_id: 't11' },
  { id: 'r15', villa_id: 'v3', room_number: '305', status: 'Vacant' },
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
