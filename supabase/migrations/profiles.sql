create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    user_email text,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    profile_completed boolean default false,
    is_verified boolean default false,
    role text,
    bio text
);

-- Create policies
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );