import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { code, redirectUri } = await req.json();
    const clientId = Deno.env.get('XERO_CLIENT_ID');
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET');

    // Exchange auth code for tokens
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.refresh_token) {
      return Response.json({ error: `Token exchange failed: ${JSON.stringify(tokenData)}` }, { status: 400 });
    }

    // Get the Xero tenant ID
    const connectionsRes = await fetch('https://api.xero.com/connections', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const connections = await connectionsRes.json();

    if (!connections || connections.length === 0) {
      return Response.json({ error: 'No Xero organisations found. Make sure you select an org during authorisation.' }, { status: 400 });
    }

    const tenantId = connections[0].tenantId;
    const tenantName = connections[0].tenantName;

    // Save tokens to database
    const tokenRecord = {
      refresh_token: tokenData.refresh_token,
      tenant_id: tenantId,
      tenant_name: tenantName,
      connected_at: new Date().toISOString(),
      connected_by: user.email,
    };

    const existing = await base44.asServiceRole.entities.XeroToken.list();
    if (existing.length > 0) {
      await base44.asServiceRole.entities.XeroToken.update(existing[0].id, tokenRecord);
    } else {
      await base44.asServiceRole.entities.XeroToken.create(tokenRecord);
    }

    console.log(`Xero connected by ${user.email} to org: ${tenantName}`);
    return Response.json({ success: true, tenantName });
  } catch (error) {
    console.error('Xero exchange error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});