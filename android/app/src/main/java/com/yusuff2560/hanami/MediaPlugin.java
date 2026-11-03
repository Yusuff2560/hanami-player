package com.yusuff2560.hanami;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Size;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;

/** Cihazdaki müzikleri (MediaStore) bulur ve kapak resmini verir. Çalma /_hanami_media_/ üzerinden yapılır. */
@CapacitorPlugin(
        name = "HanamiMedia",
        permissions = {
                @Permission(alias = "audio", strings = {Manifest.permission.READ_MEDIA_AUDIO}),
                @Permission(alias = "storage", strings = {Manifest.permission.READ_EXTERNAL_STORAGE})
        }
)
public class MediaPlugin extends Plugin {
    private static final long MIN_DURATION_MS = 15_000; // zil sesi, bildirim sesi gibi kısa kayıtlar müzik sayılmaz

    private boolean hasAccess() {
        String perm = Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_AUDIO : Manifest.permission.READ_EXTERNAL_STORAGE;
        return ContextCompat.checkSelfPermission(getContext(), perm) == PackageManager.PERMISSION_GRANTED;
    }

    private String alias() {
        return Build.VERSION.SDK_INT >= 33 ? "audio" : "storage";
    }

    @PluginMethod
    public void checkAccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (hasAccess()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias(alias(), call, "accessResult");
    }

    @PermissionCallback
    private void accessResult(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAccess());
        call.resolve(ret);
    }

    /** Sistem ayarlarındaki uygulama sayfasını açar (izin kalıcı olarak reddedildiyse kullanıcı oradan açar). */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (!hasAccess()) {
            call.reject("Müzik erişim izni yok", "NO_ACCESS");
            return;
        }
        ContentResolver cr = getContext().getContentResolver();
        String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DISPLAY_NAME
        };
        String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0 AND " + MediaStore.Audio.Media.DURATION + " >= ?";
        String[] args = {String.valueOf(MIN_DURATION_MS)};

        JSArray items = new JSArray();
        try (Cursor c = cr.query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, projection, selection, args, MediaStore.Audio.Media.TITLE + " COLLATE LOCALIZED ASC")) {
            if (c != null) {
                int iId = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int iTitle = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int iArtist = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int iAlbum = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                int iDur = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                int iSize = c.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
                int iMod = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED);
                int iMime = c.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);
                int iName = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
                while (c.moveToNext()) {
                    JSObject o = new JSObject();
                    o.put("id", c.getLong(iId));
                    o.put("title", cleanTitle(c.getString(iTitle), c.getString(iName)));
                    o.put("artist", cleanArtist(c.getString(iArtist)));
                    o.put("album", cleanArtist(c.getString(iAlbum)));
                    o.put("durationMs", c.getLong(iDur));
                    o.put("size", c.getLong(iSize));
                    o.put("modified", c.getLong(iMod));
                    o.put("mime", c.getString(iMime));
                    items.put(o);
                }
            }
        } catch (SecurityException e) {
            call.reject("Müzik erişim izni yok", "NO_ACCESS");
            return;
        } catch (Exception e) {
            call.reject("Müzikler okunamadı: " + e.getMessage());
            return;
        }
        JSObject ret = new JSObject();
        ret.put("items", items);
        call.resolve(ret);
    }

    /** Şarkının gömülü kapağı; yoksa sistemin küçük resmi. Yoksa data alanı olmadan döner. */
    @PluginMethod
    public void cover(PluginCall call) {
        Long id = call.getLong("id");
        if (id == null || !hasAccess()) {
            call.resolve(new JSObject());
            return;
        }
        Context ctx = getContext();
        Uri uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
        byte[] bytes = null;
        String mime = "image/jpeg";

        MediaMetadataRetriever mmr = new MediaMetadataRetriever();
        try {
            mmr.setDataSource(ctx, uri);
            bytes = mmr.getEmbeddedPicture();
        } catch (Exception ignored) {
            // gömülü kapak okunamadı, küçük resim denenecek
        } finally {
            try {
                mmr.release();
            } catch (Exception ignored) {
                // zaten bırakılmış
            }
        }

        if (bytes == null && Build.VERSION.SDK_INT >= 29) {
            try {
                Bitmap bmp = ctx.getContentResolver().loadThumbnail(uri, new Size(512, 512), null);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                bmp.compress(Bitmap.CompressFormat.JPEG, 88, out);
                bytes = out.toByteArray();
            } catch (Exception ignored) {
                // kapak yok
            }
        }

        JSObject ret = new JSObject();
        if (bytes != null && bytes.length > 0 && bytes.length < 6_000_000) {
            ret.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
            ret.put("mime", mime);
        }
        call.resolve(ret);
    }

    private static String cleanTitle(String title, String displayName) {
        if (title != null && !title.trim().isEmpty() && !title.equals("<unknown>")) return title.trim();
        if (displayName == null) return "Bilinmeyen şarkı";
        int dot = displayName.lastIndexOf('.');
        return dot > 0 ? displayName.substring(0, dot) : displayName;
    }

    private static String cleanArtist(String v) {
        return v == null || v.equals("<unknown>") ? "" : v.trim();
    }
}
