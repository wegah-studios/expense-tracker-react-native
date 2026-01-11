import { colorCycle, tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { formatAmount, toastError } from "@/lib/appUtils";
import {
  fetchInsightTrends,
  fetchPathInfo,
  getHomeInsightLabels,
  getHomeInsightOptions,
  getHomeInsightScopes,
  getPathString,
} from "@/lib/statisticsUtils";
import { HomeScope, Insight, Statistic, StatisticOption } from "@/types/common";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import * as Progress from "react-native-progress";
import LabelCard from "../insights/labelCard";
import StatisticsOption from "../insights/statisticsOption";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";
import HomeBudgetWidget from "./budgetWidget";
import { useCustomThemeContext } from "@/context/themeContext";

const HomeStatisticsWidget = () => {
  const {currency} = useCustomThemeContext()
  const { setAddExpenseModal } = useEditingContext();
  const scopes = useMemo<HomeScope[]>(() => getHomeInsightScopes(), []);
  const [options, setOptions] = useState<Map<string, StatisticOption[]>>(
    new Map()
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [record, setRecord] = useState<
    Map<string, Insight & { labels: Statistic[] }>
  >(new Map());
  const [scope, setScope] = useState<number>(0);
  const [data, setData] = useState<
    (Insight & { labels: Statistic[] }) | undefined
  >(undefined);

  useEffect(() => {
    const handleScopeChange = async () => {
      try {
        const pathstring = getPathString(scopes[scope].path);
        const stored = record.get(pathstring);
        setLoading(true);

        if (stored) {
          setData(stored);
          setLoading(false);
          return;
        }

        let scopeData = scopes[scope];
        let updatedOptions = options;

        if (!options.size) {
          const optionResults = await getHomeInsightOptions();
          setOptions(optionResults);
          updatedOptions = optionResults;
        }

        let insight: Partial<Insight & { labels: Statistic[] }> = {
          title: scopeData.title,
          subtitle: scopeData.subtitle,
          path: scopeData.path,
        };

        const { total, value } = await fetchPathInfo(scopeData.path);
        insight.total = total;
        insight.value = value;

        let [trends, labels] = await Promise.all([
          fetchInsightTrends(insight as Insight, updatedOptions, currency),
          getHomeInsightLabels(scopeData.path),
        ]);
        insight.trends = trends;
        insight.labels = labels;

        setData(insight as Insight & { labels: Statistic[] });
        setRecord((prev) => {
          const newMap = new Map(prev);
          newMap.set(pathstring, insight as Insight & { labels: Statistic[] });
          return newMap;
        });
        setLoading(false);
      } catch (error) {
        setLoading(false);
        toastError(error);
      }
    };
    handleScopeChange()
  }, [scope]);

  const handlePress = () => {
    if (data?.total) {
      router.push({
        pathname: "/insights",
        params: {
          initialPath: JSON.stringify(data.path),
          initialOptions: JSON.stringify([...options.entries()]),
        },
      });
    }
  };

  const handleLabelPress = (value: string) => {
    if (data) {
      router.push({
        pathname: "/insights",
        params: {
          initialPath: JSON.stringify([[...data.path[0]], [value]]),
          initialOptions: JSON.stringify([...options.entries()]),
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
              -{currency} {formatAmount(data.total, 1000000)}
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
      <HomeBudgetWidget scope={scope} currency={currency} />
      {!!data?.labels.length && (
        <ThemedText className=" capitalize font-urbanistMedium text-[1.2rem] ">
          {data.title}'s expenses
        </ThemedText>
      )}
      <View className=" flex-row gap-[20px] flex-wrap ">
        {data?.labels.map((label, index) => (
          <LabelCard
            key={index}
            index={index}
            {...label}
            currency={currency}
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
