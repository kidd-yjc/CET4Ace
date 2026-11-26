package com.cet4ace.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import java.util.Calendar;

/**
 * 每日提醒：AlarmManager 的 setInexactRepeating 每天触发一次，
 * 不申请精确闹钟权限，系统可能推迟几分钟，够用且省电。
 * 关机重启后由 BOOT_COMPLETED 重新排期。
 */
public class ReminderReceiver extends BroadcastReceiver {

    public static final String ACTION_REMIND = "com.cet4ace.app.REMIND";
    private static final int REQ_ALARM = 1001;
    private static final int REQ_OPEN = 1002;
    private static final int NOTIFY_ID = 1003;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            SharedPreferences sp = context.getSharedPreferences("cet4", Context.MODE_PRIVATE);
            if (sp.getBoolean("on", false)) {
                schedule(context, sp.getInt("hour", 20), sp.getInt("minute", 30));
            }
            return;
        }
        notifyNow(context);
    }

    public static void schedule(Context context, int hour, int minute) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(context);
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(),
                AlarmManager.INTERVAL_DAY, pi);
    }

    public static void cancel(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(context);
        am.cancel(pi);
        pi.cancel();
    }

    private static PendingIntent alarmIntent(Context context) {
        Intent i = new Intent(context, ReminderReceiver.class);
        i.setAction(ACTION_REMIND);
        return PendingIntent.getBroadcast(context, REQ_ALARM, i, flags());
    }

    private static int flags() {
        if (Build.VERSION.SDK_INT >= 23) {
            return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.FLAG_UPDATE_CURRENT;
    }

    private void notifyNow(Context context) {
        if (Build.VERSION.SDK_INT >= 33
                && context.checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel("cet4_daily", "四级每日提醒",
                    NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("每天提醒背单词、做专项与整套真题");
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, REQ_OPEN, open, flags());
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, "cet4_daily")
                : new Notification.Builder(context);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle("四级通关 · 今日任务")
                .setContentText("单词、一组专项、一套真题，挑一个先做 20 分钟。")
                .setAutoCancel(true)
                .setContentIntent(pi);
        nm.notify(NOTIFY_ID, b.build());
    }
}
