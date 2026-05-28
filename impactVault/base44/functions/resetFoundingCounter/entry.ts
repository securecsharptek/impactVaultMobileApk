import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get existing counter
    const counters = await base44.asServiceRole.entities.FoundingCounter.list();
    
    if (counters.length > 0) {
      // Update existing counter to 0 purchases
      const counter = counters[0];
      await base44.asServiceRole.entities.FoundingCounter.update(counter.id, {
        purchase_count: 0,
        is_active: true,
        last_updated: new Date().toISOString()
      });
      console.log('Founding counter reset to 0 purchases (100 spots available)');
      return Response.json({ success: true, message: 'Counter reset to 0 purchases' });
    } else {
      // Create new counter if none exists
      await base44.asServiceRole.entities.FoundingCounter.create({
        purchase_count: 0,
        is_active: true,
        last_updated: new Date().toISOString()
      });
      console.log('Founding counter initialized to 0 purchases');
      return Response.json({ success: true, message: 'Counter initialized' });
    }
  } catch (error) {
    console.error('Error resetting counter:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});