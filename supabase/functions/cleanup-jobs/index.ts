// Supabase Edge Function: Cleanup expired print files from Supabase Storage bucket
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader && process.env.CRON_SECRET) {
      const secret = req.headers.get('x-cron-secret');
      if (secret !== process.env.CRON_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const bucketName = Deno.env.get('SUPABASE_STORAGE_BUCKET') || 'print-files';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch print jobs where delete_at < now() and retention_extended = false and file_url is not null
    const { data: expiredJobs, error } = await supabase
      .from('print_jobs')
      .select('id, file_url')
      .lt('delete_at', new Date().toISOString())
      .eq('retention_extended', false)
      .not('file_url', 'is', null);

    if (error) {
      console.error('Error fetching expired jobs:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!expiredJobs || expiredJobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired print files to cleanup', cleaned: 0 }), { status: 200 });
    }

    let cleanedCount = 0;

    for (const job of expiredJobs) {
      if (job.file_url) {
        // Extract key from URL or assume key stored in file_url
        const fileKey = job.file_url.includes('/')
          ? job.file_url.substring(job.file_url.indexOf('uploads/'))
          : job.file_url;

        try {
          const { error: removeErr } = await supabase.storage.from(bucketName).remove([fileKey]);
          if (removeErr) {
            console.warn(`Failed to delete object ${fileKey} from Supabase Storage:`, removeErr);
          }
        } catch (storageErr) {
          console.warn(`Exception deleting object ${fileKey}:`, storageErr);
        }

        // Null out file_url in DB to confirm cleanup
        await supabase.from('print_jobs').update({ file_url: null }).eq('id', job.id);
        cleanedCount++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Successfully cleaned up ${cleanedCount} expired print files`, cleanedCount }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error('Unhandled cleanup error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
