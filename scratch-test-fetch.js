const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bqjyfberecmetkcletdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxanlmYmVyZWNtZXRrY2xldGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM2MDA4NywiZXhwIjoyMDk4OTM2MDg3fQ.RnH8zapz-ApmnhUamAEIy6DNnohPA0qs3rIW7QvlOXo'
);

async function testFetch() {
  const { data, error, count } = await supabase
    .from('albums')
    .select(`
      id, title, status,
      preview_items:media (id, media_type, title, url, thumbnail_url, medium_url, poster_url)
    `, { count: 'exact' })
    .eq('status', 'public')
    .eq('media.processing_status', 'ready')
    .is('deleted_at', null)
    .order('public_sort_order', { ascending: true })
    .order('sort_order', { referencedTable: 'media', ascending: true })
    .limit(4, { referencedTable: 'media' })
    .range(24, 47);
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Count:", count);
    console.log("Data length:", data.length);
    console.log("First album preview items:", data[0]?.preview_items?.length);
  }
}

testFetch();
