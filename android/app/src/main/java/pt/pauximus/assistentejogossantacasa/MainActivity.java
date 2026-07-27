package pt.pauximus.assistentejogossantacasa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NativeGoogleAuthPlugin.class);
    registerPlugin(NativeMlKitTextPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
