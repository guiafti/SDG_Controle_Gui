import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  'https://vdahbmqcowrinmvguurh.supabase.co';

const SUPABASE_ANON_KEY = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYWhibXFjb3dyaW5tdmd1dXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjUyMzcsImV4cCI6MjA5MDQ0MTIzN30.XsYfHIWSqgrhF4AWY-NKqrTMqkLb8qv3UtYU6KamZ5A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
