import SelectAction from "@/components/expenses/selectAction";
import NotificationItem from "@/components/notifications/item";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { toastError } from "@/lib/appUtils";
import {
  clearUnread,
  deleteNofications,
  getNotifications,
} from "@/lib/notificationUtils";
import { Notification } from "@/types/common";
import { Href, router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, View } from "react-native";
import * as Progress from "react-native-progress";

const Notifications = () => {
  const { setStatus, handleStatusClose } = useEditingContext();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState<number>(1);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [canGoNext, setCanGoNext] = useState<boolean>(false);
  const ids = useMemo<string[]>(
    () => notifications.map((notification) => notification.id),
    [notifications]
  );
  const allSelected = useMemo<boolean>(
    () => selected.size === ids.length,
    [ids, selected]
  );

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (ids.length) {
      try {
        clearUnread(ids);
      } catch (error) {
        toastError(error, `An error occured while updating notifications`);
      }
    }
  }, [ids]);

  useEffect(() => {
    if (selectAll) {
      setSelected(new Set(ids));
    }
  }, [ids, selectAll]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const results = await getNotifications(1);
      setNotifications(results);
      setPage(1);
      setLoading(false);
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message:
          "An Error occured while fetching notifications, please try again",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleNextPage = async () => {
    try {
      setLoading(true);
      const newPage = await getNotifications(page + 1);
      setNotifications((prev) => prev.concat(newPage));
      setLoading(false);
      setPage((prev) => prev + 1);
    } catch (error) {
      toastError(error, `An error occured while fetching more notifications`);
    }
  };

  const handleHasReachedEnd = () => {
    if (!loading && canGoNext && Notifications.length >= page * 10) {
      setCanGoNext(false);
      handleNextPage();
    }
  };

  const resetSelected = () => {
    setSelected(new Set());
    setSelectMode(false);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selected.size !== ids.length) {
      setSelectAll(true);
    } else {
      setSelected(new Set());
      setSelectAll(false);
    }
  };

  const handleTitleBtnClick = () => {
    if (selectMode) {
      resetSelected();
    } else {
      router.back();
    }
  };

  const handleDelete = async () => {
    try {
      setStatus({
        open: true,
        type: "warning",
        title: "Delete notifications?",
        message: "Are you sure you want to delete the selected notifications?",
        handleClose: handleStatusClose,
        action: {
          title: "Delete",
          async callback() {
            setStatus({
              open: true,
              type: "loading",
              title: "Deleting",
              message: "Deleting selected notifications",
              handleClose: handleStatusClose,
              action: {
                callback: handleStatusClose,
              },
            });
            await deleteNofications(selected);
            setNotifications((prev) =>
              prev.filter((item) => !selected.has(item.id))
            );
            setStatus({
              open: true,
              type: "success",
              message: "Selected notifications deleted",
              handleClose: handleStatusClose,
              action: {
                callback() {
                  resetSelected();
                  handleStatusClose();
                },
              },
            });
          },
        },
      });
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message:
          "An error occured while deleting notifications, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleItemSelect = (id: string, action: "add" | "delete") => {
    if (!selectMode) {
      setSelectMode(true);
    }
    setSelected((prev) => {
      const newSet = new Set(prev);
      newSet[action](id);
      return newSet;
    });
  };

  const handleItemPress = (id: string, index: number) => {
    if (selectMode) {
      handleItemSelect(id, selected.has(id) ? "delete" : "add");
    } else {
      router.push(notifications[index].path as Href);
    }
  };

  const handleItemLongPress = (id: string, index: number) => {
    if (!selected.has(id)) {
      handleItemSelect(id, "add");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.replace("/notifications");
    }, 500);
  };

  return (
    <View className=" flex-1 pr-[10px] pl-[10px] ">
      <View className=" pt-[10px] pb-[10px] flex-col gap-2 ">
        <View className=" flex-row justify-between items-center gap-1">
          <View className=" flex-row items-center ">
            <Pressable
              onPress={handleTitleBtnClick}
              className=" w-[40px] h-[40px] flex-row items-center "
            >
              <ThemedIcon
                source={icons[selectMode ? "add" : "arrow"]}
                className={` w-[20px] h-[20px] ${
                  selectMode ? "rotate-45" : "rotate-180"
                }`}
              />
            </Pressable>
            <ThemedText className=" font-urbanistBold text-[2rem]">
              {selectMode ? `${selected.size} Selected` : "Notifications"}
            </ThemedText>
          </View>
          {selectMode && (
            <Pressable onPress={handleSelectAll}>
              <ThemedIcon
                source={icons.checkbox[allSelected ? "checked" : "unchecked"]}
                className=" w-[20px] h-[20px] "
              />
            </Pressable>
          )}
        </View>
        {selectMode && (
          <View className=" flex-row items-center p-[10px] bg-paper-light rounded-[20px] dark:bg-paper-dark ">
            <SelectAction
              type="delete"
              disabled={!selected.size}
              handlePress={handleDelete}
            />
          </View>
        )}
      </View>
      {!!notifications.length ? (
        <FlatList
          data={notifications}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={() => <View className=" p-[10px] "></View>}
          ItemSeparatorComponent={() => <View className=" p-[10px] "></View>}
          ListFooterComponent={() => (
            <View className=" p-[10px] flex-row items-center justify-center ">
              {loading && (
                <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
              )}
            </View>
          )}
          onEndReached={handleHasReachedEnd}
          onMomentumScrollBegin={() => setCanGoNext(true)}
          renderItem={({ item, index }) => (
            <NotificationItem
              {...{
                index,
                notification: item,
                selected: selected.has(item.id),
                handlePress: handleItemPress,
                handleLongPress: handleItemLongPress,
              }}
            />
          )}
        />
      ) : (
        <View className=" flex-1 flex-col gap-2 justify-center items-center ">
          {loading ? (
            <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
          ) : (
            <>
              <Image
                source={icons.notification}
                className=" w-[40px] h-[40px] "
                tintColor={tintColors.divider}
              />
              <ThemedText>No Notifications</ThemedText>
            </>
          )}
        </View>
      )}
    </View>
  );
};

export default Notifications;
