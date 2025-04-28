create table admin_users (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  role text not null default 'admin',
  avatar_url text,
  bio text,
  location text,
  department text,
  skills text[],
  join_date timestamp with time zone default timezone('utc'::text, now()) not null,
  last_active timestamp with time zone default timezone('utc'::text, now()) not null,
  is_super_admin boolean default false,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table admin_users enable row level security;

create policy "Admin users are viewable by authenticated admins only"
  on admin_users for select
  using (auth.uid() in (select id from admin_users));

create policy "Admin users can update their own data"
  on admin_users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_admin_users_updated_at
  before update on admin_users
  for each row
  execute function update_updated_at_column();