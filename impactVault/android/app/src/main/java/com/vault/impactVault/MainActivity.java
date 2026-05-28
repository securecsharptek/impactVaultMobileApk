package com.vault.impactVault;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final String TAG = "MainActivity";

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    
    // Log deep link for debugging
    Uri data = intent.getData();
    if (data != null) {
      Log.d(TAG, "Deep link received: " + data.toString());
    }
  }
}

