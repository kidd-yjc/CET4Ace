package com.cet4ace.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Base64;

import java.nio.charset.StandardCharsets;

/**
 * AI 配置只保存在应用私有 SharedPreferences：
 * - Android 6.0+：API Key 用 Android Keystore 的 AES-GCM 加密，密文落盘；
 * - Android 5.x：系统没有 Keystore AES，Key 只做应用私有存储（不加密），并在界面明确提示。
 * 任何情况下都不把 Key 回传给网页层，也不写日志。
 */
final class AiStore {

    private static final String PREF = "cet4_ai";
    private final SharedPreferences sp;

    AiStore(Context ctx) {
        sp = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    String base() {
        return sp.getString("base", "");
    }

    String model() {
        return sp.getString("model", "");
    }

    boolean hasKey() {
        return sp.getString("key_ct", "").length() > 0;
    }

    boolean isEncrypted() {
        return Build.VERSION.SDK_INT >= 23 && sp.getBoolean("enc", false) && hasKey();
    }

    /** 读不到（密钥失效/系统版本低且数据损坏）返回 null。 */
    String key() {
        String ct = sp.getString("key_ct", "");
        if (ct.length() == 0) return null;
        try {
            if (sp.getBoolean("enc", false)) {
                if (Build.VERSION.SDK_INT < 23) return null;
                String iv = sp.getString("key_iv", "");
                if (iv.length() == 0) return null;
                return KeystoreCipher.decrypt(ct, iv);
            }
            return new String(Base64.decode(ct, Base64.NO_WRAP), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    /** empty / ok / broken */
    String status() {
        if (!hasKey()) return "empty";
        return key() == null ? "broken" : "ok";
    }

    String mask() {
        String k = key();
        if (k == null) return "";
        if (k.length() <= 8) return "已保存（" + k.length() + " 位）";
        return k.substring(0, 4) + "****" + k.substring(k.length() - 4);
    }

    /** key 为空表示保留原 Key；base/model 总会更新。 */
    boolean save(String base, String model, String key) {
        SharedPreferences.Editor e = sp.edit()
                .putString("base", base == null ? "" : base.trim())
                .putString("model", model == null ? "" : model.trim());
        if (key != null && key.trim().length() > 0) {
            String k = key.trim();
            if (Build.VERSION.SDK_INT >= 23) {
                String[] enc = KeystoreCipher.encrypt(k);
                if (enc == null) return false;
                e.putString("key_ct", enc[0])
                        .putString("key_iv", enc[1])
                        .putBoolean("enc", true);
            } else {
                e.putString("key_ct", Base64.encodeToString(k.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP))
                        .putBoolean("enc", false)
                        .remove("key_iv");
            }
        }
        e.apply();
        return true;
    }

    void clearKey() {
        sp.edit().remove("key_ct").remove("key_iv").remove("enc").apply();
    }

    void clearAll() {
        sp.edit().clear().apply();
    }
}
