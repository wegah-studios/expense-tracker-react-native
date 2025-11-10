import StatisticLabelGroup from "@/components/insights/labelGroup";
import StatisticsOption from "@/components/insights/statisticsOption";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { colorCycle, tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { formatAmount } from "@/lib/appUtils";
import {
  fetchInsightLabels,
  fetchInsightOptions,
  fetchInsightTrends,
  fetchPathInfo,
  getPathString,
  getPathTitles,
} from "@/lib/statisticsUtils";
import { Insight, Statistic, StatisticOption } from "@/types/common";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

const InsightsPage = () => {
  const { initialPath, initialOptions } = useLocalSearchParams() as {
    initialPath?: string;
    initialOptions?: string;
  };
  const { setAddExpenseModal } = useEditingContext();

  const [loading, setLoading] = useState<{
    insights: boolean;
    labels: boolean;
  }>({ insights: true, labels: true });

  const [canGoNext, setCanGoNext] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);

  const [mainPaths, setMainPaths] = useState<string[][][]>([]);
  const [options, setOptions] = useState<Map<string, StatisticOption[]>>(
    new Map()
  );
  const [record, setRecord] = useState<Map<string, Insight>>(new Map());
  const [focusPath, setFocusPath] = useState<Insight | undefined>(undefined);
  const [optionPath, setOptionPath] = useState<string>();
  const [labels, setLabels] = useState<Statistic[][]>([]);
  const mainPath = useMemo<Insight | undefined>(
    () =>
      mainPaths.length
        ? record.get(getPathString(mainPaths[mainPaths.length - 1]))
        : undefined,
    [mainPaths]
  );
  const optionArr = useMemo<StatisticOption[]>(
    () => (optionPath ? options.get(optionPath) || [] : []),
    [options, optionPath]
  );
  const actionTitle = useMemo<string>(
    () =>
      !!focusPath &&
      !!mainPath &&
      focusPath.value !== mainPath.value &&
      !focusPath.path[1].length
        ? focusPath.path[0].length === 1
          ? "Go to months"
          : focusPath.path[0].length === 2
          ? "Go to days"
          : ""
        : "",
    [mainPath, focusPath]
  );
  const isLabelStatistics = useMemo(
    () => !!focusPath?.path[1].length,
    [focusPath]
  );

  useEffect(() => {
    const path = initialPath
      ? (JSON.parse(initialPath) as string[][])
      : [[], []];
    const optionsMap: Map<string, StatisticOption[]> = initialOptions
      ? new Map(JSON.parse(initialOptions) as [string, StatisticOption[]][])
      : new Map();
    updateInsights({
      path,
      updateOptions: initialOptions ? optionsMap : undefined,
      updateFocus: true,
      updateLabels: true,
      updateMain: true,
    });
  }, []);

  const updateInsights = useCallback(
    async ({
      path,
      updateOptions,
      updateFocus,
      updateLabels,
      updateMain,
    }: {
      path: string[][];
      updateOptions?: Map<string, StatisticOption[]>;
      updateFocus?: boolean;
      updateLabels?: boolean;
      updateMain?: boolean;
    }) => {
      const pathstring = getPathString(path);
      let storedOptions = options;
      if (updateOptions) {
        storedOptions = updateOptions;
        setOptions(storedOptions);
      }

      if (updateFocus) {
        const storedInsight = record.get(pathstring);
        if (storedInsight) {
          setFocusPath(storedInsight);
        } else {
          setLoading((prev) => ({ ...prev, insights: true }));
          const { total, value } = await fetchPathInfo(path);
          if (!storedOptions.has(pathstring)) {
            const optionResults = await fetchInsightOptions(path);
            storedOptions = new Map(storedOptions);
            storedOptions.set(pathstring, optionResults);
            setOptions(storedOptions);
          }
          const { title, subtitle } = getPathTitles(path);
          let insight: Partial<Insight> = {
            total,
            value,
            path,
            title,
            subtitle,
          };
          record.set(pathstring, insight as Insight);
          insight.trends = await fetchInsightTrends(
            insight as Insight,
            storedOptions
          );
          setRecord((prev) => {
            const newMap = new Map(prev);
            newMap.set(pathstring, insight as Insight);
            return newMap;
          });
          setFocusPath(insight as Insight);
          setLoading((prev) => ({ ...prev, insights: false }));
        }
      }

      if (updateLabels) {
        setLoading((prev) => ({ ...prev, labels: true }));
        const labelResults = await fetchInsightLabels(path);
        setLabels(labelResults);
        setPage(1);
        setLoading((prev) => ({ ...prev, labels: false }));
      }

      if (updateMain) {
        setMainPaths((prev) => prev.concat([path]));
        setOptionPath(pathstring);
      }
    },
    [record, options]
  );

  const handlePathPress = useCallback(() => {
    if (actionTitle && focusPath) {
      updateInsights({ path: focusPath.path, updateMain: true });
    }
  }, [actionTitle, focusPath]);

  const handleOptionPress = useCallback(
    (value: string) => {
      if (mainPath && focusPath) {
        const newPath = [[...mainPath.path[0]], []];
        if (focusPath.value !== value) {
          newPath[0].push(value);
        }
        updateInsights({
          path: newPath,
          updateFocus: true,
          updateLabels: true,
        });
      }
    },
    [mainPath, focusPath]
  );

  const handleLabelPress = useCallback(
    (value: string) => {
      if (focusPath) {
        const newPath = [[...focusPath.path[0]], [...focusPath.path[1]]];
        newPath[1].push(value);
        updateInsights({
          path: newPath,
          updateFocus: true,
          updateMain: true,
          updateLabels: true,
        });
      }
    },
    [focusPath]
  );

  const handleBack = useCallback(() => {
    mainPaths.pop();
    if (mainPaths.length) {
      const newPath = mainPaths[mainPaths.length - 1];
      updateInsights({ path: newPath, updateFocus: true, updateLabels: true });
      setOptionPath(getPathString(newPath));
      setMainPaths(Array.from(mainPaths));
    } else {
      router.back();
    }
  }, [mainPaths]);

  const handleHasReachedEnd = () => {
    if (!loading.labels && canGoNext && labels.length >= page * 3) {
      setCanGoNext(false);
      handleNextPage();
    }
  };

  const handleNextPage = useCallback(async () => {
    if (focusPath) {
      setLoading((prev) => ({ ...prev, labels: true }));
      const newPage = await fetchInsightLabels(focusPath.path, page + 1);
      setLabels((prev) => prev.concat(newPage));
      setPage((prev) => prev + 1);
      setLoading((prev) => ({ ...prev, labels: false }));
    }
  }, [focusPath, page]);

  const handleAddExpense = () => {
    setAddExpenseModal(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.replace({
        pathname: "/insights",
        params: { initialPath, initialOptions },
      });
    }, 500);
  };

  return (
    <View className=" mt-[5px] flex-1 flex-col gap-[20px] ">
      <View className=" relative flex-row items-center justify-center p-[10px] rounded-[20px]  bg-paper-light dark:bg-paper-dark ">
        <Pressable
          onPress={handleBack}
          className=" absolute left-[15] w-[30px] h-[30px] flex-row justify-start items-center "
        >
          <ThemedIcon
            source={icons.arrow}
            className=" w-[20px] h-[20px] rotate-180 "
          />
        </Pressable>
        <ThemedText
          className={` text-[1.5rem] font-urbanistMedium capitalize `}
        >
          {mainPath && mainPath.title}
        </ThemedText>
      </View>
      {!labels.length && !focusPath ? (
        <View className=" flex-1 flex-col gap-[20px] items-center justify-center ">
          {loading.insights ? (
            <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
          ) : (
            <>
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
                No data
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
            </>
          )}
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ItemSeparatorComponent={() => <View className=" p-[10px] "></View>}
          ListFooterComponent={() => (
            <View className=" p-[10px] flex-row items-center justify-center ">
              {loading.labels && (
                <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
              )}
            </View>
          )}
          onEndReached={handleHasReachedEnd}
          onMomentumScrollBegin={() => setCanGoNext(true)}
          data={labels}
          renderItem={({ item: group, index }) => (
            <StatisticLabelGroup
              total={focusPath?.total || 0}
              handleLabelPress={handleLabelPress}
              index={index}
              group={group}
            />
          )}
          ListHeaderComponent={() => (
            <View className=" pt-[10px] pb-[20px] flex-col gap-[20px] ">
              <Pressable
                onPress={handlePathPress}
                className={` p-[20px] flex-col gap-[20px] rounded-[20px] bg-${
                  colorCycle[mainPaths.length % 3]
                } `}
              >
                {loading.insights ? (
                  <View className=" flex-row min-h-[100px] justify-center items-center ">
                    <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
                  </View>
                ) : !focusPath?.total ? (
                  <View className=" h-[200px] flex-col gap-[20px] items-center justify-center ">
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
                      No data
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
                    <View className=" flex-row items-start justify-between ">
                      <View className=" flex-col gap-[20px] ">
                        {!!focusPath.subtitle && (
                          <ThemedText
                            toggleOnDark={false}
                            className=" font-urbanistMedium "
                          >
                            {focusPath.subtitle}
                          </ThemedText>
                        )}
                        <ThemedText
                          toggleOnDark={false}
                          className=" capitalize text-[1.8rem] font-urbanistMedium "
                        >
                          {focusPath.title}
                        </ThemedText>
                      </View>
                      {!!actionTitle && (
                        <View className=" p-[10px] pt-[5px] pb-[5px] flex-row items-center gap-1 bg-black rounded-[20px] ">
                          <ThemedText reverse toggleOnDark={false}>
                            {actionTitle}
                          </ThemedText>
                          <ThemedIcon
                            reverse
                            toggleOnDark={false}
                            source={icons.arrow}
                            className=" w-[10px] h-[10px] rotate-[-45deg] "
                            tintColor={tintColors.light}
                          />
                        </View>
                      )}
                    </View>
                    <ThemedText
                      toggleOnDark={false}
                      className=" text-[2rem] font-urbanistBold "
                    >
                      - Ksh {formatAmount(focusPath.total, 1000000)}
                    </ThemedText>
                    {!!focusPath.trends.length && (
                      <View className=" flex-row gap-2 justify-between items-center flex-wrap ">
                        {focusPath.trends.map((stat, index) => (
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
              {!isLabelStatistics &&
                (!!optionArr.length || loading.insights) && (
                  <View className=" pt-[20px] pb-[20px] pr-[5px] pl-[5px] rounded-[20px] bg-paper-light dark:bg-paper-dark ">
                    {loading.insights ? (
                      <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
                    ) : (
                      <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                      >
                        <View className=" pr-[15px] pl-[15px] flex-row gap-[10px] ">
                          {optionArr.map((item, index) => (
                            <StatisticsOption
                              key={index}
                              {...item}
                              active={
                                !!focusPath &&
                                getPathString(focusPath.path) === item.path
                              }
                              onPress={handleOptionPress}
                            />
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                )}
              {!!labels.length && focusPath && (
                <ThemedText className=" capitalize text-[1.5rem] font-urbanistMedium ">
                  {focusPath.title} expenses
                </ThemedText>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

export default InsightsPage;
