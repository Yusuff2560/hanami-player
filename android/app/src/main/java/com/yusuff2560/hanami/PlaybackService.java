package com.yusuff2560.hanami;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Müzik çalarken uygulamanın arka planda canlı kalmasını sağlayan medya ön plan servisi.
 * Ses web görünümünde çalmaya devam eder; bu servis süreci yüksek öncelikte tutar ve
 * bildirimde önceki / oynat-duraklat / sonraki düğmelerini gösterir.
 */
public class PlaybackService extends Service {
    public static final String ACTION_UPDATE = "com.yusuff2560.hanami.UPDATE";
    public static final String ACTION_STOP = "com.yusuff2560.hanami.STOP";
    public static final String ACTION_PLAY = "com.yusuff2560.hanami.PLAY";
    public static final String ACTION_PAUSE = "com.yusuff2560.hanami.PAUSE";
    public static final String ACTION_NEXT = "com.yusuff2560.hanami.NEXT";
    public static final String ACTION_PREV = "com.yusuff2560.hanami.PREV";

    private static final String CHANNEL_ID = "hanami_playback";
    private static final int NOTIFICATION_ID = 4711;

    public interface ActionListener {
        void onAction(String action);
    }

    private static ActionListener listener;

    public static void setListener(@Nullable ActionListener l) {
        listener = l;
    }

    private PowerManager.WakeLock wakeLock;
    private String title = "HANAMI";
    private String artist = "";
    private boolean playing = false;
    private boolean foreground = false;

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Müzik çalma", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Çalan şarkı ve oynatma düğmeleri");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "hanami:playback");
        wakeLock.setReferenceCounted(false);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) action = ACTION_UPDATE;

        switch (action) {
            case ACTION_STOP:
                shutDown();
                return START_NOT_STICKY;
            case ACTION_PLAY:
            case ACTION_PAUSE:
            case ACTION_NEXT:
            case ACTION_PREV:
                if (listener != null) listener.onAction(action.substring(action.lastIndexOf('.') + 1).toLowerCase());
                return START_NOT_STICKY;
            default:
                if (intent != null) {
                    title = valueOr(intent.getStringExtra("title"), "HANAMI");
                    artist = valueOr(intent.getStringExtra("artist"), "");
                    playing = intent.getBooleanExtra("playing", false);
                }
                show();
                return START_NOT_STICKY;
        }
    }

    private void show() {
        Notification n = build();
        if (playing) {
            if (!wakeLock.isHeld()) wakeLock.acquire();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(this, NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, n);
            }
            foreground = true;
        } else {
            if (wakeLock.isHeld()) wakeLock.release();
            if (foreground) {
                // Duraklatılınca bildirim kalır ama kaydırılarak kapatılabilir
                ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
                foreground = false;
            }
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, n);
        }
    }

    private Notification build() {
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(artist)
                .setContentIntent(content)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setOngoing(playing)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .addAction(android.R.drawable.ic_media_previous, "Önceki", actionIntent(ACTION_PREV, 1))
                .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        playing ? "Duraklat" : "Oynat", actionIntent(playing ? ACTION_PAUSE : ACTION_PLAY, 2))
                .addAction(android.R.drawable.ic_media_next, "Sonraki", actionIntent(ACTION_NEXT, 3))
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle().setShowActionsInCompactView(0, 1, 2));
        return b.build();
    }

    private PendingIntent actionIntent(String action, int code) {
        Intent i = new Intent(this, PlaybackService.class).setAction(action);
        return PendingIntent.getService(this, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void shutDown() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        foreground = false;
        stopSelf();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Uygulama son uygulamalardan kapatılırsa servis ve bildirim de kapanır
        shutDown();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static String valueOr(String v, String fallback) {
        return v == null || v.isEmpty() ? fallback : v;
    }
}
