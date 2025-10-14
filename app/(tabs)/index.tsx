import HomeExpenseWidget from "@/components/home/expenseWidget";
import HomeStatisticsWidget from "@/components/home/statisticsWidget";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import icons from "@/constants/icons";
import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";

const Home = () => {
  const greeting = useMemo(() => {
    const date = new Date();
    return date.getHours() >= 18
      ? "Evening"
      : date.getHours() >= 12
      ? "Afternoon"
      : "Morning";
  }, []);

  return (
    <View className=" flex-1">
      <View className=" mt-[5px] mb-[5px] p-[10px] flex-row justify-between items-center rounded-[20px] bg-paper-light dark:bg-paper-dark ">
        <ThemedText className=" font-urbanistMedium text-[1.5rem] ">
          Good {greeting}
        </ThemedText>
        <View className=" flex-row items-center gap-[20px] ">
          <Link href={"/dictionary/main"} asChild>
            <Pressable>
              <ThemedIcon
                source={icons.dictionary}
                className="w-[25px] h-[25px]"
              />
            </Pressable>
          </Link>
          <Link href={"/notifications"} asChild>
            <Pressable>
              <ThemedIcon
                source={icons.notification}
                className="w-[25px] h-[25px]"
              />
            </Pressable>
          </Link>
          <Link href={"/profile"} asChild>
            <Pressable>
              <ThemedIcon
                source={icons.settings}
                className=" w-[25px] h-[25px] "
              />
            </Pressable>
          </Link>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className=" flex-1 flex-col gap-[30px] pt-[20px] pb-[30px]">
          <HomeStatisticsWidget />
          <HomeExpenseWidget />
        </View>
      </ScrollView>
    </View>
  );
};

export default Home;
