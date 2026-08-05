// ============================================================
// SERVI ALIADOS — Background Runner (capa de seguridad)
// ============================================================
// Corre en un contexto SEPARADO del WebView principal, programado
// por WorkManager de Android. No se congela cuando la página del
// repartidor sí lo hace, así que sirve como "latido" de respaldo
// para que el perfil nunca quede offline por congelamiento del
// WebView, aunque el GPS en vivo no se actualice aquí (eso lo
// sigue haciendo BackgroundGeolocation mientras la página viva).
//
// No tiene acceso al SDK de Firebase ni al estado de la app: usa
// fetch() nativo + REST API de Firebase, con un refreshToken
// guardado en CapacitorKV por index.html al hacer login.
// ============================================================

const FIREBASE_API_KEY = "AIzaSyAZX7Q5B29Xti4YtV9wXuiREVdkgcclv9U";
const DB_URL = "https://domicilios-1cd74-default-rtdb.firebaseio.com";

async function _obtenerIdTokenFresco(refreshToken) {
    const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
        }
    );
    if (!res.ok) {
        throw new Error(`No se pudo refrescar token: ${res.status}`);
    }
    const data = await res.json();
    return { idToken: data.id_token, refreshToken: data.refresh_token };
}

addEventListener("servialiadosHeartbeat", async (resolve, reject) => {
    try {
        const uidEntry = await CapacitorKV.get("repartidorUID");
        const rtEntry = await CapacitorKV.get("repartidorRefreshToken");

        if (!uidEntry.value || !rtEntry.value) {
            // No hay sesión activa guardada (nunca hizo login o ya cerró
            // sesión) — no hay nada que mantener vivo, salir sin hacer nada.
            resolve();
            return;
        }

        const uid = uidEntry.value;
        const { idToken, refreshToken } = await _obtenerIdTokenFresco(rtEntry.value);

        // Si Firebase rotó el refresh token, guardamos el nuevo para la
        // próxima corrida (normalmente el mismo se puede reusar, pero por
        // seguridad lo actualizamos si viene distinto).
        if (refreshToken && refreshToken !== rtEntry.value) {
            await CapacitorKV.set("repartidorRefreshToken", refreshToken);
        }

        const timestamp = Date.now();
        const url = `${DB_URL}/repartidores_info/${uid}.json?auth=${idToken}`;
        const body = {
            online: true,
            lastSeen: timestamp,
            backgroundRunnerPing: timestamp, // marca que este latido vino del runner, no del WebView
        };

        const patchRes = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!patchRes.ok) {
            throw new Error(`PATCH Firebase falló: ${patchRes.status}`);
        }

        resolve();
    } catch (err) {
        console.error("[BackgroundRunner] error:", err.message || err);
        // Igual resolvemos (no reject) para que el sistema no penalice al
        // runner y siga programando la próxima corrida con normalidad.
        resolve();
    }
});
