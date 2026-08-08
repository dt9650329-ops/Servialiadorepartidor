path = "android/app/src/main/AndroidManifest.xml"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "<queries>" in content:
    print("Ya existe un bloque <queries> - revisar manualmente si faltan paquetes")
else:
    queries_block = '''    <queries>
        <package android:name="com.transsion.phonemanager" />
        <package android:name="com.transsion.batteryjoint" />
        <package android:name="com.itel.autobootmanage" />
        <package android:name="com.miui.securitycenter" />
        <package android:name="com.coloros.safecenter" />
        <package android:name="com.huawei.systemmanager" />
        <package android:name="com.vivo.permissionmanager" />
        <package android:name="com.iqoo.secure" />
        <package android:name="com.asus.mobilemanager" />
        <package android:name="com.letv.android.letvsafe" />
        <package android:name="com.samsung.android.lool" />
    </queries>
'''
    marker = "<application"
    idx = content.index(marker)
    content = content[:idx] + queries_block + content[idx:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK - bloque queries agregado al manifest")
