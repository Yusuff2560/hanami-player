package com.yusuff2560.hanami;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * HTTP Range başlığı çözümleme ve sınırlı okuma. Android'e bağlı değildir, bu yüzden bilgisayarda test edilebilir.
 * Capacitor'ın kendi dosya sunucusu Range isteğinde akışı istenen yere sarmadan 206 döndürdüğü için
 * (ileri sarma bozulur), cihazdaki müzikler bu sınıflarla sunulur.
 */
public final class RangeUtil {
    private RangeUtil() {}

    /** [start, end] (ikisi de dahil). partial=false ise tüm dosya (200). */
    public static final class Range {
        public final long start;
        public final long end;
        public final boolean partial;

        Range(long start, long end, boolean partial) {
            this.start = start;
            this.end = end;
            this.partial = partial;
        }

        public long length() {
            return end - start + 1;
        }
    }

    /**
     * @return çözümlenmiş aralık; karşılanamıyorsa (başlangıç dosya sonundan sonra) null (416).
     *         Başlık yok ya da anlaşılamazsa tüm dosya döner (RFC 9110: geçersiz Range yok sayılır).
     */
    public static Range parse(String header, long total) {
        Range full = new Range(0, Math.max(0, total - 1), false);
        if (header == null || total <= 0) return full;
        String h = header.trim();
        if (!h.regionMatches(true, 0, "bytes=", 0, 6)) return full;
        String spec = h.substring(6).trim();
        int comma = spec.indexOf(',');
        if (comma >= 0) spec = spec.substring(0, comma).trim(); // yalnızca ilk aralık
        int dash = spec.indexOf('-');
        if (dash < 0) return full;
        String a = spec.substring(0, dash).trim();
        String b = spec.substring(dash + 1).trim();
        try {
            long start;
            long end;
            if (a.isEmpty()) {
                // son N bayt: "bytes=-500"
                if (b.isEmpty()) return full;
                long suffix = Long.parseLong(b);
                if (suffix <= 0) return null;
                start = Math.max(0, total - suffix);
                end = total - 1;
            } else {
                start = Long.parseLong(a);
                end = b.isEmpty() ? total - 1 : Long.parseLong(b);
                if (start < 0 || (!b.isEmpty() && end < start)) return full;
                if (start >= total) return null;
                if (end >= total) end = total - 1;
            }
            return new Range(start, end, true);
        } catch (NumberFormatException e) {
            return full;
        }
    }

    /** Akışın başından n bayt atlar (skip bazı akışlarda eksik atlayabilir). */
    public static void skipFully(InputStream in, long n) throws IOException {
        long left = n;
        byte[] scratch = null;
        while (left > 0) {
            long skipped = in.skip(left);
            if (skipped > 0) {
                left -= skipped;
                continue;
            }
            if (scratch == null) scratch = new byte[8192];
            int r = in.read(scratch, 0, (int) Math.min(scratch.length, left));
            if (r < 0) throw new IOException("Beklenenden erken bitti");
            left -= r;
        }
    }

    /** En fazla limit bayt okutan akış; kapatılınca asıl akışı da kapatır. */
    public static final class Limited extends FilterInputStream {
        private long remaining;
        private final Runnable onClose;

        public Limited(InputStream in, long limit, Runnable onClose) {
            super(in);
            this.remaining = limit;
            this.onClose = onClose;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int b = in.read();
            if (b >= 0) remaining--;
            return b;
        }

        @Override
        public int read(byte[] buf, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int r = in.read(buf, off, (int) Math.min(len, remaining));
            if (r > 0) remaining -= r;
            return r;
        }

        @Override
        public int available() throws IOException {
            return (int) Math.min(in.available(), remaining);
        }

        @Override
        public long skip(long n) throws IOException {
            long s = in.skip(Math.min(n, remaining));
            if (s > 0) remaining -= s;
            return s;
        }

        @Override
        public void close() throws IOException {
            try {
                super.close();
            } finally {
                if (onClose != null) onClose.run();
            }
        }
    }
}
