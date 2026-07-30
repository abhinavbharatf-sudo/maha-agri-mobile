// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Centralized Frontend API Service Layer (React ERP ↔ NestJS Backend)
// JWT Auth Injection, Retry Logic, Error Handling & Health Fallback
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  role?: string;
  permissions?: string[];
  supportedModes?: string[];
  defaultMode?: string;
  menus?: any[];
}

class ApiClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('maha_agri_jwt_token') || sessionStorage.getItem('maha_agri_jwt_token');
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retries = 2,
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let attempt = 0;
    while (attempt <= retries) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(json.message || json.error || `HTTP ${response.status} ${response.statusText}`);
        }

        return json;
      } catch (err: any) {
        attempt++;
        if (attempt > retries) {
          console.warn(`[ApiClient] Endpoint ${endpoint} unreachable or failed: ${err.message}. Using fallback.`);
          return {
            success: false,
            error: err.message || 'Network error',
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return { success: false, error: 'Request failed after retries' };
  }

  // --- Auth & IAM ---
  async sendOtp(mobileNumber: string) {
    return this.request('/api/v1/platform/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber }),
    });
  }

  async verifyOtp(mobileNumber: string, otp: string) {
    return this.request('/api/v1/platform/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber, otp }),
    });
  }

  async superAdminLogin(superAdminCode: string, password: string, twoFactorToken: string, deviceId: string) {
    return this.request('/api/v1/platform/super-admin/login', {
      method: 'POST',
      body: JSON.stringify({ superAdminCode, password, twoFactorToken, deviceId }),
    });
  }

  // --- Dynamic Menu & Role Inheritance ---
  async getDynamicMenu(role: string) {
    return this.request(`/api/v1/platform/rbac/dynamic-menu?role=${encodeURIComponent(role)}`);
  }

  async getEffectivePermissions(role: string) {
    return this.request(`/api/v1/platform/rbac/effective-permissions/${encodeURIComponent(role)}`);
  }

  async switchRole(userId: string, targetRole: string) {
    return this.request('/api/v1/platform/users/switch-role', {
      method: 'POST',
      body: JSON.stringify({ userId, targetRole }),
    });
  }

  // --- Master Data & Agencies ---
  async getMdmCatalog() {
    return this.request('/api/v1/platform/mdm/catalog');
  }

  async getTestingAgencies() {
    return this.request('/api/v1/platform/masters/testing-agencies');
  }

  async getDistricts() {
    return this.request('/api/v1/platform/masters/districts');
  }

  // --- Soil & Chain of Custody ---
  async verifySoilPayment(sampleId: string, paymentTransactionRef: string, verifiedByUserId: string) {
    return this.request('/api/v1/platform/soil/payment-verify', {
      method: 'POST',
      body: JSON.stringify({ sampleId, paymentTransactionRef, verifiedByUserId }),
    });
  }

  async getSampleCustody(sampleId: string) {
    return this.request(`/api/v1/platform/custody/${encodeURIComponent(sampleId)}`);
  }

  async logCustodyEvent(sampleId: string, stage: string, actorUserId: string, actorRole: string) {
    return this.request('/api/v1/platform/custody/log', {
      method: 'POST',
      body: JSON.stringify({ sampleId, stage, actorUserId, actorRole }),
    });
  }

  // --- Billing & Capacity ---
  async calculateLabBilling(sampleId: string, labAgencyType: string) {
    return this.request('/api/v1/platform/billing/lab-cost', {
      method: 'POST',
      body: JSON.stringify({ sampleId, labAgencyType }),
    });
  }

  async getLabCapacity(labAgencyId: string) {
    return this.request(`/api/v1/platform/labs/${encodeURIComponent(labAgencyId)}/capacity`);
  }

  // --- Feature Flags, BRE & AI ---
  async getFeatureFlags() {
    return this.request('/api/v1/platform/feature-flags');
  }

  async evaluateBusinessRules(sampleType: string, district: string, farmerCategory: string, basePrice: number) {
    return this.request('/api/v1/platform/bre/evaluate', {
      method: 'POST',
      body: JSON.stringify({ sampleType, district, farmerCategory, basePrice }),
    });
  }

  async generateAiPrediction(ph: number, oc: number, nitrogen: number, phosphorus: number, potassium: number) {
    return this.request('/api/v1/platform/ai/predict', {
      method: 'POST',
      body: JSON.stringify({ ph, oc, nitrogen, phosphorus, potassium }),
    });
  }
}

export const apiClient = new ApiClient();
