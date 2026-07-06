export async function GET(){

return Response.json({

supabase:
!!process.env.NEXT_PUBLIC_SUPABASE_URL,

r2:
!!process.env.R2_ACCOUNT_ID

})

}