package com.cet4ace.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * 极简 WebView 外壳：加载 assets/www/index.html，处理返回键与全屏。
 * 不依赖 AndroidX，方便无 Gradle 直接编译打包。
 */
public class MainActivity extends Activity {

    private WebView web;
    private AiBridge aiBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window w = getWindow();
        w.setStatusBarColor(0xFF0F766E);
        w.setNavigationBarColor(0xFFFFFFFF);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternally(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternally(Uri.parse(url));
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.setBackgroundColor(0xFFF4F6F5);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        web.addJavascriptInterface(new NotifyBridge(), "NotifyBridge");
        aiBridge = new AiBridge(this, web);
        web.addJavascriptInterface(aiBridge, "AIBridge");

        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
    }

    /**
     * 只允许本地 assets 在 WebView 内导航；外部链接交给系统浏览器。
     * 这样远程页面拿不到 NotifyBridge / AIBridge。
     */
    private boolean openExternally(Uri uri) {
        if (uri == null) return true;
        String s = uri.toString();
        if (s.startsWith("file:///android_asset/www/")) return false;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) { }
        return true;
    }

    /** 给网页层用的提醒桥：window.NotifyBridge.setDaily(h, m) / cancel() */
    private class NotifyBridge {
        @JavascriptInterface
        public void setDaily(int hour, int minute) {
            scheduleDaily(hour, minute);
        }

        @JavascriptInterface
        public void cancel() {
            cancelDaily();
        }
    }

    void scheduleDaily(int hour, int minute) {
        if (hour < 0) hour = 0;
        if (hour > 23) hour = 23;
        if (minute < 0) minute = 0;
        if (minute > 59) minute = 59;
        SharedPreferences sp = getSharedPreferences("cet4", MODE_PRIVATE);
        sp.edit().putBoolean("on", true).putInt("hour", hour).putInt("minute", minute).apply();
        ReminderReceiver.schedule(this, hour, minute);
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 2001);
        }
    }

    void cancelDaily() {
        getSharedPreferences("cet4", MODE_PRIVATE).edit().putBoolean("on", false).apply();
        ReminderReceiver.cancel(this);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            web.evaluateJavascript(
                "(function(){try{return (window.App&&window.App.handleAndroidBack)?window.App.handleAndroidBack():false;}catch(e){return false;}})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value == null || value.contains("false") || value.contains("null")) {
                            finish();
                        }
                    }
                });
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (aiBridge != null) aiBridge.shutdown();
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }
}
