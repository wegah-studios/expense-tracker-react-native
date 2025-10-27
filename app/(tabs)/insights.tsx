import StatisticLabelGroup from "@/components/insights/labelGroup";
import StatisticsOption from "@/components/insights/statisticsOption";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { colorCycle, tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { formatAmount } from "@/lib/appUtils";
import {
  fetchPathInfo,
  fetchStatisticLabels,
  fetchStatisticOptions,
  fetchTrends,
  getTimePathTitle,
} from "@/lib/statisticsUtils";
import { Statistic, StatisticOption, StatisticPath } from "@/types/common";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

const Statistics = () => {
  const { timePath, labelPath, paramOptions } = useLocalSearchParams() as {
    timePath?: string;
    labelPath?: string;
    paramOptions?: string;
  };
  const { setAddExpenseModal } = useEditingContext();

  const [loading, setLoading] = useState<{
    statistics: boolean;
    options: boolean;
    labels: boolean;
  }>({ statistics: true, options: true, labels: true });

  const [canGoNext, setCanGoNext] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);

  const [paths, setPaths] = useState<StatisticPath[]>([]);
  const [options, setOptions] = useState<StatisticOption[][]>([]);
  const [labels, setLabels] = useState<Statistic[][]>([]);
  const [activePath, setActivePath] = useState<StatisticPath | undefined>(
    undefined
  );
  const [option, setOption] = useState<number>(0);
  const basePath = useMemo<StatisticPath | undefined>(
    () => paths[paths.length - 1],
    [paths]
  );
  const canPress = useMemo<boolean>(
    () =>
      !!activePath &&
      !!basePath &&
      !!activePath.time.length &&
      activePath.time.length !== 3 &&
      activePath.value !== basePath.value &&
      !activePath.label.length,
    [activePath, basePath]
  );
  const isLabelStatistics = useMemo(
    () => !!activePath?.label.length,
    [activePath]
  );
  const timeValue = useMemo<string | undefined>(
    () => activePath && activePath.time[activePath.time.length - 1],
    [activePath]
  );

  useEffect(() => {
    let time = timePath ? (JSON.parse(timePath) as string[]) : [];
    let label = labelPath ? (JSON.parse(labelPath) as string[]) : [];
    let importedOptions = paramOptions
      ? (JSON.parse(paramOptions) as StatisticOption[][])
      : [];
    updatePath(
      { time, label },
      {
        options: paramOptions ? importedOptions : true,
        paths: true,
        activePath: true,
        labels: true,
      }
    );
    if (paramOptions) {
      setOptions(importedOptions);
      setOption(time.length);
    }
  }, [timePath, labelPath, paramOptions]);

  const handlePathPress = () => {
    if (canPress && activePath) {
      updatePath(activePath, { paths: true, options: true });
    }
  };

  const updatePath = async (
    path: Partial<StatisticPath>,
    updates: {
      options?: boolean | StatisticOption[][];
      paths?: boolean;
      activePath?: boolean;
      labels?: boolean;
    }
  ) => {
    path.time = path.time || [];
    path.label = path.label || [];

    if (updates.labels) {
      setLoading((prev) => ({ ...prev, labels: true }));
      const labelResults = await fetchStatisticLabels({
        time: path.time,
        label: path.label,
      });
      setLabels(labelResults);
      setPage(1);
      setLoading((prev) => ({ ...prev, labels: false }));
    }

    let updatedOptions = options;
    if (!!updates.options) {
      if (typeof updates.options === "boolean") {
        setLoading((prev) => ({ ...prev, options: true }));
        const optionResults = await fetchStatisticOptions(path.time, options);
        updatedOptions = optionResults;
        setOptions(optionResults);
        setOption(path.time.length);
        setLoading((prev) => ({ ...prev, options: false }));
      } else {
        setLoading((prev) => ({ ...prev, options: true }));
        updatedOptions = updates.options;
        setOptions(updates.options);
        setOption(path.time.length);
        setLoading((prev) => ({ ...prev, options: false }));
      }
    }

    if (updates.activePath) {
      setLoading((prev) => ({ ...prev, statistics: true }));
      path.title = getTimePathTitle(path.time);
      path.subtitle = "";

      if (path.label?.length) {
        path.subtitle = path.title;
        path.title = path.label[path.label.length - 1];
      }
      const { total, value } = await fetchPathInfo({
        time: path.time,
        label: path.label,
      });
      path.total = total;
      path.value = value;
      const trendResults = await fetchTrends(
        path as StatisticPath,
        updatedOptions
      );
      path.trends = trendResults;
      setActivePath(path as StatisticPath);
      setLoading((prev) => ({ ...prev, statistics: false }));
    }

    if (updates.paths) {
      setPaths((prev) => prev.concat(path as StatisticPath));
    }
  };

  const handleOptionPress = (value: string) => {
    if (basePath) {
      let newTime = [...basePath.time];
      if (timeValue !== value) {
        newTime.push(value);
      }
      updatePath(
        { time: newTime, label: [] },
        { activePath: true, labels: true }
      );
    }
  };

  const handleLabelPress = (value: string) => {
    if (activePath) {
      const newLabel = [...activePath.label, value];
      updatePath(
        { time: activePath.time, label: newLabel },
        { activePath: true, paths: true, labels: true }
      );
    }
  };

  const handleBack = () => {
    setPaths((prev) => {
      prev.pop();
      if (prev.length) {
        const newPath = prev[prev.length - 1];
        updatePath(newPath, { options: true, labels: true });
        setActivePath(newPath);
      } else {
        router.back();
      }
      return Array.from(prev);
    });
  };

  const handleHasReachedEnd = () => {
    if (!loading.labels && canGoNext && labels.length >= page * 3) {
      setCanGoNext(false);
      handleNextPage();
    }
  };

  const handleNextPage = async () => {
    if (activePath) {
      setLoading((prev) => ({ ...prev, labels: true }));
      const newPage = await fetchStatisticLabels(activePath, page + 1);
      setLabels((prev) => prev.concat(newPage));
      setPage((prev) => prev + 1);
      setLoading((prev) => ({ ...prev, labels: false }));
    }
  };

  const handleAddExpense = () => {
    setAddExpenseModal(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.replace({
        pathname: "/insights",
        params: { timePath, labelPath, paramOptions },
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
          {basePath && basePath.title}
        </ThemedText>
      </View>
      {!labels.length && !activePath ? (
        <View className=" flex-1 flex-col gap-[20px] items-center justify-center ">
          {loading.statistics ? (
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
              total={activePath?.total || 0}
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
                  colorCycle[paths.length % 3]
                } `}
              >
                {loading.statistics ? (
                  <View className=" flex-row min-h-[100px] justify-center items-center ">
                    <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
                  </View>
                ) : !activePath?.total ? (
                  <View className=" h-[200px] flex-col gap-[20px] items-center justify-center ">
                    {loading.statistics ? (
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
                  <>
                    <View className=" flex-row items-start justify-between ">
                      <View className=" flex-col gap-[20px] ">
                        {!!activePath.subtitle && (
                          <ThemedText
                            toggleOnDark={false}
                            className=" font-urbanistMedium "
                          >
                            {activePath.subtitle}
                          </ThemedText>
                        )}
                        <ThemedText
                          toggleOnDark={false}
                          className=" capitalize text-[1.8rem] font-urbanistMedium "
                        >
                          {activePath.title}
                        </ThemedText>
                      </View>
                      {canPress && (
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
                      )}
                    </View>
                    <ThemedText
                      toggleOnDark={false}
                      className=" text-[2rem] font-urbanistBold "
                    >
                      - Ksh {formatAmount(activePath.total, 1000000)}
                    </ThemedText>
                    {!!activePath.trends.length && (
                      <View className=" flex-row gap-2 justify-between items-center flex-wrap ">
                        {activePath.trends.map((stat, index) => (
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
                (!!options[option]?.length || loading.options) && (
                  <View className=" pt-[20px] pb-[20px] pr-[5px] pl-[5px] rounded-[20px] bg-paper-light dark:bg-paper-dark ">
                    {loading.options ? (
                      <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
                    ) : (
                      <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                      >
                        <View className=" pr-[15px] pl-[15px] flex-row gap-[10px] ">
                          {options[option].map((item, index) => (
                            <StatisticsOption
                              key={index}
                              {...item}
                              active={timeValue === item.value}
                              onPress={handleOptionPress}
                            />
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                )}
              {!!labels.length && (
                <ThemedText className=" capitalize text-[1.5rem] font-urbanistMedium ">
                  {activePath?.title} expenses
                </ThemedText>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

export default Statistics;
