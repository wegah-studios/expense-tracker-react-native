import FormattedText from "@/components/formattedText";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { toastError } from "@/lib/appUtils";
import { getDictionaryCollections } from "@/lib/dictionaryUtils";
import { getStoreItems, setStoreItems } from "@/lib/storeUtils";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

const Dictionary = () => {
  const { setStatus, handleStatusClose } = useEditingContext();
  const [collections, setCollections] = useState<{
    keywords: number;
    recipients: number;
  }>({ keywords: 0, recipients: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const info = useMemo(
    () =>
      `The dictionary is used to ^b|automaticaly^ assign ^b|labels^ to an expense, when ^b|importing^ from ^b|Mpesa^.` +
      `\n\n^b|Keywords^ \nThese assign ^b|labels^ if the ^b|expense^ contains a given ^b|keyword^. (e.g. 'mart' -> 'Quickmart Kilimani')` +
      `\n\n^b|Recipients^ \nThese assign ^b|labels^ if the ^b|expense^ is an ^b|exact match^. (e.g. 'Quickmart Kilimani' -> 'Quickmart Kilimani')`,
    []
  );

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const data = await getDictionaryCollections();
        setCollections(data);

        const storage = await getStoreItems("disableDictionaryInfo");

        if (!storage.disableDictionaryInfo) {
          setShowInfo(true);
        }
      } catch (error) {
        toastError(error);
        setStatus({
          open: true,
          type: "error",
          message:
            "An error occured while fetching dictionary, please try again.",
          handleClose: handleStatusClose,
          action: {
            callback: handleStatusClose,
          },
        });
      }
    };
    fetchCollections();
  }, []);

  const handleNavigate = (type: "keyword" | "recipient") => {
    router.push({ pathname: "/dictionary/items", params: { type } });
  };

  const handleGotIt = async () => {
    setStoreItems([["disableDictionaryInfo", "true"]]);
    setShowInfo(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.replace("/dictionary/main");
    }, 500);
  };

  return (
    <View className=" flex-1 ">
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
          Dictionary
        </ThemedText>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className=" flex-1 flex-col pt-[20px] gap-[30px] ">
          {showInfo && (
            <View className=" p-[20px] bg-primary rounded-[20px] flex-col gap-4 items-start  ">
              <Image source={icons.info} className=" w-[20px] h-[20px] " />
              <FormattedText
                text={info}
                props={{
                  container: { toggleOnDark: false },
                  text: { toggleOnDark: false },
                }}
              />
              <Pressable
                onPress={handleGotIt}
                className=" p-[20px] pt-[5px] pb-[5px] bg-black rounded-[20px] "
              >
                <ThemedText toggleOnDark={false} reverse>
                  Got it
                </ThemedText>
              </Pressable>
            </View>
          )}
          <Pressable
            onPress={() => handleNavigate("keyword")}
            className={` p-[20px] rounded-[20px] flex-col gap-2 ${
              showInfo ? "bg-secondary" : "bg-primary"
            } `}
          >
            <View className=" flex-row justify-between ">
              <Image source={icons.keyword} className=" w-[30px] h-[30px] " />
              <Image
                source={icons.arrow}
                className=" w-[15px] h-[15px] rotate-[-45deg] "
              />
            </View>
            <ThemedText
              toggleOnDark={false}
              className=" font-urbanistBold text-[2rem] "
            >
              Keywords
            </ThemedText>
            <ThemedText toggleOnDark={false}>
              {collections?.keywords || 0} items
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("recipient")}
            className={` p-[20px] rounded-[20px] flex-col gap-2 ${
              showInfo ? "bg-accent" : "bg-secondary"
            } `}
          >
            <View className=" flex-row justify-between ">
              <Image
                source={icons.dictionary}
                className=" w-[30px] h-[30px] "
              />
              <Image
                source={icons.arrow}
                className=" w-[15px] h-[15px] rotate-[-45deg] "
              />
            </View>
            <ThemedText
              toggleOnDark={false}
              className=" font-urbanistBold text-[2rem] "
            >
              Recipients
            </ThemedText>
            <ThemedText toggleOnDark={false}>
              {collections?.recipients || 0} items
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default Dictionary;
