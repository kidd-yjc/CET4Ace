package com.cet4ace.app;

import android.app.Activity;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 网页层只拿到“是否已配置 / 掩码 / 地址 / 模型”，拿不到 Key。
 * 所有请求由原生发，Key 只在原生内存里短暂出现。
 */
public class AiBridge {

    private final Activity act;
    private final WebView web;
    private final AiStore store;
    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final Map<String, AiClient.Task> tasks = new ConcurrentHashMap<String, AiClient.Task>();

    public AiBridge(Activity act, WebView web) {
        this.act = act;
        this.web = web;
        this.store = new AiStore(act);
    }

    @JavascriptInterface
    public String getConfig() {
        try {
            JSONObject o = new JSONObject();
            o.put("base", store.base());
            o.put("model", store.model());
            o.put("hasKey", store.hasKey());
            o.put("status", store.status());
            o.put("mask", store.mask());
            o.put("encrypted", store.isEncrypted());
            o.put("sdk", Build.VERSION.SDK_INT);
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public boolean saveConfig(String base, String model, String key) {
        try {
            base = base == null ? "" : base.trim();
            model = model == null ? "" : model.trim();
            key = key == null ? "" : key.trim();
            if (key.length() > 0) key = key.replaceAll("\\s+", "");
            if (base.length() == 0 || base.length() > 500) return false;
            if (!base.startsWith("https://") && !base.startsWith("http://")) return false;
            if (model.length() == 0 || model.length() > 200) return false;
            if (key.length() > 400) return false;
            return store.save(base, model, key);
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void clearConfig() {
        store.clearAll();
    }

    @JavascriptInterface
    public void test(String body, String id) {
        start(body, id, 15000, 30000);
    }

    @JavascriptInterface
    public void grade(String body, String id) {
        start(body, id, 15000, 90000);
    }

    @JavascriptInterface
    public void cancel(String id) {
        if (id == null) return;
        AiClient.Task t = tasks.get(id);
        if (t != null) t.cancel();
    }

    private void start(String body, String id, final int connectMs, final int readMs) {
        if (id == null || id.length() == 0 || id.length() > 80) return;
        if (body == null || body.length() == 0 || body.length() > 300000) {
            deliver(id, false, 0, "", "请求内容为空或过长", 0);
            return;
        }
        String base = store.base();
        if (base.length() == 0) {
            deliver(id, false, 0, "", "还没有填写接口地址", 0);
            return;
        }
        String key = store.key();
        if (key == null) {
            deliver(id, false, 0, "", store.hasKey()
                    ? "已保存的 Key 无法读取，请在设置里重新保存"
                    : "还没有保存 API Key，先在“我的 → AI 作文批改”里配置", 0);
            return;
        }
        final AiClient.Task task = new AiClient.Task();
        tasks.put(id, task);
        final String fBase = base, fKey = key, fBody = body, fId = id;
        pool.execute(new Runnable() {
            @Override
            public void run() {
                long t0 = System.currentTimeMillis();
                AiClient.Res r = AiClient.post(fBase, fKey, fBody, task, connectMs, readMs);
                tasks.remove(fId);
                if (task.cancelled) return;
                boolean ok = r.error.length() == 0 && r.status >= 200 && r.status < 300;
                deliver(fId, ok, r.status, r.body, r.error,
                        System.currentTimeMillis() - t0);
            }
        });
    }

    private void deliver(final String id, final boolean ok, final int status,
                         final String body, final String error, final long ms) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", id);
            o.put("ok", ok);
            o.put("status", status);
            o.put("body", body == null ? "" : body);
            o.put("error", error == null ? "" : error);
            o.put("ms", ms);
            final String js = "(function(){try{if(window.AI&&window.AI._onNative){window.AI._onNative("
                    + JSONObject.quote(o.toString()) + ");}}catch(e){}})();";
            act.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (web != null) web.evaluateJavascript(js, null);
                }
            });
        } catch (Exception ignored) { }
    }

    void shutdown() {
        for (AiClient.Task t : tasks.values()) t.cancel();
        tasks.clear();
        pool.shutdownNow();
    }
}
