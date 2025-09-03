const SIMPLE_PASSWORD = process.env.SITE_PASSWORD || 'dev123';

export function onRequest({ request, url }: any, next: any) {
  console.log(`Middleware: ${request.method} ${url.pathname}`);
  // Skip auth for static assets
  if (url.pathname.startsWith('/_astro/') || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.png') ||
      url.pathname.includes('favicon')) {
    return next();
  }

  // Check for auth cookie
  const cookies = request.headers.get('cookie') || '';
  const hasAuth = cookies.includes('auth=verified');

  // If accessing login page, handle login
  if (url.pathname === '/login') {
    if (request.method === 'POST') {
      return handleLogin(request);
    }
    if (hasAuth) {
      return Response.redirect(new URL('/', url.origin), 302);
    }
    return next();
  }

  // Redirect to login if not authenticated
  if (!hasAuth) {
    return Response.redirect(new URL('/login', url.origin), 302);
  }

  return next();
}

async function handleLogin(request: any) {
  console.log('handleLogin called');
  try {
    const formData = await request.formData();
    const password = formData.get('password');
    console.log('Password received:', password);
    console.log('Expected password:', SIMPLE_PASSWORD);
    
    if (password === SIMPLE_PASSWORD) {
      console.log('Password correct, redirecting to home');
      const headers = new Headers();
      headers.set('Location', new URL('/', new URL(request.url).origin).toString());
      headers.set('Set-Cookie', 'auth=verified; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400');
      return new Response(null, { status: 302, headers });
    } else {
      console.log('Password incorrect');
      const loginUrl = new URL('/login', new URL(request.url).origin);
      loginUrl.searchParams.set('error', '1');
      return Response.redirect(loginUrl, 302);
    }
  } catch (e) {
    console.log('Error in handleLogin:', e);
    return Response.redirect(new URL('/login', new URL(request.url).origin), 302);
  }
}