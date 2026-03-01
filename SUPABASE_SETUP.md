# SUPABASE SETUP GUIDE

Run each SQL block below in your **Supabase SQL Editor** (project → SQL Editor → New query).

---

## STEP 1 — Create the `profiles` table

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio          TEXT,
  avatar_url   TEXT,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Row-Level Security: users can only read/write their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create a blank profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## STEP 2 — Create the `search_history` table

```sql
CREATE TABLE IF NOT EXISTS public.search_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_name      TEXT,
  destination_name TEXT,
  origin_lat       DOUBLE PRECISION,
  origin_lon       DOUBLE PRECISION,
  dest_lat         DOUBLE PRECISION,
  dest_lon         DOUBLE PRECISION,
  route_count      INTEGER DEFAULT 0,
  best_duration_min INTEGER DEFAULT 0,
  searched_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own searches"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches"
  ON public.search_history FOR DELETE
  USING (auth.uid() = user_id);
```

---

## STEP 3 — Create the Storage Bucket for Avatars

Run this in the **SQL Editor**:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view avatars (they're public)
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Only the owner can upload/update their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## STEP 4 — Insert a profile row for existing users (if any)

Only needed if you already have users who signed up before the trigger was created:

```sql
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

---

That's it! Once these 4 steps are run, the app will be able to:

- Save and read display name, bio, avatar URL per user
- Upload avatar images to the `avatars` storage bucket
- Track and display total searches, destinations, and time saved
