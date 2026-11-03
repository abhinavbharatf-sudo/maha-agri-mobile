/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production';
  readonly VITE_WHATSAPP_API_URL: string;
  readonly VITE_WHATSAPP_API_KEY: string;
  readonly VITE_WHATSAPP_OTP_TEMPLATE: string;
  readonly VITE_ENABLE_DUMMY_OTP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
