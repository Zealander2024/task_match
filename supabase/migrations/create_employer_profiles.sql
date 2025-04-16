create table public.employer_profiles (
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
alter table public.employer_profiles enable row level security;

-- Create policies
create policy "Users can view their own employer profile"
    on public.employer_profiles for select
    using (auth.uid() = id);

create policy "Users can update their own employer profile"
    on public.employer_profiles for update
    using (auth.uid() = id);

create policy "Users can insert their own employer profile"
    on public.employer_profiles for insert
    with check (auth.uid() = id);