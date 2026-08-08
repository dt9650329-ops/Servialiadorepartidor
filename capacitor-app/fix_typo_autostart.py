path = "android/app/src/main/java/com/servialiados/repartidor/DeviceOptimizerPlugin.java"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

wrong = "AutoBootMangeActivity"
correct = "AutoBootManageActivity"

count = content.count(wrong)
if count == 0:
    print("No se encontro el typo 'AutoBootMangeActivity' - revisar manualmente")
else:
    content = content.replace(wrong, correct)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK - corregidas {count} ocurrencia(s) de AutoBootMangeActivity -> AutoBootManageActivity")
