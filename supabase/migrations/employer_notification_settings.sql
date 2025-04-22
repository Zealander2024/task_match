create table employer_notification_settings (
  employer_id uuid references auth.users(id) primary key,
  settings jsonb not null default '{
    "newApplications": true,
    "candidateMessages": true,
    "jobAlerts": true,
    "marketingEmails": false
  }',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table employer_notification_settings enable row level security;

-- Create policies
create policy "Users can view their own notification settings"
  on employer_notification_settings for select
  using (auth.uid() = employer_id);

create policy "Users can update their own notification settings"
  on employer_notification_settings for update
  using (auth.uid() = employer_id);

create policy "Users can insert their own notification settings"
  on employer_notification_settings for insert
  with check (auth.uid() = employer_id);