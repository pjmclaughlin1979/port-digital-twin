import { useCallback, useEffect, useState } from "react";

// ArcGIS Online OAuth 2.0 application registered in the org that owns this
// deployment. This is a public browser-app client id (Authorization Code +
// PKCE, no client secret) — not sensitive, same handling as the Google Maps
// key: an env var injected at build time from a GitHub secret.
const OAUTH_APP_ID = import.meta.env.VITE_ARCGIS_OAUTH_CLIENT_ID;
const PORTAL_URL = "https://www.arcgis.com";

// Every visitor must sign in with a named ArcGIS Online user before the
// scene loads. Registers the OAuth app once, then checks/holds sign-in
// status for the app to gate on.
export function useArcGISAuth() {
  const [status, setStatus] = useState("checking"); // "checking" | "signed-out" | "signed-in" | "error"
  const [username, setUsername] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!OAUTH_APP_ID) {
        if (!cancelled) {
          setError(
            "Sign-in isn't configured for this deployment (missing VITE_ARCGIS_OAUTH_CLIENT_ID)."
          );
          setStatus("error");
        }
        return;
      }

      try {
        const [OAuthInfoModule, IdentityManagerModule] = await Promise.all([
          import("@arcgis/core/identity/OAuthInfo.js"),
          import("@arcgis/core/identity/IdentityManager.js"),
        ]);
        if (cancelled) return;

        const OAuthInfo = OAuthInfoModule.default;
        const esriId = IdentityManagerModule.default;

        esriId.registerOAuthInfos([
          new OAuthInfo({
            appId: OAUTH_APP_ID,
            portalUrl: PORTAL_URL,
            popup: false,
            flowType: "auto",
          }),
        ]);

        const credential = await esriId.checkSignInStatus(`${PORTAL_URL}/sharing`);
        if (cancelled) return;
        setUsername(credential?.userId ?? null);
        setStatus("signed-in");
      } catch {
        if (!cancelled) setStatus("signed-out");
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(() => {
    import("@arcgis/core/identity/IdentityManager.js").then((module) => {
      // popup: false means this navigates the whole page away to the
      // ArcGIS Online login screen and back — it doesn't resolve here.
      module.default.getCredential(`${PORTAL_URL}/sharing`);
    });
  }, []);

  const signOut = useCallback(() => {
    import("@arcgis/core/identity/IdentityManager.js").then((module) => {
      module.default.destroyCredentials();
      window.location.reload();
    });
  }, []);

  return { status, username, error, signIn, signOut };
}
