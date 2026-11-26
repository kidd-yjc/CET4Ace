package com.cet4ace.app;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;

import javax.net.ssl.SSLException;

/** 原生 HTTPS 转发：网页层不接触 API Key，也不受浏览器 CORS 限制。 */
final class AiClient {

    static final class Task {
        volatile HttpURLConnection conn;
        volatile boolean cancelled;

        void cancel() {
            cancelled = true;
            HttpURLConnection c = conn;
            if (c != null) {
                try { c.disconnect(); } catch (Exception ignored) { }
            }
        }
    }

    static final class Res {
        int status;
        String body = "";
        String error = "";
    }

    private AiClient() { }

    static Res post(String url, String key, String body, Task task, int connectMs, int readMs) {
        Res r = new Res();
        HttpURLConnection c = null;
        try {
            URL u = new URL(url);
            String proto = u.getProtocol();
            if (!"https".equalsIgnoreCase(proto) && !"http".equalsIgnoreCase(proto)) {
                r.error = "接口地址必须以 http:// 或 https:// 开头";
                return r;
            }
            c = (HttpURLConnection) u.openConnection();
            task.conn = c;
            c.setConnectTimeout(connectMs);
            c.setReadTimeout(readMs);
            c.setRequestMethod("POST");
            c.setDoOutput(true);
            c.setInstanceFollowRedirects(false);
            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            c.setRequestProperty("Accept", "application/json");
            c.setRequestProperty("Accept-Encoding", "identity");
            c.setRequestProperty("Connection", "close");
            c.setRequestProperty("Authorization", "Bearer " + key);
            c.setRequestProperty("User-Agent", "CET4Ace/1.5");

            byte[] data = body.getBytes(StandardCharsets.UTF_8);
            c.setFixedLengthStreamingMode(data.length);
            OutputStream os = c.getOutputStream();
            os.write(data);
            os.flush();
            os.close();

            r.status = c.getResponseCode();
            InputStream is = (r.status >= 200 && r.status < 300) ? c.getInputStream() : c.getErrorStream();
            r.body = readLimited(is, 600000);
        } catch (SocketTimeoutException e) {
            r.error = task.cancelled ? "已取消" : "请求超时，检查网络，或换一个更快的模型";
        } catch (UnknownHostException e) {
            r.error = "无法解析接口域名，检查网络和接口地址";
        } catch (SSLException e) {
            r.error = "HTTPS 证书校验失败，检查接口地址是否被篡改";
        } catch (IOException e) {
            r.error = task.cancelled ? "已取消" : ("网络错误：" + safe(e.getMessage()));
        } catch (Exception e) {
            r.error = "请求失败：" + safe(e.getMessage());
        } finally {
            if (c != null) {
                try { c.disconnect(); } catch (Exception ignored) { }
            }
            task.conn = null;
        }
        return r;
    }

    private static String readLimited(InputStream is, int limit) throws IOException {
        if (is == null) return "";
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        boolean truncated = false;
        while ((n = is.read(buf)) != -1) {
            if (bos.size() + n > limit) {
                bos.write(buf, 0, limit - bos.size());
                truncated = true;
                break;
            }
            bos.write(buf, 0, n);
        }
        try { is.close(); } catch (Exception ignored) { }
        String text = new String(bos.toByteArray(), StandardCharsets.UTF_8);
        return truncated ? text + "[响应过长已截断]" : text;
    }

    private static String safe(String s) {
        if (s == null) return "";
        if (s.length() > 180) s = s.substring(0, 180);
        return s.replace("\n", " ").replace("\r", " ");
    }
}
