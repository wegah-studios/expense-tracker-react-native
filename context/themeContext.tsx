import { initDB } from "@/db/schema";
import { addLog, toastError } from "@/lib/appUtils";
import { updateExpiredBudgets } from "@/lib/budgetUtils";
import { getPreferences, setPreferences } from "@/lib/preferenceUtils";
import { startSMSCapture } from "@/lib/smsUtils";
import { SmsCaptureMode, Theme } from "@/types/common";
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

const CustomThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  fetchDBTheme: () => Promise<void>;
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
          console.log("started up");

          //start sms Capture
          startSMSCapture();

          //init db
          await initDB();
          //fetch theme
          await Promise.all([fetchDBTheme(), updateExpiredBudgets()]);
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

  if (mounted) {
    SplashScreen.hideAsync();
  }

  return (
    mounted && (
      <CustomThemeContext.Provider value={{ theme, toggleTheme, fetchDBTheme }}>
        {children}
      </CustomThemeContext.Provider>
    )
  );
};
