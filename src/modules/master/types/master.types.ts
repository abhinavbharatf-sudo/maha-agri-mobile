/**
 * Master Data Management - Complete Type Definitions (Module 02 MDM)
 * Master Data Architecture for Organizations, Geography, Projects, Services, Lookups, Documents, Payments, Settings & Templates.
 */

// 1. Organization Master
export interface Organization {
  id: string;
  code: string;
  name: string;
  legal_name?: string;
  tax_identifier?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface OrganizationBranch {
  id: string;
  organization_id: string;
  branch_code: string;
  branch_name: string;
  address?: string;
  city?: string;
  state_id?: string;
  district_id?: string;
  pincode?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface OrganizationDepartment {
  id: string;
  organization_id: string;
  department_code: string;
  department_name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

// 2. Geography Master
export interface Country {
  id: string;
  code: string;
  name: string;
  iso_code2?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface State {
  id: string;
  country_id?: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Region {
  id: string;
  state_id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface District {
  id: string;
  state_id: string;
  region_id?: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Taluka {
  id: string;
  district_id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Village {
  id: string;
  village_code: string;
  village_name: string;
  taluka_id: string;
  district_id?: string;
  region_id?: string;
  state_id?: string;
  country_id?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  census_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// 3. Project Master
export interface Project {
  id: string;
  organization_id?: string;
  financial_year_id?: string;
  project_code: string;
  project_name: string;
  project_type?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// 4. Service Master
export interface ServiceMaster {
  id: string;
  service_code: string;
  service_name: string;
  category?: string;
  description?: string;
  fee_amount: number;
  is_active: boolean;
  created_at: string;
}

// 5. Lookup Master Engine
export interface LookupCategory {
  id: string;
  category_key: string;
  name: string;
  description?: string;
  is_system: boolean;
}

export interface LookupValue {
  id: string;
  category_id: string;
  parent_lookup_id?: string;
  lookup_key: string;
  label: string;
  display_order: number;
  color?: string;
  icon?: string;
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

// 6. Document Types Master
export interface DocumentTypeMaster {
  id: string;
  code: string;
  name: string;
  category?: string;
  is_mandatory: boolean;
  verification_regex?: string;
  is_active: boolean;
}

// 7. Payment Methods Master
export interface PaymentMethodMaster {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  is_online: boolean;
  is_active: boolean;
}

// 8. System Settings Master
export interface SystemSetting {
  id: string;
  setting_key: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  is_editable: boolean;
  updated_at: string;
}

// 9. Financial Year Master
export interface FinancialYear {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: 'active' | 'inactive';
}

// 10. Notification Template Master
export interface NotificationTemplateMaster {
  id: string;
  template_code: string;
  template_name: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  subject?: string;
  body_text: string;
  variables?: string[];
  is_active: boolean;
}
