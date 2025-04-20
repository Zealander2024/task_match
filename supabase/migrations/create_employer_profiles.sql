create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    company_name text not null,
    company_website text,
    industry text,
    company_size text,
    company_description text,
    headquarters_location text,
    founded_year integer,
    company_logo_url text,
    contact_email text,
    contact_phone text,
    linkedin_url text,
    benefits jsonb,
    culture_description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own employer profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own employer profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own employer profile" ON public.profiles;

-- Create new policies that include admin access
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.uid() = id
    );

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.uid() = id
    );

CREATE POLICY "Admins can delete all profiles"
    ON public.profiles FOR DELETE
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.uid() = id
    );
