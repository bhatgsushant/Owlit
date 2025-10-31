

## Supabase Setup

1. **Create a new project** in [Supabase](https://app.supabase.io/).
2. Go to the **Project Settings** > **API** section.
3. Find your **Project URL** and the **anon** `public` key.
4. Copy these values and paste them into your `.env` file for `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
5. Go to the **SQL Editor** and run the following script to create the `receipts` table:

```sql
CREATE TABLE receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant_name TEXT,
  transaction_date DATE,
  total_amount NUMERIC,
  line_items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

Once you have configured these credentials, your authentication and database systems should be ready to use.
