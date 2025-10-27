import { initDB } from "@/db/schema";
import { addLog, toastError } from "@/lib/appUtils";
import { updateExpiredBudgets } from "@/lib/budgetUtils";
import { checkPinExists } from "@/lib/pinUtils";
import { getPreferences, setPreferences } from "@/lib/preferenceUtils";
import { startSMSCapture } from "@/lib/smsUtils";
import { Theme } from "@/types/common";
import * as SplashScreen from "expo-splash-screen";
import { colorScheme } from "nativewind";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { isCaptureActive, stopCapture } from "react-native-sms-listener";

const CustomThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  fetchDBTheme: () => Promise<void>;
  smsCaptureState: "on" | "off" | "dnd" | null;
  updateSmsCaptureState: (state: "on" | "off" | "dnd") => Promise<void>;
  pinProtected: boolean;
  setPinProtected: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

export const useCustomThemeContext = () => {
  const context = useContext(CustomThemeContext);
  if (!context) {
    throw new Error(
      `CustomThemeContext must be used within CustomThemeContextProvider`
    );
  }
  return context;
};

export const CustomThemeContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const scheme = useColorScheme();
  const theme = useMemo<Theme>(() => scheme ?? "light", [scheme]);
  const [smsCaptureState, setSmsCaptureState] = useState<
    "on" | "off" | "dnd" | null
  >(null);
  const [pinProtected, setPinProtected] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  const fetchDBTheme = async () => {
    try {
      const preferences = await getPreferences("theme");
      if (preferences.theme) {
        colorScheme.set(preferences.theme as Theme);
      }
    } catch (error) {
      toastError({}, `An error occured while updating theme`);
    }
  };

  useEffect(() => {
    try {
      const startup = async () => {
        if (!mounted) {
          //init db
          await initDB();
          //startup
          const [preferences, isCapture, pinExists] = await Promise.all([
            getPreferences("smsCapture"),
            isCaptureActive(),
            checkPinExists(),
            fetchDBTheme(),
            updateExpiredBudgets(),
          ]);

          if (
            (!isCapture && preferences.smsCapture === "on") ||
            (isCapture && preferences.smsCapture !== "on")
          ) {
            preferences.smsCapture = "off";
            setPreferences({ smsCapture: "off" });
            stopCapture();
          }

          setSmsCaptureState((preferences.smsCapture || null) as any);
          setPinProtected(pinExists);

          addLog({ type: "info", content: "Startup successfull" });
          setMounted(true);
        }
      };
      startup();
    } catch (error) {
      toastError(error, `An error occured on startup`);
    }
  }, [mounted]);

  const toggleTheme = () => {
    try {
      const newTheme = theme === "dark" ? "light" : "dark";
      setPreferences({ theme: newTheme });
      colorScheme.set(newTheme);
    } catch (error) {
      toastError({}, `An error occured while toggling theme`);
    }
  };

  const updateSmsCaptureState = async (state: "on" | "off" | "dnd") => {
    switch (state) {
      case "on":
        await startSMSCapture();
        break;
      case "off":
        await stopCapture();
        break;
      case "dnd":
        await stopCapture();
        break;
      default:
        break;
    }
    const isCapture = await isCaptureActive();
    if ((isCapture && state !== "on") || (!isCapture && state === "on")) {
      throw new Error(
        `An error occured while updating automatic expense capture`,
        { cause: 1 }
      );
    }
    await setPreferences({ smsCapture: state });
    setSmsCaptureState(state);
  };

  if (mounted) {
    SplashScreen.hideAsync();
  }

  return (
    mounted && (
      <CustomThemeContext.Provider
        value={{
          theme,
          toggleTheme,
          fetchDBTheme,
          smsCaptureState,
          updateSmsCaptureState,
          pinProtected,
          setPinProtected,
        }}
      >
        {children}
      </CustomThemeContext.Provider>
    )
  );
};
