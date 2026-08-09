import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/config';

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
