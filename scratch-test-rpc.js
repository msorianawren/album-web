const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bqjyfberecmetkcletdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxanlmYmVyZWNtZXRrY2xldGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM2MDA4NywiZXhwIjoyMDk4OTM2MDg3fQ.RnH8zapz-ApmnhUamAEIy6DNnohPA0qs3rIW7QvlOXo'
);

async function testFetch() {
  const { data, error } = await supabase.rpc("list_album_summaries", {
    p_status: 'public',
    p_query: null,
    p_limit: 1000,
    p_cursor_sort: null,
    p_cursor_created_at: null,
    p_cursor_id: null
  });
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Data length:", data.length);
  }
}

testFetch();
