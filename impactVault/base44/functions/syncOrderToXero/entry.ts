import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getXeroAccessToken(serviceRole) {
  const tokens = await serviceRole.entities.XeroToken.list();
  if (!tokens || tokens.length === 0) {
    throw new Error('Xero not connected. Please connect via Admin → Xero Settings.');
  }
  const tokenRecord = tokens[0];

  const clientId = Deno.env.get('XERO_CLIENT_ID');
  const clientSecret = Deno.env.get('XERO_CLIENT_SECRET');

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRecord.refresh_token,
    }),
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error(`Xero token refresh error: ${JSON.stringify(data)}`);
  }

  // Save the new rotating refresh token
  if (data.refresh_token) {
    await serviceRole.entities.XeroToken.update(tokenRecord.id, {
      refresh_token: data.refresh_token,
    });
  }

  return { accessToken: data.access_token, tenantId: tokenRecord.tenant_id };
}

async function createOrGetContact(accessToken, tenantId, email, name) {
  const searchResponse = await fetch(
    `https://api.xero.com/api.xro/2.0/Contacts?where=EmailAddress=="${email}"`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      },
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.Contacts && searchData.Contacts.length > 0) {
    return searchData.Contacts[0].ContactID;
  }

  const createResponse = await fetch('https://api.xero.com/api.xro/2.0/Contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      Contacts: [{ Name: name || email, EmailAddress: email }]
    }),
  });

  const createData = await createResponse.json();
  if (!createData.Contacts || createData.Contacts.length === 0) {
    throw new Error(`Failed to create Xero contact: ${JSON.stringify(createData)}`);
  }
  return createData.Contacts[0].ContactID;
}

async function createInvoice(accessToken, tenantId, contactId, invoiceNumber, description, amountCents, accountCode) {
  const amountAud = (amountCents / 100).toFixed(2);
  const invoiceDate = new Date().toISOString().split('T')[0];

  const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      Invoices: [{
        Type: 'ACCREC',
        Contact: { ContactID: contactId },
        InvoiceNumber: invoiceNumber,
        Date: invoiceDate,
        Status: 'DRAFT',
        LineItems: [{
          Description: description,
          Quantity: 1,
          UnitAmount: parseFloat(amountAud),
          AccountCode: accountCode,
        }],
      }]
    }),
  });

  const data = await response.json();
  if (!data.Invoices || data.Invoices.length === 0) {
    throw new Error(`Failed to create Xero invoice: ${JSON.stringify(data)}`);
  }
  return data.Invoices[0].InvoiceID;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, planName, contributionAmount, userEmail, userName } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Get line items from Stripe
    const lineItemsRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } }
    );
    const lineItemsData = await lineItemsRes.json();

    let planAmount = 0;
    if (lineItemsData.data) {
      lineItemsData.data.forEach(item => {
        if (!item.description?.includes('Support Contribution')) {
          planAmount = item.amount_total;
        }
      });
    }

    // Get Xero access token from database (not env vars)
    const { accessToken, tenantId } = await getXeroAccessToken(base44.asServiceRole);

    // Create or get Xero contact
    const contactId = await createOrGetContact(accessToken, tenantId, userEmail, userName);

    // Determine account code by plan type
    let accountCode = Deno.env.get('XERO_ACCOUNT_CODE_CORE');
    if (planName?.toLowerCase().includes('family')) {
      accountCode = Deno.env.get('XERO_ACCOUNT_CODE_FAMILY');
    } else if (planName?.toLowerCase().includes('insights')) {
      accountCode = Deno.env.get('XERO_ACCOUNT_CODE_INSIGHTS');
    }

    // Create product invoice
    const invoiceNumber = `IV-${Date.now()}`;
    await createInvoice(accessToken, tenantId, contactId, invoiceNumber, planName, planAmount, accountCode);

    // Create contribution invoice if applicable
    if (contributionAmount && contributionAmount > 0) {
      const contribNumber = `IV-CONTRIB-${Date.now()}`;
      const contribAccountCode = Deno.env.get('XERO_ACCOUNT_CODE_CONTRIBUTION');
      await createInvoice(
        accessToken, tenantId, contactId, contribNumber,
        'Support Contribution (Optional)',
        Math.round(contributionAmount * 100),
        contribAccountCode
      );
    }

    console.log(`Order synced to Xero for ${userEmail}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('Xero sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});