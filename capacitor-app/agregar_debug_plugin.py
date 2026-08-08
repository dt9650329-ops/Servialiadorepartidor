import re

path = "android/app/src/main/java/com/servialiados/repartidor/DeviceOptimizerPlugin.java"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_start = "for (ComponentName cn : candidatos) {"
old_end = "call.resolve(ret);"
start_idx = content.index(old_start)
end_idx = content.index(old_end, start_idx) + len(old_end)

new_block = '''for (ComponentName cn : candidatos) {
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
        call.resolve(ret);'''

content = content[:start_idx] + new_block + content[end_idx:]

content = content.replace(
    "ComponentName[] candidatos;",
    "ComponentName[] candidatos;\n        org.json.JSONArray errores = new org.json.JSONArray();",
    1
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK - archivo actualizado con logging de errores")
