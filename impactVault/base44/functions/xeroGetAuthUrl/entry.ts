import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { redirectUri } = await req.json();
    const clientId = Deno.env.get('XERO_CLIENT_ID');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email accounting.transactions accounting.contacts offline_access',
      state: 'xero_connect',
    });

    const authUrl = `https://login.xero.com/identity/connect/authorize?${params}`;
    return Response.json({ url: authUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});