import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/site-settings';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ shortcode: string }> }) {
  const { shortcode } = await params;
  const normalizedCode = shortcode.toLowerCase();
  
  const settings = await getSiteSettings();
  
  // Default vanity URLs if not set in DB
  const vanityUrls = settings.advanced_settings?.vanity_urls || {
    ig: 'instagram',
    tt: 'tiktok',
    fb: 'facebook',
    zl: 'zalo',
    x: 'x',
    tele: 'telegram',
    wa: 'whatsapp'
  };

  const source = vanityUrls[normalizedCode];
  if (source) {
    const response = NextResponse.redirect(new URL('/', request.url));
    const cookieStore = await cookies();
    cookieStore.set('signup_source', source, { maxAge: 60 * 60 * 24 * 30 }); // 30 days
    return response;
  }

  // Not a registered vanity URL, return 404 so Next.js handles it as a standard 404
  return new NextResponse('Not Found', { status: 404 });
}
