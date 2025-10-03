import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// IMPORTANT: 
// 1. Go to your Supabase project settings > API.
// 2. Find your Project URL and anon public key.
// 3. Replace the placeholder values below with your actual credentials.

const supabaseUrl = 'https://dkjyiwldhltqjxzdrgbj.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRranlpd2xkaGx0cWp4emRyZ2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NjE0NTUsImV4cCI6MjA3NTAzNzQ1NX0.Se2vGk4Lmq4SQq3ANqWNldpTSWgCwWdy8OnPf5CQDCo'; // Replace with your Supabase anon key

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);