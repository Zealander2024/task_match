create table public.admin_verification_requests (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    document_url text not null,
    status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
    submitted_at timestamp with time zone default now(),
    reviewed_at timestamp with time zone,
    admin_notes text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Add RLS policies
alter table public.admin_verification_requests enable row level security;

-- Users can only read their own requests
create policy "Users can view own verification requests"
    on public.admin_verification_requests for select
    using (auth.uid() = user_id);

-- Users can only insert their own requests
create policy "Users can create verification requests"
    on public.admin_verification_requests for insert
    with check (auth.uid() = user_id);

-- Only admins can update requests
create policy "Admins can update verification requests"
    on public.admin_verification_requests for update
    using (auth.uid() in (select user_id from public.admin_users));

-- Create trigger to update updated_at
create trigger set_updated_at
    before update on public.admin_verification_requests
    for each row
    execute function public.set_updated_at();