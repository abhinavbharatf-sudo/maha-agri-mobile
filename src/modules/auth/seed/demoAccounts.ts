/**
 * Enterprise Production Seed & Demo Account Registry
 * Abhinav Bharat Foundation Enterprise & MAHA-AGRI Government Digital Operations Platform
 *
 * Seed accounts for automatic platform, role, and permission detection.
 * Passwords default to enterprise specification per platform.
 */

export interface EnterpriseUserAccount {
  id: string;
  fullName: string;
  mobile: string;
  platform: 'ABHINAV_BHARAT_ENTERPRISE' | 'MAHA_AGRI_GOVERNMENT';
  roleKey: string;
  roleName: string;
  targetDashboard: string;
  status: 'active' | 'inactive';
  employeeCode: string;
  permissions: string[];
}

export const ENTERPRISE_SEED_ACCOUNTS: EnterpriseUserAccount[] = [
  // ============================================================================
  // PLATFORM 1: ABHINAV BHARAT FOUNDATION ENTERPRISE (Default Password: Abf@12345)
  // ============================================================================
  {
    id: 'user-abf-01',
    fullName: 'Abhinav Founder (Super Admin)',
    mobile: '9876543210',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'SUPER_ADMIN',
    roleName: 'Enterprise Super Admin',
    targetDashboard: '/dashboard',
    status: 'active',
    employeeCode: 'ABF-SUP-0001',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'PRINT'],
  },
  {
    id: 'user-abf-02',
    fullName: 'Rajesh Sharma (State Admin)',
    mobile: '9876543211',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'STATE_ADMIN',
    roleName: 'Enterprise State Admin',
    targetDashboard: '/enterprise/state-admin',
    status: 'active',
    employeeCode: 'ABF-STA-0002',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'EXPORT', 'PRINT'],
  },
  {
    id: 'user-abf-03',
    fullName: 'Priya Kulkarni (HR Manager)',
    mobile: '9876543212',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'HR_MANAGER',
    roleName: 'HR Manager',
    targetDashboard: '/admin/rms/dashboard',
    status: 'active',
    employeeCode: 'ABF-HRM-0003',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'EXPORT'],
  },
  {
    id: 'user-abf-04',
    fullName: 'Sanjay Verma (HR Executive)',
    mobile: '9876543213',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'HR_EXECUTIVE',
    roleName: 'HR Executive',
    targetDashboard: '/admin/rms/dashboard',
    status: 'active',
    employeeCode: 'ABF-HRE-0004',
    permissions: ['VIEW', 'CREATE', 'UPDATE'],
  },
  {
    id: 'user-abf-05',
    fullName: 'Aniket Deshmukh (CRM Executive)',
    mobile: '9876543214',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'CRM_EXECUTIVE',
    roleName: 'CRM Executive',
    targetDashboard: '/crm/dashboard',
    status: 'active',
    employeeCode: 'ABF-CRM-0005',
    permissions: ['VIEW', 'CREATE', 'UPDATE'],
  },
  {
    id: 'user-abf-06',
    fullName: 'Vikram Joshi (CSM Manager)',
    mobile: '9876543215',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'CSM_MANAGER',
    roleName: 'CSM Manager',
    targetDashboard: '/crm/dashboard',
    status: 'active',
    employeeCode: 'ABF-CSM-0006',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'EXPORT'],
  },
  {
    id: 'user-abf-07',
    fullName: 'Kavita Pawar (CSM Telecaller)',
    mobile: '9876543216',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'CSM_TELECALLER',
    roleName: 'CSM Telecaller',
    targetDashboard: '/crm/dashboard',
    status: 'active',
    employeeCode: 'ABF-TEL-0007',
    permissions: ['VIEW', 'UPDATE'],
  },
  {
    id: 'user-abf-08',
    fullName: 'Nitin Mane (Office Staff)',
    mobile: '9876543217',
    platform: 'ABHINAV_BHARAT_ENTERPRISE',
    roleKey: 'OFFICE_STAFF',
    roleName: 'Office Staff',
    targetDashboard: '/enterprise/office',
    status: 'active',
    employeeCode: 'ABF-OFF-0008',
    permissions: ['VIEW', 'CREATE'],
  },

  // ============================================================================
  // PLATFORM 2: MAHA-AGRI GOVERNMENT DIGITAL OPERATIONS PLATFORM
  // ============================================================================
  {
    id: 'user-mha-20',
    fullName: 'Dr. Dnyaneshwar Patil (Super Admin)',
    mobile: '9876543220',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'SUPER_ADMIN',
    roleName: 'MAHA-AGRI Super Admin',
    targetDashboard: '/maha-agri-admin',
    status: 'active',
    employeeCode: 'MH-SUP-0020',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'PRINT'],
  },
  {
    id: 'user-mha-21',
    fullName: 'Shri V. K. Patil (State Admin)',
    mobile: '9876543221',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'STATE_ADMIN',
    roleName: 'MAHA-AGRI State Admin',
    targetDashboard: '/maha-agri-admin',
    status: 'active',
    employeeCode: 'MH-STA-0021',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'EXPORT', 'PRINT'],
  },
  {
    id: 'user-mha-22',
    fullName: 'Rameshwar Shinde (Regional Manager)',
    mobile: '9876543222',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'REGIONAL_MANAGER',
    roleName: 'Regional Manager',
    targetDashboard: '/maha-agri-admin',
    status: 'active',
    employeeCode: 'MH-REG-0022',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'EXPORT'],
  },
  {
    id: 'user-mha-23',
    fullName: 'Rahul Patil (District Coordinator)',
    mobile: '9876543223',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'DISTRICT_COORDINATOR',
    roleName: 'District Coordinator',
    targetDashboard: '/maha-agri-admin',
    status: 'active',
    employeeCode: 'MH-DST-0023',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'EXPORT'],
  },
  {
    id: 'user-mha-24',
    fullName: 'Prakash Patil (Taluka Coordinator)',
    mobile: '9876543224',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'TALUKA_COORDINATOR',
    roleName: 'Taluka Coordinator',
    targetDashboard: '/maha-agri-admin',
    status: 'active',
    employeeCode: 'MH-TAL-0024',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE'],
  },
  {
    id: 'user-mha-25',
    fullName: 'Ajay Patil (MAHA-AGRIDOOT)',
    mobile: '9876543225',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'MAHA_AGRIDOOT',
    roleName: 'MAHA-AGRIDOOT Field Officer',
    targetDashboard: '/maha-agri/agridoot',
    status: 'active',
    employeeCode: 'MH-DOT-0025',
    permissions: ['VIEW', 'CREATE', 'UPDATE'],
  },
  {
    id: 'user-mha-26',
    fullName: 'Radhika Joshi (Soil Chemist)',
    mobile: '9876543226',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'SOIL_CHEMIST',
    roleName: 'Soil Chemist',
    targetDashboard: '/maha-agri-admin',
    status: 'active',
    employeeCode: 'MH-CHM-0026',
    permissions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'PRINT'],
  },
  {
    id: 'user-mha-27',
    fullName: 'Rahul Dnyaneshwar Patil (Farmer)',
    mobile: '9876543227',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'FARMER',
    roleName: 'Registered Farmer',
    targetDashboard: '/maha-agri-admin',
    status: 'active',
    employeeCode: 'MH-FRM-0027',
    permissions: ['VIEW', 'CREATE'],
  },
  {
    id: 'user-mha-28',
    fullName: 'Vikas Shinde (EDP-AGRI Entrepreneur)',
    mobile: '9876543228',
    platform: 'MAHA_AGRI_GOVERNMENT',
    roleKey: 'EDP_AGRI_ENTREPRENEUR',
    roleName: 'EDP-AGRI Entrepreneur',
    targetDashboard: '/candidate/training',
    status: 'active',
    employeeCode: 'MH-EDP-0028',
    permissions: ['VIEW', 'CREATE'],
  },
];
