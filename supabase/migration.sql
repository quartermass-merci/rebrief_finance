-- Rebrief Finances Dashboard — Database Schema
-- Run this in the Supabase SQL Editor after creating your project.

create extension if not exists "uuid-ossp";

-- ============================================================
-- INVOICES
-- ============================================================
create table invoices (
  id            uuid default uuid_generate_v4() primary key,
  invoice_number text not null unique,
  client_name   text not null,
  client_email  text,
  client_address text,
  description   text,
  line_items    jsonb not null default '[]',
  subtotal      numeric(10,2) not null default 0,
  tax_rate      numeric(5,2) not null default 13,
  tax_amount    numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  status        text not null default 'draft'
                check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issued_date   date,
  due_date      date,
  paid_date     date,
  reminder_sent_at timestamptz,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- EXPENSES
-- ============================================================
create table expenses (
  id            uuid default uuid_generate_v4() primary key,
  description   text not null,
  vendor        text,
  category      text not null
                check (category in (
                  'printing', 'design', 'photography', 'writing',
                  'distribution', 'events', 'marketing', 'software',
                  'office', 'travel', 'professional_fees', 'other'
                )),
  amount        numeric(10,2) not null,
  tax_amount    numeric(10,2) not null default 0,
  total         numeric(10,2) not null,
  receipt_url   text,
  expense_date  date not null,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS but allow all operations via service key or anon key.
-- The dashboard itself is password-protected, so we use permissive
-- policies here. Tighten these if you add per-user auth later.
-- ============================================================
alter table invoices enable row level security;
alter table expenses enable row level security;

create policy "Allow all access to invoices"
  on invoices for all
  using (true)
  with check (true);

create policy "Allow all access to expenses"
  on expenses for all
  using (true)
  with check (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_invoices_status on invoices (status);
create index idx_invoices_due_date on invoices (due_date);
create index idx_expenses_date on expenses (expense_date);
create index idx_expenses_category on expenses (category);
