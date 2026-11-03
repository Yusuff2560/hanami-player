package com.yusuff2560.hanami;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlaybackPlugin.class);
        registerPlugin(MediaPlugin.class);
        super.onCreate(savedInstanceState);
        // Cihazdaki müzikleri doğru Range desteğiyle sunan istek yakalayıcı
        getBridge().setWebViewClient(new MediaWebViewClient(getBridge(), this));
    }
}
