package com.servialiados.repartidor;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceOptimizerPlugin.class);
        super.onCreate(savedInstanceState);
        crearCanalesAlarma();
        solicitarExencionBateria();
    }

    // Canales con vibración larga. Los ids deben calzar EXACTO con enviarPush() en index.js
    private void crearCanalesAlarma() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        long[] patron = {0, 1000, 500, 1000, 500, 1000, 500, 1000};
        AudioAttributes aa = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        String[][] canales = {
            {"pedidos_alarma_tono1_v4", "Pedido asignado (alarma, tono 1)", "notif_t1"},
            {"pedidos_alarma_tono2_v4", "Pedido asignado (alarma, tono 2)", "notif_t2"},
            {"aviso_urgente_repartidor_v4", "Avisos urgentes del cliente", "notif_t1"}
        };
        for (String[] c : canales) {
            NotificationChannel ch = new NotificationChannel(
                c[0], c[1], NotificationManager.IMPORTANCE_HIGH);
            ch.enableVibration(true);
            ch.setVibrationPattern(patron);
            ch.enableLights(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setSound(Uri.parse("android.resource://" + getPackageName() + "/raw/" + c[2]), aa);
            nm.createNotificationChannel(ch);
        }
    }

    private void solicitarExencionBateria() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            String packageName = getPackageName();
            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + packageName));
                startActivity(intent);
            }
        }
    }
}
