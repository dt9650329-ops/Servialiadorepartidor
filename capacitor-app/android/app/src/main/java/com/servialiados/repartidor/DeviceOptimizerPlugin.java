package com.servialiados.repartidor;

import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeviceOptimizer")
public class DeviceOptimizerPlugin extends Plugin {

    private static final String TAG = "DeviceOptimizer";

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
        boolean ignorando = false;
        if (pm != null) {
            ignorando = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        JSObject ret = new JSObject();
        ret.put("ignorandoOptimizacion", ignorando);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            String pkg = getContext().getPackageName();
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + pkg));
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("lanzado", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "No se pudo abrir el diálogo de batería: " + e.getMessage());
            call.reject("No se pudo abrir el diálogo de batería", e);
        }
    }

    @PluginMethod
    public void getManufacturer(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("fabricante", Build.MANUFACTURER);
        ret.put("modelo", Build.MODEL);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAutoStartSettings(PluginCall call) {
        String fabricante = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase();
        boolean abierto = false;

        ComponentName[] candidatos;
        org.json.JSONArray errores = new org.json.JSONArray();

        if (fabricante.contains("xiaomi") || fabricante.contains("redmi") || fabricante.contains("poco")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
                new ComponentName("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")
            };
        } else if (fabricante.contains("huawei") || fabricante.contains("honor")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
                new ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
                new ComponentName("com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
            };
        } else if (fabricante.contains("oppo") || fabricante.contains("realme") || fabricante.contains("oneplus")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
                new ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
                new ComponentName("com.coloros.oppoguardelf", "com.coloros.powermanager.fuelgaue.PowerConsumptionActivity")
            };
        } else if (fabricante.contains("vivo")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
                new ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
                new ComponentName("com.iqoo.secure", "com.iqoo.secure.MainActivity")
            };
        } else if (fabricante.contains("samsung")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"),
                new ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")
            };
        } else if (fabricante.contains("asus")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity")
            };
        } else if (fabricante.contains("letv") || fabricante.contains("leeco")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity")
            };
        } else if (fabricante.contains("transsion") || fabricante.contains("infinix") || fabricante.contains("tecno") || fabricante.contains("itel")) {
            candidatos = new ComponentName[]{
                new ComponentName("com.transsion.phonemanager", "com.transsion.phonemanager.ui.autobootmanage.AutoBootMangeActivity"),
                new ComponentName("com.transsion.batteryjoint", "com.transsion.batteryjoint.act.MainActivity"),
                new ComponentName("com.itel.autobootmanager", "com.itel.autobootmanager.activity.WhiteListActivity")
            };
        } else {
            candidatos = new ComponentName[0];
        }

        for (ComponentName cn : candidatos) {
            try {
                Intent intent = new Intent();
                intent.setComponent(cn);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(intent);
                abierto = true;
                errores.put(cn.getClassName() + ": OK");
                break;
            } catch (Exception e) {
                errores.put(cn.getClassName() + ": " + e.getMessage());
            }
        }

        if (!abierto) {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(intent);
            } catch (Exception e2) {
                Log.e(TAG, "No se pudo abrir ninguna pantalla de ajustes: " + e2.getMessage());
                errores.put("fallback: " + e2.getMessage());
            }
        }

        JSObject ret = new JSObject();
        ret.put("abrioAjustesEspecificos", abierto);
        ret.put("fabricante", Build.MANUFACTURER);
        ret.put("errores", errores.toString());
        call.resolve(ret);
    }
}
