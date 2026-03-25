-- Expand booking status pipeline for quote-based B2B flow
alter table public.bookings
    drop constraint if exists bookings_status_check;

alter table public.bookings
    add constraint bookings_status_check
    check (status in ('pending', 'quote_sent', 'negotiating', 'confirmed', 'completed', 'cancelled'));

alter table public.bookings
    alter column status set default 'pending';
