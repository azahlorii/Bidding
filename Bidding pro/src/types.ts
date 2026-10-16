export type UserRole = 'customer' | 'provider' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  specialty: string;
  created_at: string;
}

export interface Bid {
  id: number;
  service_id: number;
  provider_id: number;
  bid_amount: number;
  delivery_days: number;
  message: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  created_at: string;
  provider_name?: string;
  provider_email?: string;
  provider_phone?: string;
  provider_specialty?: string;
  service_title?: string;
  service_category?: string;
  service_budget?: number;
  service_deadline?: string;
  service_status?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface ServiceItem {
  id: number;
  customer_id: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  status: 'Open' | 'Assigned' | 'Completed' | 'Cancelled';
  selected_provider_id: number | null;
  created_at: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  selected_provider_name?: string | null;
  selected_provider_email?: string | null;
  selected_provider_phone?: string | null;
  selected_provider_specialty?: string | null;
  bid_count?: number;
  lowest_bid?: number | null;
  bids?: Bid[];
}

export interface AdminOverview {
  stats: {
    total_users: number;
    total_customers: number;
    total_providers: number;
    total_services: number;
    open_services: number;
    assigned_services: number;
    total_bids: number;
    accepted_bids: number;
  };
  users: User[];
  services: ServiceItem[];
  bids: Bid[];
}

export interface ProjectSourceFile {
  path: string;
  section: string;
  title: string;
  content: string;
}

export type PageView =
  | 'home'
  | 'customer-auth'
  | 'provider-auth'
  | 'admin-auth'
  | 'customer-dashboard'
  | 'provider-dashboard'
  | 'post-service'
  | 'available-services'
  | 'submit-bid'
  | 'customer-bids'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-services-bids'
  | 'project-code';
