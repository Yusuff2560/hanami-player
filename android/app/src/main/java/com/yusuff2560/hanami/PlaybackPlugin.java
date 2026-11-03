package com.yusuff2560.hanami;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** Web arayüzü ile PlaybackService arasındaki köprü. */
@CapacitorPlugin(
        name = "HanamiPlayback",
        permissions = {@Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})}
)
public class PlaybackPlugin extends Plugin {

    @Override
    public void load() {
        PlaybackService.setListener(action -> {
            JSObject data = new JSObject();
            data.put("action", action);
            notifyListeners("action", data);
        });
    }

    @Override
    protected void handleOnDestroy() {
        PlaybackService.setListener(null);
    }

    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, PlaybackService.class).setAction(PlaybackService.ACTION_UPDATE);
        i.putExtra("title", call.getString("title", "HANAMI"));
        i.putExtra("artist", call.getString("artist", ""));
        i.putExtra("playing", Boolean.TRUE.equals(call.getBoolean("playing", false)));
        try {
            // Uygulama ön plandayken başlatılır; servis hemen startForeground çağırır
            ContextCompat.startForegroundService(ctx, i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Servis başlatılamadı: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        ctx.startService(new Intent(ctx, PlaybackService.class).setAction(PlaybackService.ACTION_STOP));
        call.resolve();
    }

    @PluginMethod
    public void ensureNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications").toString().equals("granted")) {
            call.resolve();
            return;
        }
        requestPermissionForAlias("notifications", call, "permissionResult");
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void permissionResult(PluginCall call) {
        call.resolve();
    }
}
