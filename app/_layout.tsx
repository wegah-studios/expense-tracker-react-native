import FeedbackModal from "@/components/feedbackModal";
import PathInfoModal from "@/components/pathInfoModal";
import ThemedText from "@/components/textThemed";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { EditingContexProvider } from "@/context/editingContext";
import { CustomThemeContextProvider } from "@/context/themeContext";
import { addLog, toastError } from "@/lib/appUtils";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";
import {
  Image,
  Pressable,
  StatusBar,
  useColorScheme,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import "./globals.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [open, setOpen] = useState<boolean>(false);
  try {
    const colorScheme = useColorScheme();

    return (
      <CustomThemeContextProvider>
        <StatusBar
          translucent
          backgroundColor={"transparent"}
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        <SafeAreaView
          className={`flex-1 bg-background-light dark:bg-background-dark`}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <EditingContexProvider>
              <Slot />
              <PathInfoModal />
            </EditingContexProvider>
          </GestureHandlerRootView>
        </SafeAreaView>
        
      </CustomThemeContextProvider>
    );
  } catch (error) {
    addLog({ type: "error", content: `Uncaught Error: ${error}` });
    toastError(error,);
    return (
      <>
        <View className=" flex-1 flex-col items-center justify-center gap-2 bg-background-light dark:bg-background-dark ">
          <Image
            source={icons.error}
            className=" w-[40px] h-[40px] "
            tintColor={tintColors.error}
          />
          <ThemedText>An error occured try restarting the app</ThemedText>
          <Pressable
            onPress={() => setOpen(true)}
            className=" p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white "
          >
            <ThemedText reverse>Send Feedback</ThemedText>
          </Pressable>
        </View>
        <FeedbackModal open={open} handleClose={() => setOpen(false)} />
      </>
    );
  }
}
