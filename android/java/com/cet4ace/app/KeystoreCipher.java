package com.cet4ace.app;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Android Keystore 里的一把 AES-256-GCM 密钥，只在本机加密 API Key 用。 */
final class KeystoreCipher {

    private static final String ALIAS = "cet4_ai_key_v1";

    private KeystoreCipher() { }

    static String[] encrypt(String plain) {
        try {
            SecretKey key = getOrCreateKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] iv = cipher.getIV();
            byte[] ct = cipher.doFinal(plain.getBytes("UTF-8"));
            return new String[]{
                    Base64.encodeToString(ct, Base64.NO_WRAP),
                    Base64.encodeToString(iv, Base64.NO_WRAP)
            };
        } catch (Exception e) {
            return null;
        }
    }

    static String decrypt(String ctBase64, String ivBase64) {
        try {
            SecretKey key = getOrCreateKey();
            byte[] ct = Base64.decode(ctBase64, Base64.NO_WRAP);
            byte[] iv = Base64.decode(ivBase64, Base64.NO_WRAP);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(ct), "UTF-8");
        } catch (Exception e) {
            return null;
        }
    }

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(ALIAS)) {
            try {
                return (SecretKey) ks.getKey(ALIAS, null);
            } catch (Exception e) {
                // 系统密钥被重置/失效：删掉旧别名，重新生成一把
                try { ks.deleteEntry(ALIAS); } catch (Exception ignored) { }
            }
        }
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        kg.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return kg.generateKey();
    }
}
