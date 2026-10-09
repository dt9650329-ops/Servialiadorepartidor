package com.servialiados.repartidor;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

// Hereda del servicio del plugin para que TODO lo demás (token, push normales, avisos en
// primer plano) siga funcionando igual. Solo intercepta los mensajes con alarma="1".
// Si tu versión del plugin tiene otro paquete/clase, ajusta este import (ver instrucciones).
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;

public class AlarmaMessagingService extends MessagingService {
    static final int ID_ALARMA = 7711; // el JS (index.html) cancela esta misma id al abrir la app

    @Override
    public void onMessageReceived(RemoteMessage msg) {
        Map<String, String> d = msg.getData();
        if ("1".equals(d.get("alarma")) && !MainActivity.enPrimerPlano) {
            mostrarAlarma(d);
            return;
        }
        super.onMessageReceived(msg);
    }

    private void mostrarAlarma(Map<String, String> d) {
        String canal = d.get("canal");
        if (canal == null || canal.isEmpty()) canal = "pedidos_alarma_tono1_v4";
        String titulo = d.get("title") != null ? d.get("title") : "Pedido asignado";
        String cuerpo = d.get("body") != null ? d.get("body") : "Entra a la app y acéptalo.";

        Intent abrir = new Intent(this, MainActivity.class);
        abrir.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, abrir,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, canal)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(titulo)
                .setContentText(cuerpo)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(cuerpo))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setTimeoutAfter(10 * 60 * 1000); // tope de seguridad: 10 min

        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT; // repite sonido y vibración sin parar

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(ID_ALARMA, n);
    }
}
