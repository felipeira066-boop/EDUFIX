create table public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null check (char_length(display_name) between 1 and 80),
    grade_band text check (grade_band in ('EF1', 'EF2', 'EM')),
    coins integer not null default 500 check (coins >= 0),
    has_study_pass boolean not null default false,
    created_at timestamptz not null default now()
);

create table public.user_inventory (
    user_id uuid not null references public.profiles (user_id) on delete cascade,
    product_id text not null check (product_id in ('skin-aurora', 'extra-life', 'double-xp', 'coin-bonus')),
    quantity integer not null check (quantity > 0),
    primary key (user_id, product_id)
);

alter table public.profiles enable row level security;
alter table public.user_inventory enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (grade_band) on table public.profiles to authenticated;
revoke all on table public.user_inventory from anon, authenticated;
grant select on table public.user_inventory to authenticated;

create policy "Users can read their own profile"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can update their own study plan"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users can read their own inventory"
    on public.user_inventory for select to authenticated
    using ((select auth.uid()) = user_id);

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (user_id, display_name)
    values (
        new.id,
        left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Estudante'), 80)
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.create_profile_for_new_user();

create function public.purchase_product(p_product_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_price integer;
    v_balance integer;
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'authentication_required' using errcode = '28000';
    end if;

    v_price := case p_product_id
        when 'skin-aurora' then 150
        when 'extra-life' then 100
        when 'double-xp' then 200
        when 'coin-bonus' then 75
        else null
    end;

    if v_price is null then
        raise exception 'invalid_product' using errcode = '22023';
    end if;

    update public.profiles
    set coins = coins - v_price
    where user_id = v_user_id and coins >= v_price
    returning coins into v_balance;

    if not found then
        if not exists (select 1 from public.profiles where user_id = v_user_id) then
            raise exception 'profile_not_found' using errcode = 'P0002';
        end if;
        raise exception 'insufficient_coins' using errcode = 'P0001';
    end if;

    insert into public.user_inventory (user_id, product_id, quantity)
    values (v_user_id, p_product_id, 1)
    on conflict (user_id, product_id)
    do update set quantity = public.user_inventory.quantity + 1;

    return jsonb_build_object('product_id', p_product_id, 'coins', v_balance);
end;
$$;

revoke all on function public.purchase_product(text) from public, anon;
grant execute on function public.purchase_product(text) to authenticated;
