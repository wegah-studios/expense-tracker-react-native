import { initDB } from "@/db/db";
import { addLog, toastError } from "@/lib/appUtils";
import { updateExpiredBudgets } from "@/lib/budgetUtils";
import { startSMSCapture } from "@/lib/smsUtils";
import { getStoreItems, setStoreItems } from "@/lib/storeUtils";
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
  isRated: boolean;
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
  const [isRated, setIsRated] = useState<boolean>(false);
  const [pinProtected, setPinProtected] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const startup = async () => {
        if (!mounted) {
          console.log("starting up");
          //init db
          await initDB();
          //startup
          const [storage, isCapture] = await Promise.all([
            getStoreItems("smsCapture", "rated", "theme", "hash"),
            isCaptureActive(),
          ]);

          await updateExpiredBudgets();

          if (storage.theme) {
            colorScheme.set(storage.theme as Theme);
          }

          setIsRated(!!storage.rated);
          setPinProtected(!!storage.hash);

          if (
            (!isCapture && storage.smsCapture === "on") ||
            (isCapture && storage.smsCapture !== "on")
          ) {
            storage.smsCapture = "off";
            await Promise.all([
              setStoreItems([["smsCapture", "off"]]),
              stopCapture(),
            ]);
          }

          setSmsCaptureState((storage.smsCapture || null) as any);

          addLog({ type: "info", content: "Startup successfull" });
          console.log("started up complete.");
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
      colorScheme.set(newTheme);
      setStoreItems([["theme", newTheme]]);
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
    await setStoreItems([["smsCapture", state]]);
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
          isRated,
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
