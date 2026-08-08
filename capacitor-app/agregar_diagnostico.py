path = "android/app/src/main/java/com/servialiados/repartidor/DeviceOptimizerPlugin.java"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

marker = "@PluginMethod\n    public void openAutoStartSettings(PluginCall call) {"
if marker not in content:
    print("No se encontro el marcador openAutoStartSettings - revisar manualmente")
else:
    new_method = '''@PluginMethod
    public void listActivities(PluginCall call) {
        String packageName = call.getString("packageName", "com.transsion.phonemanager");
        JSObject ret = new JSObject();
        try {
            android.content.pm.PackageManager pm = getContext().getPackageManager();
            android.content.pm.PackageInfo info = pm.getPackageInfo(packageName, android.content.pm.PackageManager.GET_ACTIVITIES);
            org.json.JSONArray nombres = new org.json.JSONArray();
            if (info.activities != null) {
                for (android.content.pm.ActivityInfo ai : info.activities) {
                    nombres.put(ai.name);
                }
            } else {
                nombres.put("(sin actividades listadas)");
            }
            ret.put("paquete", packageName);
            ret.put("actividades", nombres.toString());
        } catch (Exception e) {
            ret.put("paquete", packageName);
            ret.put("error", e.getMessage());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openAutoStartSettings(PluginCall call) {'''

    content = content.replace(marker, new_method, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK - metodo listActivities agregado")
