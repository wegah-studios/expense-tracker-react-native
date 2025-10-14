import ImportFileModal from "@/components/importFileModal";
import ZipPasswordModal from "@/components/profile/zipPasswordModal";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { useCustomThemeContext } from "@/context/themeContext";
import { factoryReset, toastError } from "@/lib/appUtils";
import { exportData, importData } from "@/lib/exportUtils";
import { getPreferences, setPreferences } from "@/lib/preferenceUtils";
import { nativeApplicationVersion } from "expo-application";
import { Link, router } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";

const Profile = () => {
  const { setStatus, handleStatusClose, setFeedbackModal } =
    useEditingContext();
  const { theme, toggleTheme, fetchDBTheme } = useCustomThemeContext();

  const isDarkTheme = useMemo(() => theme === "dark", [theme]);
  const version = useMemo(() => nativeApplicationVersion, []);
  const [showFab, setShowFab] = useState<boolean>(false);

  const [zipPasswordModal, setZipPasswordModal] = useState<{
    open: boolean;
    type: "import" | "export";
    handleSubmit: (password: string) => void;
  }>({ open: false, type: "export", handleSubmit(password) {} });
  const [fileModal, setFileModal] = useState<{
    open: boolean;
    type: "pdf" | "excel" | "zip";
    title?: string;
    info?: string;
  }>({ open: false, type: "pdf" });

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const preferences = await getPreferences("hideFab");
        if (preferences["hideFab"] === "false") {
          setShowFab(false);
        } else {
          setShowFab(true);
        }
      } catch (error) {
        toastError(error, `An error occured while fetching preferences`);
      }
    };
    fetchPreferences();
  }, []);

  const toggleFab = () => {
    setShowFab((prev) => {
      setTimeout(() => {
        setPreferences({ hideFab: `${!prev}` });
      }, 200);
      return !prev;
    });
  };

  const handleZipPasswordModalClose = async () => {
    setZipPasswordModal({
      open: false,
      type: "export",
      handleSubmit(password) {},
    });
  };

  const handleExportData = () => {
    setZipPasswordModal({
      open: true,
      type: "export",
      handleSubmit(password) {
        handleExport(password);
      },
    });
  };

  const handleExport = async (password: string) => {
    try {
      setStatus({
        open: true,
        type: "loading",
        title: "Exporting data",
        message: "This may take a while.",
        handleClose: handleStatusClose,
        action: {
          callback() {},
        },
      });
      await exportData(password);
      handleStatusClose();
    } catch (error: any) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message:
          error.cause === 1
            ? error.message
            : "An error occured while exporting data, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleImport = async (uri: string, password: string) => {
    try {
      setStatus({
        open: true,
        type: "loading",
        title: "Importing data",
        message: "This may take a while.",
        handleClose: handleStatusClose,
        action: {
          callback() {},
        },
      });
      await importData(uri, password);
      await fetchDBTheme();
      setStatus({
        open: true,
        type: "success",
        title: "Data imported",
        message: "New data imported",
        handleClose: handleStatusClose,
        action: {
          callback: () => {
            router.push("/");
            handleStatusClose()
          },
        },
      });
    } catch (error: any) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message:
          error.cause === 1
            ? error.message
            : "An error occured while importing data, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleImportData = () => {
    setFileModal({
      open: true,
      type: "zip",
      title: "Select import file",
      info: "File should be a zip file that's been previously exported by the app.",
    });
  };

  const handleFileModalSubmit = (uri: string) => {
    setStatus({
      open: true,
      type: "warning",
      title: "Overwrite data?",
      message:
        "All your current data will be lost, and replaced with the imported data. Export your data first if you want to keep it.",
      handleClose: handleStatusClose,
      action: {
        callback: async () => {
          handleStatusClose();
          setZipPasswordModal({
            open: true,
            type: "import",
            handleSubmit(password) {
              handleImport(uri, password);
            },
          });
        },
      },
    });
  };

  const handleFactoryReset = () => {
    try {
      setStatus({
        open: true,
        type: "warning",
        title: "Delete data?",
        message:
          "All your current data will be lost. Export your data first if you want to keep it.",
        handleClose: handleStatusClose,
        action: {
          callback: async () => {
            setStatus({
              open: true,
              type: "loading",
              title: "Reseting data",
              message: "This may take a while.",
              handleClose: handleStatusClose,
              action: {
                callback() {},
              },
            });
            await factoryReset();
            await fetchDBTheme();
            setStatus({
              open: true,
              type: "success",
              title: "Data reset",
              message: "All data has been reset",
              handleClose: handleStatusClose,
              action: {
                callback: () => {
                  router.push("/");
                  handleStatusClose();
                },
              },
            });
          },
        },
      });
    } catch (error: any) {
      setStatus({
        open: true,
        type: "error",
        title: "Error reseting data",
        message:
          error.cause === 1
            ? error.message
            : "There was an error reseting data",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      toastError(error);
    }
  };

  const handleLink = async () => {
    await openBrowserAsync("https://expense-tracker-wegah-studios.netlify.app");
  };

  return (
    <>
      <View className=" flex-1 flex-col pr-[10px] pl-[10px] ">
        <View className=" pt-[5px] pb-[5px] flex-row items-center justify-between ">
          <View className=" flex-row items-center ">
            <Pressable
              onPress={router.back}
              className=" w-[40px] h-[40px] flex-row items-center "
            >
              <ThemedIcon
                source={icons.arrow}
                className=" w-[20px] h-[20px] rotate-180 "
              />
            </Pressable>
            <ThemedText className=" font-urbanistBold text-[2rem] ">
              Preferences
            </ThemedText>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className=" flex-1 flex-col gap-[30px] pt-[40px] pb-[20px] ">
            <View className=" flex-col gap-[10px] ">
              <ThemedText className=" font-urbanistBold text-[1.2rem] ">
                Data
              </ThemedText>
              <View className=" p-[20px]  bg-paper-light flex-col gap-[20px] rounded-[20px] dark:bg-paper-dark ">
                <View className=" flex-row gap-[20px] ">
                  <Pressable
                    onPress={handleImportData}
                    className=" flex-1 flex-row justify-center items-center gap-2 pt-[5px] pb-[5px] rounded-[20px] border dark:border-white "
                  >
                    <ThemedIcon
                      source={icons.import}
                      className=" w-[15px] h-[15px] "
                    />
                    <ThemedText>Import Data</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleExportData}
                    className=" flex-1 flex-row justify-center items-center gap-2 pt-[5px] pb-[5px] rounded-[20px] border dark:border-white "
                  >
                    <ThemedIcon
                      source={icons.export}
                      className=" w-[15px] h-[15px] "
                    />
                    <ThemedText>Export Data</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
            <View className=" flex-col gap-[10px] ">
              <ThemedText className=" font-urbanistBold text-[1.2rem] ">
                Settings
              </ThemedText>
              <View className=" flex-col gap-[20px] p-[20px] bg-paper-light rounded-[20px] dark:bg-paper-dark ">
                <View className=" flex-row justify-between items-center ">
                  <ThemedText className=" text-[1.1rem] font-urbanistMedium ">
                    Theme
                  </ThemedText>
                  <View className=" flex-row items-center gap-2 ">
                    <ThemedText>Light</ThemedText>
                    <Switch
                      trackColor={{
                        false: tintColors.divider,
                        true: tintColors.divider,
                      }}
                      thumbColor={
                        isDarkTheme
                          ? tintColors.paper.light
                          : tintColors.paper.dark
                      }
                      ios_backgroundColor="#3e3e3e"
                      onValueChange={toggleTheme}
                      value={isDarkTheme}
                    />
                    <ThemedText>Dark</ThemedText>
                  </View>
                </View>
                <View className=" flex-row justify-between items-center ">
                  <ThemedText className=" text-[1.1rem] font-urbanistMedium ">
                    Show help (?) button
                  </ThemedText>
                  <View className=" flex-row items-center gap-2 ">
                    <ThemedText>Off</ThemedText>
                    <Switch
                      trackColor={{
                        false: tintColors.divider,
                        true: tintColors.info,
                      }}
                      thumbColor={
                        isDarkTheme
                          ? tintColors.paper.light
                          : tintColors.paper.dark
                      }
                      ios_backgroundColor="#3e3e3e"
                      onValueChange={toggleFab}
                      value={showFab}
                    />
                    <ThemedText>On</ThemedText>
                  </View>
                </View>
              </View>
            </View>
            <View className=" flex-col gap-[10px] ">
              <ThemedText className=" font-urbanistBold text-[1.2rem] ">
                Tools
              </ThemedText>
              <View className=" p-[20px]   bg-paper-light flex-col gap-[20px] rounded-[20px] dark:bg-paper-dark ">
                <Link href="/dictionary/main" asChild>
                  <Pressable className=" flex-row items-center gap-1 ">
                    <View className=" flex-1 flex-col gap-1">
                      <ThemedText className=" text-[1.1rem] font-urbanistMedium ">
                        My Dictionary
                      </ThemedText>
                      <ThemedText
                        toggleOnDark={false}
                        className=" text-divider  text-[0.9rem] max-w-[200px] "
                      >
                        This is used to
                        <Text className=" font-urbanistBold ">
                          {" "}
                          automaticaly{" "}
                        </Text>
                        assign
                        <Text className=" font-urbanistBold "> labels </Text>
                        when{" "}
                        <Text className=" font-urbanistBold ">
                          {" "}
                          importing
                        </Text>{" "}
                        mpesa receipts.
                      </ThemedText>
                    </View>
                    <ThemedIcon
                      source={icons.chevron}
                      className=" w-[15px] h-[15px] rotate-[-90deg] "
                    />
                  </Pressable>
                </Link>
              </View>
            </View>
            <View className=" flex-col gap-[10px] ">
              <ThemedText className=" font-urbanistBold text-[1.2rem] ">
                About
              </ThemedText>
              <View className=" flex-col gap-[10px] p-[20px] rounded-[20px] bg-paper-light dark:bg-paper-dark ">
                <Pressable
                  onPress={() => setFeedbackModal(true)}
                  className=" flex-row pt-[10px] pb-[10px] justify-between items-center "
                >
                  <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                    Send Feedback
                  </ThemedText>
                  <ThemedIcon
                    source={icons.chevron}
                    className=" w-[15px] h-[15px] rotate-[-90deg] "
                  />
                </Pressable>
                <Pressable
                  onPress={handleFactoryReset}
                  className=" flex-row pt-[10px] pb-[10px] justify-between items-center "
                >
                  <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                    Factory Reset
                  </ThemedText>
                  <ThemedIcon
                    source={icons.history}
                    className=" w-[15px] h-[15px] "
                  />
                </Pressable>
                <Pressable
                  onPress={handleLink}
                  className=" flex-row pt-[10px] pb-[10px] justify-between items-center "
                >
                  <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                    Visit Website
                  </ThemedText>
                  <ThemedIcon
                    source={icons.arrow}
                    className=" w-[15px] h-[15px] rotate-[-45deg] "
                  />
                </Pressable>
                <View className=" flex-row pt-[10px] pb-[10px] justify-between items-center ">
                  <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                    Version
                  </ThemedText>
                  <ThemedText toggleOnDark={false} className=" text-divider ">
                    {version}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      <ImportFileModal
        {...fileModal}
        setStatus={setStatus}
        handleStatusClose={handleStatusClose}
        handleClose={() => setFileModal((prev) => ({ ...prev, open: false }))}
        handleSubmit={handleFileModalSubmit}
      />
      <ZipPasswordModal
        {...zipPasswordModal}
        handleClose={handleZipPasswordModalClose}
      />
    </>
  );
};

export default Profile;
