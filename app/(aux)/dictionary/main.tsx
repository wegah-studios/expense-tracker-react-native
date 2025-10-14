import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { toastError } from "@/lib/appUtils";
import { getDictionaryCollections } from "@/lib/dictionaryUtils";
import { getPreferences, setPreferences } from "@/lib/preferenceUtils";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";

const Dictionary = () => {
  const { setStatus, handleStatusClose } = useEditingContext();
  const [collections, setCollections] = useState<{
    keywords: number;
    recipients: number;
  }>({ keywords: 0, recipients: 0 });
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const [data, preferences] = await Promise.all([
          getDictionaryCollections(),
          getPreferences("disableDictionaryInfo"),
        ]);
        setCollections(data);
        if (!preferences.disableDictionaryInfo) {
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
    setPreferences({ disableDictionaryInfo: "true" });
    setShowInfo(false);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className=" flex-1 flex-col pt-[20px] gap-[30px] ">
          {showInfo && (
            <View className=" p-[20px] bg-primary rounded-[20px] flex-col gap-4 items-start  ">
              <Image source={icons.info} className=" w-[20px] h-[20px] " />
              <View>
                <ThemedText
                  toggleOnDark={false}
                  className=" font-urbanistBold text-[1.2rem] "
                >
                  Keywords
                </ThemedText>
                <ThemedText toggleOnDark={false} className=" text-[1.1rem] ">
                  These are used to{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    automaticaly
                  </ThemedText>{" "}
                  assign{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    labels
                  </ThemedText>{" "}
                  to an expense, when{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    importing
                  </ThemedText>{" "}
                  from mpesa, if the{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    recipient
                  </ThemedText>{" "}
                  contains a given{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    keyword
                  </ThemedText>
                  . (e.g. 'mart' {"->"} 'Quickmart Kilimani')
                </ThemedText>
              </View>
              <View>
                <ThemedText
                  toggleOnDark={false}
                  className=" font-urbanistBold text-[1.2rem] "
                >
                  Recipients
                </ThemedText>
                <ThemedText toggleOnDark={false} className=" text-[1.1rem]">
                  These are used to{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    automaticaly
                  </ThemedText>{" "}
                  assign{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    labels
                  </ThemedText>{" "}
                  to an expense, when{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    importing
                  </ThemedText>{" "}
                  from mpesa, if the{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    recipient
                  </ThemedText>{" "}
                  is an{" "}
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistBold "
                  >
                    exact match
                  </ThemedText>
                  . (e.g. 'Quickmart Kilimani' {"->"} 'Quickmart Kilimani')
                </ThemedText>
              </View>
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
