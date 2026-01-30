-- Enable RLS on all tables and block direct API access
-- This is safe because we use Prisma (direct PostgreSQL connection), not the Supabase client

-- CLIENTS & CONTACTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_email_preferences ENABLE ROW LEVEL SECURITY;

-- PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- QUOTES
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- TIME TRACKING
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- EXPENSES
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- CREDENTIALS (sensitive!)
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_history ENABLE ROW LEVEL SECURITY;

-- TEMPLATES & LIBRARY
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_library ENABLE ROW LEVEL SECURITY;

-- SETTINGS & NOTIFICATIONS
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- EMAIL
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies that block all access via API
-- (Prisma bypasses RLS because it uses the postgres/service role)

-- Block all operations for anon and authenticated roles via API
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'clients', 'contacts', 'client_email_preferences',
        'projects', 'project_categories', 'project_tasks',
        'quotes', 'quote_sections', 'quote_items',
        'invoices', 'invoice_items',
        'time_entries',
        'expenses', 'expense_categories',
        'credentials', 'credential_history',
        'quote_templates', 'quote_template_sections', 'quote_template_items',
        'section_library', 'section_library_items', 'item_library',
        'studio_settings', 'notifications',
        'email_logs', 'email_templates'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        -- Drop existing policies if any
        EXECUTE format('DROP POLICY IF EXISTS "Block all access" ON public.%I', tbl);

        -- Create policy that blocks all access (returns false for everyone)
        -- This ensures no one can access data via the Supabase API
        EXECUTE format('CREATE POLICY "Block all access" ON public.%I FOR ALL USING (false)', tbl);
    END LOOP;
END $$;

-- Note: Prisma connections use the postgres role which has BYPASSRLS privilege
-- So these policies won't affect your application, only direct API access
