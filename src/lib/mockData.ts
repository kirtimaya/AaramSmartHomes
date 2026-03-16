import { Property, Unit, Tenant, Ticket, WaterLog } from './types';

export const mockProperties: Property[] = [
  { 
    id: 'p1', 
    name: 'Serene Duplex', 
    location: 'Goa, Anjuna', 
    total_rooms: 5, 
    property_type: 'Villa',
    image_url: '/images/realistic_villa_exterior_1773522363119.png',
    description: 'A luxurious duplex with panoramic ocean views and private pool.',
    rooms: [
      { id: 'r1', name: 'Master Suite', type: 'Bedroom', sqft: 450, features: ['King Bed', 'Ocean View', 'En-suite Bath'] },
      { id: 'r2', name: 'Garden Room', type: 'Bedroom', sqft: 320, features: ['Queen Bed', 'Garden Access'] }
    ],
    benefits: [
      { id: 'b1', name: 'Private Pool', icon: 'Waves' },
      { id: 'b2', name: 'Solar Powered', icon: 'Sun' }
    ],
    automation: [
      { id: 'a1', name: 'Smart Lighting', type: 'Lighting', status: 'Active' },
      { id: 'a2', name: 'Nest Thermostat', type: 'Climate', status: 'Active' }
    ]
  },
  { 
    id: 'p2', 
    name: 'The Azure Flats', 
    location: 'Goa, Vagator', 
    total_rooms: 5, 
    property_type: 'Flat',
    image_url: '/images/modern_apartment_exterior_1773521983114.png',
    description: 'Modern apartments in the heart of the action, close to beaches.',
    benefits: [{ id: 'b3', name: 'High-speed WiFi', icon: 'Wifi' }]
  },
  { 
    id: 'p3', 
    name: 'Orenda House', 
    location: 'Goa, Siolim', 
    total_rooms: 5, 
    property_type: 'Individual House',
    image_url: '/images/cozy_standalone_house_1773521999008.png',
    description: 'A charming standalone house surrounded by tropical greenery.'
  },
];

export const mockUnits: Unit[] = [
  { id: 'u1', property_id: 'p1', room_number: '101', status: 'Occupied', current_tenant_id: 't1' },
  { id: 'u2', property_id: 'p1', room_number: '102', status: 'Occupied', current_tenant_id: 't2' },
  { id: 'u3', property_id: 'p1', room_number: '103', status: 'Notice Period', current_tenant_id: 't3' },
  { id: 'u4', property_id: 'p1', room_number: '104', status: 'Vacant' },
  { id: 'u5', property_id: 'p1', room_number: '105', status: 'Maintenance' },
  
  { id: 'u6', property_id: 'p2', room_number: '201', status: 'Occupied', current_tenant_id: 't4' },
  { id: 'u7', property_id: 'p2', room_number: '202', status: 'Vacant' },
  { id: 'u8', property_id: 'p2', room_number: '203', status: 'Occupied', current_tenant_id: 't5' },
  { id: 'u9', property_id: 'p2', room_number: '204', status: 'Occupied', current_tenant_id: 't6' },
  { id: 'u10', property_id: 'p2', room_number: '205', status: 'Occupied', current_tenant_id: 't7' },
  
  { id: 'u11', property_id: 'p3', room_number: '301', status: 'Occupied', current_tenant_id: 't8' },
  { id: 'u12', property_id: 'p3', room_number: '302', status: 'Occupied', current_tenant_id: 't9' },
  { id: 'u13', property_id: 'p3', room_number: '303', status: 'Occupied', current_tenant_id: 't10' },
  { id: 'u14', property_id: 'p3', room_number: '304', status: 'Occupied', current_tenant_id: 't11' },
  { id: 'u15', property_id: 'p3', room_number: '305', status: 'Vacant' },
];

export const mockTenants: Tenant[] = [
  { id: 't1', name: 'Aaryan Sharma', email: 'aaryan@example.com', room_id: 'u1', move_in_date: '2023-10-01', status: 'active' },
  { id: 't2', name: 'Ishita Kapoor', email: 'ishita@example.com', room_id: 'u2', move_in_date: '2023-11-15', status: 'active' },
  { id: 't3', name: 'Rohan Mehra', email: 'rohan@example.com', room_id: 'u3', move_in_date: '2023-01-20', notice_date: '2026-03-01', move_out_date: '2026-03-31', status: 'notice' },
  { id: 't_guest', name: 'Guest User', email: 'guest@aaram.space', status: 'guest', shortlisted_property_ids: ['p1', 'p2'] }
];

export const mockTickets: Ticket[] = [
  { id: 'tk1', tenant_id: 't1', category: 'Plumbing', priority: 'High', status: 'Pending', description: 'Leaking faucet in the bathroom.', created_at: '2026-03-14T10:00:00Z' },
  { id: 'tk2', tenant_id: 't2', category: 'Electrical', priority: 'Medium', status: 'In-Progress', description: 'AC remote not working.', created_at: '2026-03-13T14:30:00Z' },
];

export const mockWaterLogs: WaterLog[] = [
  { id: 'w1', property_id: 'p1', level_percentage: 85, timestamp: new Date().toISOString() },
  { id: 'w2', property_id: 'p2', level_percentage: 42, timestamp: new Date().toISOString() },
  { id: 'w3', property_id: 'p3', level_percentage: 15, timestamp: new Date().toISOString() },
];
