create table if not exists public.payment_accounts (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null unique,
    paypal_email varchar(255),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.payment_accounts enable row level security;

create policy "Users can view their own payment account"
    on public.payment_accounts for select
    using (auth.uid() = user_id);

create policy "Users can insert their own payment account"
    on public.payment_accounts for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own payment account"
    on public.payment_accounts for update
    using (auth.uid() = user_id);