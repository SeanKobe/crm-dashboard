import { getSupabase } from '../lib/supabase'
import { DataError, describeDbError } from './remote/errors'

// Puts the sample data of the three demo accounts back to how seed.sql creates it. The work is done by the database function
// reset_demo_data() (migration 20251029000001), which only the demo accounts may call and which never touches anybody else's rows.
export async function resetDemoData(): Promise<void> {
  const supabase = await getSupabase()
  if (!supabase) throw new DataError('The demo data can only be reset when you are signed in.')
  const { error } = await supabase.rpc('reset_demo_data')
  if (error) {
    if (error.code === '42501') throw new DataError('Only the demo accounts can reset the demo data.', 'permission')
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) throw new DataError('Resetting the demo data isn’t set up on this project yet.', 'missing')
    throw describeDbError(error, 'reset the demo data')
  }
}

export const demoService = { reset: resetDemoData }
