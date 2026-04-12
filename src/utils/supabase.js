import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mntkcxqzqewsowaazoao.supabase.co';
const supabaseKey = 'sb_publishable_qobuvzXBNQBIxI9b1Q6lBQ_uxf8h5p3';

export const supabase = createClient(supabaseUrl, supabaseKey);
