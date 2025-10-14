import { colorCycle, tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { formatAmount, toastError } from "@/lib/appUtils";
import {
  fetchPathInfo,
  fetchTrends,
  getHomeStatisticLabels,
  getHomeStatisticOptions,
  getHomeStatisticScopes,
  getTimePathTitle,
} from "@/lib/statisticsUtils";
import {
  HomeScope,
  Statistic,
  StatisticOption,
  StatisticPath,
} from "@/types/common";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import * as Progress from "react-native-progress";
import LabelCard from "../insights/labelCard";
import StatisticsOption from "../insights/statisticsOption";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";
import HomeBudgetWidget from "./budgetWidget";

const HomeStatisticsWidget = () => {
  const { setAddExpenseModal } = useEditingContext();
  const scopes = useMemo<HomeScope[]>(() => getHomeStatisticScopes(), []);
  const [options, setOptions] = useState<StatisticOption[][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [record, setRecord] = useState<
    Map<number, Partial<StatisticPath & { labels: Statistic[] }>>
  >(new Map());
  const [scope, setScope] = useState<number>(0);
  const [data, setData] = useState<
    (StatisticPath & { labels: Statistic[] }) | undefined
  >(undefined);

  useEffect(() => {
    const handleScopeChange = async () => {
      try {
        const stored = record.get(scope);
        setLoading(true);

        if (stored) {
          setData(stored as StatisticPath & { labels: Statistic[] });
          setLoading(false);
          return;
        }

        let scopeData = scopes[scope];
        let updatedOptions = options;

        if (!options.length) {
          const optionResults = await getHomeStatisticOptions();
          setOptions(optionResults);
          updatedOptions = optionResults;
        }

        let path: Partial<StatisticPath & { labels: Statistic[] }> = {
          title: scopeData.title,
          subtitle: getTimePathTitle(scopeData.path),
          time: scopeData.path,
          label: [],
        };

        const { total, value } = await fetchPathInfo({
          time: path.time || [],
          label: [],
        });
        path.total = total;
        path.value = value;

        let [trends, labels] = await Promise.all([
          fetchTrends(path as StatisticPath, updatedOptions),
          getHomeStatisticLabels(path.time || []),
        ]);
        path.trends = trends;
        path.labels = labels;

        setData(path as StatisticPath & { labels: Statistic[] });
        setRecord((prev) => {
          const newRecord = new Map(prev);
          newRecord.set(scope, path);
          return newRecord;
        });
        setLoading(false);
      } catch (error) {
        setLoading(false);
        toastError(error);
      }
    };
    handleScopeChange();
  }, [scope]);

  const handlePress = () => {
    if (data?.total) {
      router.push({
        pathname: "/insights",
        params: {
          timePath: JSON.stringify(data.time),
          paramOptions: JSON.stringify(options),
        },
      });
    }
  };

  const handleLabelPress = (value: string) => {
    if (data) {
      router.push({
        pathname: "/insights",
        params: {
          timePath: JSON.stringify(data.time),
          labelPath: JSON.stringify([value]),
          paramOptions: JSON.stringify(options),
        },
      });
    }
  };

  const handleScopePress = (value: string) => {
    setScope(Number(value));
  };

  const handleAddExpense = () => {
    setAddExpenseModal(true);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        className={` p-[20px] pt-[30px] pb-[30px] flex-col gap-[10px] rounded-[20px] bg-${
          colorCycle[scope % 3]
        } `}
      >
        {loading ? (
          <View className=" flex-row min-h-[200px] justify-center items-center ">
            <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
          </View>
        ) : !data?.total ? (
          <View className=" flex-col gap-[20px] min-h-[200px] justify-center items-center ">
            <ThemedIcon
              toggleOnDark={false}
              source={icons.pieChart}
              className=" w-[40px] h-[40px] "
              tintColor={tintColors.divider}
            />
            <ThemedText
              toggleOnDark={false}
              className=" font-urbanistMedium text-[1.2rem] "
            >
              No data for {scopes[scope].title}
            </ThemedText>
            <Pressable
              onPress={handleAddExpense}
              className=" flex-row gap-2 items-center p-[20px] pt-[10px] pb-[10px] bg-black rounded-[20px] "
            >
              <Image
                source={icons.add}
                className=" w-[10px] h-[10px] "
                tintColor={tintColors.light}
              />
              <ThemedText toggleOnDark={false} reverse>
                Add Expense
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <View className=" flex-row items-center justify-between ">
              <ThemedText
                toggleOnDark={false}
                className=" font-urbanistMedium "
              >
                {data.subtitle}
              </ThemedText>
              <View className=" p-[10px] pt-[5px] pb-[5px] flex-row items-center gap-1 bg-black rounded-[20px] ">
                <ThemedText reverse toggleOnDark={false}>
                  More info
                </ThemedText>
                <ThemedIcon
                  reverse
                  toggleOnDark={false}
                  source={icons.arrow}
                  className=" w-[10px] h-[10px] rotate-[-45deg] "
                  tintColor={tintColors.light}
                />
              </View>
            </View>
            <View className=" flex-row justify-between items-start ">
              <ThemedText
                toggleOnDark={false}
                className=" capitalize text-[1.8rem] font-urbanistMedium "
              >
                {data.title}'s total
              </ThemedText>
            </View>
            <ThemedText
              toggleOnDark={false}
              className=" text-[2rem] font-urbanistBold "
            >
              - Ksh {formatAmount(data.total, 1000000)}
            </ThemedText>
            {!!data.trends.length && (
              <View className=" flex-row gap-2 justify-between items-center flex-wrap ">
                {data.trends.map((stat, index) => (
                  <ThemedText key={index} toggleOnDark={false}>
                    <ThemedText
                      toggleOnDark={false}
                      className=" font-urbanistBold "
                    >
                      {stat.title}{" "}
                    </ThemedText>
                    {stat.description}
                  </ThemedText>
                ))}
              </View>
            )}
          </>
        )}
      </Pressable>
      <View className=" pt-[20px] pb-[20px] pr-[5px] pl-[5px] rounded-[20px] bg-paper-light dark:bg-paper-dark ">
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
          <View className=" pr-[15px] pl-[15px] flex-row gap-[10px] ">
            {scopes.map((item, index) => (
              <StatisticsOption
                key={index}
                {...item}
                value={String(index)}
                active={index === scope}
                onPress={handleScopePress}
              />
            ))}
          </View>
        </ScrollView>
      </View>
      <HomeBudgetWidget scope={scope} />
      <View className=" flex-row gap-[20px] flex-wrap ">
        {data?.labels.map((label, index) => (
          <LabelCard
            key={index}
            index={index}
            {...label}
            percent={label.total / data.total}
            onPress={handleLabelPress}
          />
        ))}
        {(data?.labels.length || 0) % 2 !== 0 && (
          <View className=" grow w-[150px] "></View>
        )}
      </View>
    </>
  );
};

export default HomeStatisticsWidget;
