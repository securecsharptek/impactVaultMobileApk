import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertCircle, Link2, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function XeroSettings() {
  const [status, setStatus] = useState(null);
  const [exchanging, setExchanging] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState(null);
  const [testing, setTesting] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const redirectUri = `${window.location.origin}/XeroSettings`;
  const productionUri = `https://impact-vault-care.base44.app/XeroSettings`;
  const previewUri = `https://preview--impact-vault-care.base44.app/XeroSettings`;

  useEffect(() => {
    const init = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (!u || u.role !== 'admin') {
          setLoading(false);
          return;
        }

        // Check if Xero is redirecting back with an auth code
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          window.history.replaceState({}, '', window.location.pathname);
          setExchanging(true);
          try {
            const res = await base44.functions.invoke('xeroExchangeCode', { code, redirectUri });
            if (res.data.success) {
              setMessage({ type: 'success', text: `Successfully connected to ${res.data.tenantName}!` });
            } else {
              setMessage({ type: 'error', text: res.data.error || 'Connection failed' });
            }
          } catch (err) {
            setMessage({ type: 'error', text: err.message });
          }
          setExchanging(false);
        }

        await loadStatus();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const loadStatus = async () => {
    try {
      const tokens = await base44.entities.XeroToken.list();
      if (tokens.length > 0) {
        setStatus({ connected: true, tenantName: tokens[0].tenant_name, connectedAt: tokens[0].connected_at, connectedBy: tokens[0].connected_by });
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setStatus({ connected: false });
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await base44.functions.invoke('xeroGetAuthUrl', { redirectUri });
      // Use window.top to break out of any iframe (e.g. base44 preview)
      window.top.location.href = res.data.url;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setConnecting(false);
    }
  };

  const handleTestSync = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await base44.functions.invoke('syncOrderToXero', {
        sessionId: 'TEST',
        planName: 'Impact Vault Core (TEST)',
        contributionAmount: 0,
        userEmail: user.email,
        userName: user.full_name || user.email,
      });
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Test sync successful! Check Xero → Sales → Invoices for a draft invoice.' });
      } else {
        setMessage({ type: 'error', text: res.data?.error || 'Test sync failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setTesting(false);
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setMessage({ type: 'success', text: 'Redirect URI copied to clipboard!' });
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-stone-600">Admin access required to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Xero Integration</h1>
        <p className="text-stone-500 mt-1 text-sm">Connect your Xero account to automatically sync sales invoices.</p>
      </div>

      {exchanging && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <span className="text-blue-700 font-medium">Connecting to Xero, please wait...</span>
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-3 rounded-xl p-4 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          {message.type === 'success'
            ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          }
          <span className={message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}>{message.text}</span>
        </div>
      )}

      {/* Step 1 - Add redirect URI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center">1</span>
            Add Redirect URI in Xero
          </CardTitle>
          <CardDescription>You only need to do this once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-600">Add <strong>both</strong> of these as Redirect URIs in your Xero app settings (one per line):</p>
          {[productionUri, previewUri].map((uri) => (
            <div
              key={uri}
              className="bg-stone-50 border border-stone-200 rounded-lg p-3 font-mono text-xs break-all flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-100 transition-colors"
              onClick={() => { navigator.clipboard.writeText(uri); setMessage({ type: 'success', text: 'Copied!' }); setTimeout(() => setMessage(null), 2000); }}
            >
              <span className="text-stone-700">{uri}</span>
              <Link2 className="w-4 h-4 text-stone-400 shrink-0" />
            </div>
          ))}
          <p className="text-xs text-stone-400">Click each to copy · Go to developer.xero.com → My Apps → Impact Vault → Configuration</p>
          <a
            href="https://developer.xero.com/app/manage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#13B5EA] hover:underline"
          >
            Open Xero Developer Portal <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>

      {/* Step 2 - Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center">2</span>
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === null ? (
            <div className="flex items-center gap-2 text-stone-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking...
            </div>
          ) : status.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Connected to {status.tenantName}</span>
              </div>
              {status.connectedAt && (
                <p className="text-sm text-stone-400">
                  Connected {new Date(status.connectedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {status.connectedBy ? ` by ${status.connectedBy}` : ''}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleConnect} variant="outline" size="sm" disabled={connecting}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {connecting ? 'Redirecting...' : 'Reconnect / Switch org'}
                </Button>
                <Button onClick={handleTestSync} variant="outline" size="sm" disabled={testing} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing…</> : '🧪 Test Sync'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-stone-400">
                <AlertCircle className="w-5 h-5" />
                <span>Not connected yet</span>
              </div>
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-[#13B5EA] hover:bg-[#0FA8D6] text-white"
              >
                {connecting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to Xero...</>
                ) : (
                  'Connect Xero'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-stone-400 text-center">
        Once connected, all new purchases will automatically create invoices in Xero.
      </p>
    </div>
  );
}