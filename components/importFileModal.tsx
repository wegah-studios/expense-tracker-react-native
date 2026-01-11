import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { selectDocument } from "@/lib/exportUtils";
import { Status } from "@/types/common";
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const ImportFileModal = ({
  open,
  handleClose,
  title,
  info,
  type,
  handleSubmit,
  setStatus,
  handleStatusClose,
}: {
  open: boolean;
  handleClose: () => void;
  type: "pdf" | "excel" | "zip";
  title?: string;
  info?: string;
  handleSubmit: (uri: string) => void;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  handleStatusClose: () => void;
}) => {
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);

  const handleSelectDocument = async () => {
    try {
      const result = await selectDocument(type);
      setFile(result);
    } catch (error) {
      handleStatusClose();
      toastError(error, `An error occured while selectig document`);
    }
  };

  const onSubmit = () => {
    if (file) {
      handleSubmit(file.uri);
      setFile(null);
    }
    handleClose();
  };

  const handleBack = () => {
    if (file) {
      setStatus({
        type: "warning",
        open: true,
        title: "Cancel Import?",
        message:
          "The selected file has not been imported. Press 'import' if you want to import it",
        handleClose: handleStatusClose,
        action: {
          title: "Leave",
          callback() {
            handleStatusClose();
            handleClose();
          },
        },
      });
    } else {
      handleClose();
    }
  };

  return (
    <Modal visible={open} onRequestClose={handleClose}>
      <SafeAreaView className=" pr-[10px] pl-[10px] flex-1 flex-col gap-[10px] bg-background-light dark:bg-background-dark ">
        <View className=" pt-[10px] pb-[5px] flex-row items-center justify-between ">
          <View className=" flex-row items-center ">
            <Pressable
              onPress={handleBack}
              className=" w-[40px] h-[40px] flex-row items-center "
            >
              <ThemedIcon
                source={icons.arrow}
                className=" w-[20px] h-[20px] rotate-180 "
              />
            </Pressable>
            <ThemedText className=" font-urbanistBold text-[2rem] capitalize ">
              {title || `Import ${type} file`}
            </ThemedText>
          </View>
        </View>
        {info && (
          <View className=" flex-row gap-2 ">
            <ThemedIcon source={icons.info} className=" w-[15px] h-[15px] " />
            <ThemedText className=" flex-1 ">{info}</ThemedText>
          </View>
        )}
        <View className=" flex-1 flex-col items-center justify-center gap-[30px] ">
          <Pressable
            onPress={handleSelectDocument}
            className={` w-[150px] h-[150px] flex-col gap-[20px] justify-center items-center rounded-[20px] border ${
              file ? "border-info" : "border-black  dark:border-white"
            }  `}
          >
            <ThemedIcon
              source={icons[type]}
              className=" w-[40px] h-[40px] "
              tintColor={file ? tintColors.info : undefined}
            />
            <ThemedText className={` text-[1.2rem] font-urbanistMedium `}>
              {file ? "Change" : "Select"} File
            </ThemedText>
          </Pressable>
          {file && (
            <>
              <ThemedText className=" max-w-[200px] text-center ">
                {file.name}
              </ThemedText>
              <Pressable className=" p-[20px] pt-[10px] pb-[10px] flex-row items-center justify-center gap-2 rounded-[20px] bg-black dark:bg-white ">
                <ThemedIcon
                  reverse
                  source={icons.import}
                  className=" w-[20px] h-[20px] "
                />
                <ThemedText
                  onPress={onSubmit}
                  reverse
                  className=" text-[1.2rem] "
                >
                  Import
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default ImportFileModal;
