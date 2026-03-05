-- ============================================================
-- PEEL & POST STUDIO — CLIENT PORTAL
-- Full database schema with Row Level Security
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with customer-specific data
-- ============================================================
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text,
  company_name  text,
  avatar_url    text,
  role          text not null default 'customer' check (role in ('customer', 'studio')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ORDERS
-- ============================================================
create table public.orders (
  id            uuid primary key default uuid_generate_v4(),
  order_number  serial unique,
  customer_id   uuid references public.profiles(id) on delete cascade not null,
  
  -- Product details
  product       text not null,
  quantity      integer not null,
  finish        text not null,
  size          text not null,
  shape         text not null,
  turnaround    text not null,
  notes         text,
  
  -- Pricing
  estimated_total numeric(10,2),
  final_total     numeric(10,2),
  
  -- Status
  status        text not null default 'pending' check (status in (
    'pending',        -- Just submitted
    'artwork_needed', -- Waiting for customer artwork
    'in_review',      -- Studio reviewing artwork
    'proof_sent',     -- Proof shared with customer
    'proof_approved', -- Customer approved
    'in_production',  -- Being printed
    'shipped',        -- Shipped
    'delivered',      -- Confirmed delivered
    'cancelled'
  )),
  
  -- Shipping
  tracking_number   text,
  shipped_at        timestamptz,
  estimated_ship_at timestamptz,
  delivered_at      timestamptz,
  
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- PROOFS
-- Proof versions attached to an order
-- ============================================================
create table public.proofs (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references public.orders(id) on delete cascade not null,
  version     integer not null default 1,
  
  -- File
  file_url    text not null,
  file_name   text not null,
  file_size   integer, -- bytes
  
  -- Review status
  status      text not null default 'pending' check (status in (
    'pending',   -- Awaiting customer review
    'approved',  -- Customer approved
    'revision'   -- Customer requested changes
  )),
  feedback    text,  -- Customer revision notes
  reviewed_at timestamptz,
  
  -- Who uploaded it
  uploaded_by uuid references public.profiles(id),
  
  created_at  timestamptz not null default now()
);

-- ============================================================
-- FILES
-- Customer artwork uploads
-- ============================================================
create table public.files (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references public.orders(id) on delete cascade not null,
  uploaded_by uuid references public.profiles(id) not null,
  
  file_url    text not null,
  file_name   text not null,
  file_size   integer,
  file_type   text, -- mime type
  
  created_at  timestamptz not null default now()
);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- One conversation per order
-- ============================================================
create table public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references public.orders(id) on delete cascade unique not null,
  created_at  timestamptz not null default now()
);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) not null,
  
  content         text not null,
  
  -- Optional proof attachment
  proof_id        uuid references public.proofs(id),
  
  -- Optional file attachment
  file_url        text,
  file_name       text,
  
  read_at         timestamptz, -- null = unread
  
  created_at      timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- In-app notification feed
-- ============================================================
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  
  type        text not null check (type in (
    'proof_ready',
    'order_update',
    'message',
    'proof_approved',
    'shipped'
  )),
  title       text not null,
  body        text,
  
  -- Link to the relevant resource
  order_id    uuid references public.orders(id),
  
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Customers can only see their own data
-- Studio role can see everything
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.orders        enable row level security;
alter table public.proofs        enable row level security;
alter table public.files         enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;

-- Helper: is current user the studio?
create or replace function public.is_studio()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'studio'
  );
$$ language sql security definer;

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_studio());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ORDERS
create policy "Customers see own orders"
  on public.orders for select
  using (customer_id = auth.uid() or public.is_studio());

create policy "Customers can create orders"
  on public.orders for insert
  with check (customer_id = auth.uid());

create policy "Studio can update orders"
  on public.orders for update
  using (public.is_studio() or customer_id = auth.uid());

-- PROOFS
create policy "View proofs for own orders"
  on public.proofs for select
  using (
    public.is_studio() or
    exists (
      select 1 from public.orders
      where id = proofs.order_id and customer_id = auth.uid()
    )
  );

create policy "Studio can create proofs"
  on public.proofs for insert
  with check (public.is_studio());

create policy "Customers can update proof status"
  on public.proofs for update
  using (
    public.is_studio() or
    exists (
      select 1 from public.orders
      where id = proofs.order_id and customer_id = auth.uid()
    )
  );

-- FILES
create policy "View files for own orders"
  on public.files for select
  using (
    public.is_studio() or
    exists (
      select 1 from public.orders
      where id = files.order_id and customer_id = auth.uid()
    )
  );

create policy "Customers can upload files to own orders"
  on public.files for insert
  with check (
    uploaded_by = auth.uid() and
    exists (
      select 1 from public.orders
      where id = files.order_id and customer_id = auth.uid()
    )
  );

-- CONVERSATIONS
create policy "View conversations for own orders"
  on public.conversations for select
  using (
    public.is_studio() or
    exists (
      select 1 from public.orders
      where id = conversations.order_id and customer_id = auth.uid()
    )
  );

-- MESSAGES
create policy "View messages in own conversations"
  on public.messages for select
  using (
    public.is_studio() or
    exists (
      select 1 from public.conversations c
      join public.orders o on o.id = c.order_id
      where c.id = messages.conversation_id and o.customer_id = auth.uid()
    )
  );

create policy "Send messages in own conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid() and (
      public.is_studio() or
      exists (
        select 1 from public.conversations c
        join public.orders o on o.id = c.order_id
        where c.id = messages.conversation_id and o.customer_id = auth.uid()
      )
    )
  );

-- NOTIFICATIONS
create policy "Users see own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can mark own notifications read"
  on public.notifications for update
  using (user_id = auth.uid());

-- ============================================================
-- REALTIME
-- Enable realtime subscriptions for live updates
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.proofs;

-- ============================================================
-- STORAGE BUCKETS
-- Run these in Supabase dashboard > Storage
-- ============================================================
-- (These are SQL equivalents — you can also click through the UI)

insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false);
insert into storage.buckets (id, name, public) values ('artwork', 'artwork', false);

-- Storage RLS: customers can upload artwork, studio can upload proofs
create policy "Studio uploads proofs"
  on storage.objects for insert
  with check (bucket_id = 'proofs' and public.is_studio());

create policy "Customers upload artwork"
  on storage.objects for insert
  with check (bucket_id = 'artwork' and auth.uid() is not null);

create policy "Authenticated users can view own files"
  on storage.objects for select
  using (auth.uid() is not null);
