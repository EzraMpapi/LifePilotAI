import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator } from "react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/analytics";
import { ThemeProvider, useTheme } from "../lib/theme";
import { I18nProvider } from "../lib/i18n";
import { authClient } from "../lib/auth";
import { configureNotifications } from "../lib/notify";
import { useAutoUpdates } from "../lib/updates";
import appJson from "../app.json";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 30 } },
});

const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

function Gate() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();
  const { c } = useTheme();

  useEffect(() => {
    if (isPending) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/sign-in");
    if (session && inAuth) router.replace("/(tabs)");
  }, [session, isPending, segments]);

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={c.accent} size="large" />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  useAutoUpdates();
  useEffect(() => { configureNotifications(); }, []);
  return (
    <ErrorBoundary>
      <OneDollarStatsProvider
        config={{ hostname, collectorUrl: "https://r.lilstts.com/events", devmode: true }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <I18nProvider>
                <Gate />
              </I18nProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
