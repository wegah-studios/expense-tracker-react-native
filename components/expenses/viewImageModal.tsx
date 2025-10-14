import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, ToastAndroid, View } from "react-native";

import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { dowloadImage } from "@/lib/imageUtils";
import { SafeAreaView } from "react-native-safe-area-context";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const ViewImageModal = ({
  uri,
  open,
  handleClose,
}: {
  uri: string;
  open: boolean;
  handleClose: () => void;
}) => {
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [doubleClickTimeout, setdoubleClickTimeout] = useState<number | null>(
    null
  );

  useEffect(() => {
    setShowHeader(true);
    const fadeTimeout = setTimeout(() => {
      setShowHeader(false);
    }, 2000);

    return () => clearTimeout(fadeTimeout);
  }, [open]);

  const handlePress = () => {
    setdoubleClickTimeout((prev) => {
      if (prev) {
        clearTimeout(prev);
        handleDoubleTap();
        return null;
      } else {
        return setTimeout(() => {
          setdoubleClickTimeout(null);
          handleSingleTap();
        }, 300);
      }
    });
  };

  const handleSingleTap = () => {
    setShowHeader((prev) => !prev);
  };

  const handleDoubleTap = () => {
    // console.log("double tapped");
  };

  const handleDownload = async () => {
    try {
      if (uri) {
        await dowloadImage(uri);
        ToastAndroid.show(`Image downloaded`, ToastAndroid.SHORT);
      } else {
        toastError(new Error(`No image`), `No image`);
      }
    } catch (error) {
      toastError(error, `An error occured while downloading image`);
    }
  };

  return (
    <Modal visible={open} onRequestClose={handleClose}>
      <View className=" relative flex-1 ">
        <SafeAreaView
          style={{ zIndex: 10, opacity: showHeader ? 1 : 0 }}
          className=" top-0 left-0 w-[100%] flex-row justify-between bg-white/50 absolute p-[10px] transition-opacity dark:bg-black/50 "
        >
          <Pressable onPress={handleClose} className=" p-[5px] ">
            <ThemedIcon
              source={icons.arrow}
              className=" w-[20px] h-[20px] rotate-180 "
            />
          </Pressable>
          <Pressable
            onPress={handleDownload}
            className=" p-[20px] flex-row items-center gap-2 pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white "
          >
            <ThemedIcon
              reverse
              source={icons.download}
              className=" w-[15px] h-[15px] "
            />
            <ThemedText reverse>Download</ThemedText>
          </Pressable>
        </SafeAreaView>
        <Pressable
          onPress={handlePress}
          className=" flex-1 bg-background-light dark:bg-background-dark flex-row justify-center items-center "
        >
          <Image
            src={uri}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </Modal>
  );
};

export default ViewImageModal;
