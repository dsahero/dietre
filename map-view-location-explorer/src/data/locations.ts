import { LocationItem, MarkerVariableConfig, NavigationTab } from '../types';

export const COLOR_PALETTE = {
  terracotta: '#C15C3D', // Warm burnt terracotta clay
  olive: '#687C64',      // Dusty olive sage / eucalyptus
  ochre: '#D49A4C',      // Desert sand / golden sunbaked ochre
  sand: '#DFBE99',       // Warm linen sand
  espresso: '#3D2C24',   // Deep walnut espresso
  slate: '#7C675B',      // Earthy warm charcoal
};

// Single marker color variable configuration
export const MARKER_VARIABLE: MarkerVariableConfig = {
  name: 'Status',
  getColor: (loc: LocationItem) => {
    switch (loc.variableValue) {
      case 'Operational':
        return COLOR_PALETTE.terracotta;
      case 'Verified':
        return COLOR_PALETTE.olive;
      case 'Pending':
        return COLOR_PALETTE.ochre;
      default:
        return COLOR_PALETTE.espresso;
    }
  },
  getValue: (loc: LocationItem) => loc.variableValue,
  legend: [
    { label: 'Operational', color: COLOR_PALETTE.terracotta, value: 'Operational' },
    { label: 'Verified', color: COLOR_PALETTE.olive, value: 'Verified' },
    { label: 'Pending', color: COLOR_PALETTE.ochre, value: 'Pending' },
  ],
};

export const NAVIGATION_TABS: NavigationTab[] = [
  { id: 'map', label: 'Map View', iconName: 'Map', badge: 'Active' },
  { id: 'locations', label: 'Locations', iconName: 'MapPin', badge: '8' },
  { id: 'layers', label: 'Layers & Zones', iconName: 'Layers' },
  { id: 'analytics', label: 'Analytics', iconName: 'BarChart3' },
  { id: 'activity', label: 'Activity Log', iconName: 'Clock' },
  { id: 'settings', label: 'Settings', iconName: 'Sliders' },
];

export const INITIAL_LOCATIONS: LocationItem[] = [
  {
    id: 'loc-1',
    name: "Amy's Kitchen & Bistro",
    lat: 19.4298,
    lng: -99.1670,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Operational',
    statusLabel: 'Operational',
    line1: {
      text: "Amy's Kitchen & Bistro • 42620 Paseo",
      color: '#C15C3D',
      label: 'Location & Name',
    },
    line2: {
      text: "Status: Operational • 4.9 ★ Rating",
      color: '#D49A4C',
      label: 'Performance Metric',
    },
    line3: {
      text: "Hours: 8:00 AM - 10:00 PM • Valet Parking",
      color: '#E2A387',
      label: 'Service Schedule',
    },
  },
  {
    id: 'loc-2',
    name: 'San Rafael Cultural Center',
    lat: 19.4352,
    lng: -99.1585,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Verified',
    statusLabel: 'Verified',
    line1: {
      text: 'San Rafael Cultural Center • Sullivan 44',
      color: '#687C64',
      label: 'Location & Name',
    },
    line2: {
      text: 'Exhibitions & Workshops Active',
      color: '#D49A4C',
      label: 'Current Status',
    },
    line3: {
      text: 'Admission: Free • Open Tue - Sun',
      color: '#E2A387',
      label: 'Access Details',
    },
  },
  {
    id: 'loc-3',
    name: 'UVM Campus San Rafael Hub',
    lat: 19.4370,
    lng: -99.1610,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Pending',
    statusLabel: 'Pending',
    line1: {
      text: 'UVM Campus Innovation Center',
      color: '#D49A4C',
      label: 'Facility Name',
    },
    line2: {
      text: 'Registration: Active Semester Cohort',
      color: '#C15C3D',
      label: 'Enrollment',
    },
    line3: {
      text: 'Campus Pass Required • 7:00 AM - 9:00 PM',
      color: '#687C64',
      label: 'Security & Access',
    },
  },
  {
    id: 'loc-4',
    name: 'Paseo de la Reforma Tower',
    lat: 19.4285,
    lng: -99.1645,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Operational',
    statusLabel: 'Operational',
    line1: {
      text: 'Reforma Corporate Plaza • Suite 1400',
      color: '#C15C3D',
      label: 'Office Tower',
    },
    line2: {
      text: 'High-Speed Fiber & Meeting Concierge',
      color: '#D49A4C',
      label: 'Amenities',
    },
    line3: {
      text: '24/7 Security Access Card Required',
      color: '#E2A387',
      label: 'Building Access',
    },
  },
  {
    id: 'loc-5',
    name: 'Atenas Centro Coworking',
    lat: 19.4320,
    lng: -99.1525,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Operational',
    statusLabel: 'Operational',
    line1: {
      text: 'Atenas Creative Loft & Cafe',
      color: '#C15C3D',
      label: 'Work & Coffee',
    },
    line2: {
      text: 'Status: 92% Occupied • Hot Desks Open',
      color: '#D49A4C',
      label: 'Desk Availability',
    },
    line3: {
      text: 'Member Lounge • High-speed Wi-Fi 6',
      color: '#E2A387',
      label: 'Specs',
    },
  },
  {
    id: 'loc-6',
    name: 'Tabacalera Garden Pavilion',
    lat: 19.4365,
    lng: -99.1530,
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Verified',
    statusLabel: 'Verified',
    line1: {
      text: 'Tabacalera Historic Park Pavilion',
      color: '#687C64',
      label: 'Park & Pavilion',
    },
    line2: {
      text: 'Certified Green Space & Heritage Site',
      color: '#D49A4C',
      label: 'Heritage Status',
    },
    line3: {
      text: 'Open Sunrise to 8:00 PM Daily',
      color: '#C15C3D',
      label: 'Park Schedule',
    },
  },
  {
    id: 'loc-7',
    name: 'Juárez Artisan Espresso & Bakery',
    lat: 19.4260,
    lng: -99.1570,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Pending',
    statusLabel: 'Pending',
    line1: {
      text: 'Juárez Artisan Espresso • Versalles 32',
      color: '#D49A4C',
      label: 'Cafe & Roastery',
    },
    line2: {
      text: 'Status: Pending Seasonal Inspection',
      color: '#C15C3D',
      label: 'Review Status',
    },
    line3: {
      text: 'Outdoor Patio & Pet Friendly Seating',
      color: '#687C64',
      label: 'Features',
    },
  },
  {
    id: 'loc-8',
    name: 'Cuauhtémoc Lerma Suites',
    lat: 19.4275,
    lng: -99.1685,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    variableValue: 'Verified',
    statusLabel: 'Verified',
    line1: {
      text: 'Lerma Boutique Suites • Rio Tigris',
      color: '#687C64',
      label: 'Hotel & Lodging',
    },
    line2: {
      text: 'Verified Luxury Partner • 4.8 Rating',
      color: '#D49A4C',
      label: 'Partner Rating',
    },
    line3: {
      text: 'Concierge Service • Rooftop Garden',
      color: '#C15C3D',
      label: 'Amenities',
    },
  },
];
