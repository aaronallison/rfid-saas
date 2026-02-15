import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Database type definitions to match the cloud schema
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          org_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          org_id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          org_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      batches: {
        Row: {
          batch_id: string;
          org_id: string;
          created_by: string | null;
          created_at: string;
          status: 'open' | 'synced' | 'closed';
        };
        Insert: {
          batch_id?: string;
          org_id: string;
          created_by?: string | null;
          created_at?: string;
          status?: 'open' | 'synced' | 'closed';
        };
        Update: {
          batch_id?: string;
          org_id?: string;
          created_by?: string | null;
          created_at?: string;
          status?: 'open' | 'synced' | 'closed';
        };
      };
      batch_schema: {
        Row: {
          schema_id: string;
          batch_id: string;
          org_id: string;
          col_1_name: string | null;
          col_2_name: string | null;
          col_3_name: string | null;
          col_4_name: string | null;
          col_5_name: string | null;
          col_6_name: string | null;
          col_7_name: string | null;
          col_8_name: string | null;
          col_9_name: string | null;
          col_10_name: string | null;
          col_11_name: string | null;
          col_12_name: string | null;
          col_13_name: string | null;
          col_14_name: string | null;
          col_15_name: string | null;
          col_16_name: string | null;
          col_17_name: string | null;
          col_18_name: string | null;
          col_19_name: string | null;
          col_20_name: string | null;
          col_21_name: string | null;
          col_22_name: string | null;
          col_23_name: string | null;
          col_24_name: string | null;
          col_25_name: string | null;
          created_at: string;
        };
        Insert: {
          schema_id?: string;
          batch_id: string;
          org_id: string;
          col_1_name?: string | null;
          col_2_name?: string | null;
          col_3_name?: string | null;
          col_4_name?: string | null;
          col_5_name?: string | null;
          col_6_name?: string | null;
          col_7_name?: string | null;
          col_8_name?: string | null;
          col_9_name?: string | null;
          col_10_name?: string | null;
          col_11_name?: string | null;
          col_12_name?: string | null;
          col_13_name?: string | null;
          col_14_name?: string | null;
          col_15_name?: string | null;
          col_16_name?: string | null;
          col_17_name?: string | null;
          col_18_name?: string | null;
          col_19_name?: string | null;
          col_20_name?: string | null;
          col_21_name?: string | null;
          col_22_name?: string | null;
          col_23_name?: string | null;
          col_24_name?: string | null;
          col_25_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['batch_schema']['Insert']>;
      };
      captures_universal: {
        Row: {
          cntid: number;
          org_id: string;
          batch_id: string | null;
          type: string | null;
          f1: string | null;
          f2: string | null;
          f3: string | null;
          f4: string | null;
          f5: string | null;
          f6: string | null;
          f7: string | null;
          f8: string | null;
          f9: string | null;
          f10: string | null;
          f11: string | null;
          f12: string | null;
          f13: string | null;
          f14: string | null;
          f15: string | null;
          f16: string | null;
          f17: string | null;
          f18: string | null;
          f19: string | null;
          f20: string | null;
          f21: string | null;
          f22: string | null;
          f23: string | null;
          f24: string | null;
          f25: string | null;
          rfid_tag: string | null;
          lat: number | null;
          lng: number | null;
          accuracy_m: number | null;
          captured_at: string;
          source_device_id: string | null;
          synced_at: string | null;
        };
        Insert: {
          cntid?: number;
          org_id: string;
          batch_id?: string | null;
          type?: string | null;
          f1?: string | null;
          f2?: string | null;
          f3?: string | null;
          f4?: string | null;
          f5?: string | null;
          f6?: string | null;
          f7?: string | null;
          f8?: string | null;
          f9?: string | null;
          f10?: string | null;
          f11?: string | null;
          f12?: string | null;
          f13?: string | null;
          f14?: string | null;
          f15?: string | null;
          f16?: string | null;
          f17?: string | null;
          f18?: string | null;
          f19?: string | null;
          f20?: string | null;
          f21?: string | null;
          f22?: string | null;
          f23?: string | null;
          f24?: string | null;
          f25?: string | null;
          rfid_tag?: string | null;
          lat?: number | null;
          lng?: number | null;
          accuracy_m?: number | null;
          captured_at: string;
          source_device_id?: string | null;
          synced_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['captures_universal']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Environment configuration with validation
const getEnvVar = (key: string, defaultValue?: string): string => {
  // In React Native, environment variables are available through process.env
  // but need to be configured properly in your build process
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

// Configuration with proper error handling
let supabaseUrl: string;
let supabaseAnonKey: string;

try {
  // These should be set in your environment configuration
  // For Expo, use app.json/app.config.js to set these
  supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
  supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');
} catch (error) {
  // Fallback for development - replace with your actual values
  console.warn('Supabase environment variables not found, using development defaults');
  supabaseUrl = 'https://your-project.supabase.co';
  supabaseAnonKey = 'your-anon-key';
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || supabaseUrl.includes('your-project')) {
  console.error('Invalid Supabase URL. Please set EXPO_PUBLIC_SUPABASE_URL in your environment');
}

if (supabaseAnonKey === 'your-anon-key' || supabaseAnonKey.length < 50) {
  console.error('Invalid Supabase anon key. Please set EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'rfid-mobile-app',
    },
  },
});

export default supabase;