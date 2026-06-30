import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

/**
 * Auto OTA updates.
 *
 * Checks for an EAS Update on app launch and every time the app returns to the
 * foreground. If a new bundle is available it is downloaded silently and applied
 * with a reload, so users always run the latest code without re-downloading from
 * the store.
 *
 * No-ops in development / Expo Go (Updates.isEnabled === false), where Fast
 * Refresh already handles live reload.
 */
async function checkAndApply() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const res = await Updates.checkForUpdateAsync();
    if (res.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {
    // Offline or update server unreachable — keep running current bundle.
  }
}

export function useAutoUpdates() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // On launch
    checkAndApply();

    // On foreground
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        checkAndApply();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);
}
