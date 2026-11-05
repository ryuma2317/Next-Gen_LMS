import type { SupabaseClient } from '@supabase/supabase-js'
export type Bindings={SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;SUPABASE_SECRET_KEY?:string;ENABLE_INVITATIONS?:string;INVITE_REDIRECT_URL?:string;ADMISSIONS_LIMITER?:{limit(input:{key:string}):Promise<{success:boolean}>}}
export type Env={Bindings:Bindings;Variables:{db:SupabaseClient;userId:string}}
