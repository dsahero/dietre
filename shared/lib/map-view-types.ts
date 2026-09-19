export interface LocationItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  variableValue: 'Operational' | 'Verified' | 'Pending';
  statusLabel: string;
  line1: {
    text: string;
    color: string;
    label?: string;
  };
  line2: {
    text: string;
    color: string;
    label?: string;
  };
  line3: {
    text: string;
    color: string;
    label?: string;
  };
}

export interface MarkerVariableLegendItem {
  label: string;
  color: string;
  value: 'Operational' | 'Verified' | 'Pending';
}

export interface MarkerVariableConfig {
  name: string;
  getColor: (loc: LocationItem) => string;
  getValue: (loc: LocationItem) => string;
  legend: MarkerVariableLegendItem[];
}

export interface NavigationTab {
  id: string;
  label: string;
  iconName: string;
  badge?: string;
}

export interface EventItem {
  id: string;
  name: string;
  image: string;
  participants: number;
  date: string;
  locationName: string;
  category: string;
  featuredLocationId?: string;
  description?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  provider: string;
  lastLogin: string;
  createdAt: string;
}

