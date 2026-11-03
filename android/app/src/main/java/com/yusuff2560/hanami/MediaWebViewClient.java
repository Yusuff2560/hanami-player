package com.yusuff2560.hanami;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Cihazdaki müzikleri web görünümüne sunar: https://localhost/_hanami_media_/<MediaStore ses kimliği>.
 * Capacitor'ın yerleşik içerik sunucusu Range isteğini doğru karşılamadığı için (ileri sarma bozulur)
 * kendi sunucumuzu kullanıyoruz. Yalnızca MediaStore ses kayıtları açılır; başka adresler dokunulmadan geçer.
 */
public class MediaWebViewClient extends BridgeWebViewClient {
    public static final String PATH_PREFIX = "/_hanami_media_/";

    private final Bridge bridge;
    private final Context context;

    public MediaWebViewClient(Bridge bridge, Context context) {
        super(bridge);
        this.bridge = bridge;
        this.context = context.getApplicationContext();
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri url = request.getUrl();
        String path = url.getPath();
        if (path != null && path.startsWith(PATH_PREFIX) && bridge.getHost().equals(url.getHost())) {
            return serve(request, path.substring(PATH_PREFIX.length()));
        }
        return super.shouldInterceptRequest(view, request);
    }

    private WebResourceResponse serve(WebResourceRequest request, String idText) {
        long id;
        try {
            id = Long.parseLong(idText);
        } catch (NumberFormatException e) {
            return error(400, "Bad Request");
        }
        Uri uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
        ContentResolver cr = context.getContentResolver();

        AssetFileDescriptor afd;
        try {
            afd = cr.openAssetFileDescriptor(uri, "r");
        } catch (SecurityException e) {
            return error(403, "Forbidden"); // müzik izni verilmemiş
        } catch (Exception e) {
            return error(404, "Not Found");
        }
        if (afd == null) return error(404, "Not Found");

        try {
            long total = afd.getLength();
            if (total < 0) total = afd.getParcelFileDescriptor().getStatSize();

            Map<String, String> req = request.getRequestHeaders();
            String rangeHeader = req.get("Range") != null ? req.get("Range") : req.get("range");
            RangeUtil.Range range = RangeUtil.parse(rangeHeader, total);

            Map<String, String> headers = new HashMap<>();
            headers.put("Accept-Ranges", "bytes");
            headers.put("Cache-Control", "no-store");

            if (range == null) {
                headers.put("Content-Range", "bytes */" + total);
                closeQuietly(afd);
                return new WebResourceResponse("text/plain", "utf-8", 416, "Range Not Satisfiable", headers, new ByteArrayInputStream(new byte[0]));
            }

            FileInputStream in = afd.createInputStream();
            if (range.start > 0) RangeUtil.skipFully(in, range.start);
            final AssetFileDescriptor toClose = afd;
            InputStream body = new RangeUtil.Limited(in, range.length(), () -> closeQuietly(toClose));

            String mime = cr.getType(uri);
            if (mime == null || mime.isEmpty()) mime = "audio/mpeg";
            headers.put("Content-Length", String.valueOf(range.length()));
            if (range.partial) headers.put("Content-Range", "bytes " + range.start + "-" + range.end + "/" + total);

            return new WebResourceResponse(
                mime,
                null,
                range.partial ? 206 : 200,
                range.partial ? "Partial Content" : "OK",
                headers,
                body
            );
        } catch (IOException | RuntimeException e) {
            closeQuietly(afd);
            return error(500, "Internal Server Error");
        }
    }

    private static WebResourceResponse error(int code, String reason) {
        return new WebResourceResponse("text/plain", "utf-8", code, reason, new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private static void closeQuietly(AssetFileDescriptor afd) {
        try {
            afd.close();
        } catch (IOException ignored) {
            // zaten kapalı
        }
    }
}
