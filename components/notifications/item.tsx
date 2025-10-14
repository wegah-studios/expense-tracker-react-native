import icons from "@/constants/icons";
import { Notification } from "@/types/common";
import dayjs from "dayjs";
import React from "react";
import { Pressable, View } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const NotificationItem = React.memo(({
  index,
  notification,
  selected,
  handlePress,
  handleLongPress,
}: {
  index: number;
  notification: Notification;
  selected: boolean;
  handlePress: (id: string, index: number) => void;
  handleLongPress: (id: string, index: number) => void;
}) => {
  const onPress = () => {
    handlePress(notification.id, index);
  };

  const onLongPress = () => {
    handleLongPress(notification.id, index);
  };

  // const handlePress = () => {
  //   if (selectMode) {
  //     handleItemSelect(notification.id, picked ? "delete" : "add");
  //   } else {
  //     router.push(notification.path as Href);
  //   }
  // };

  // const handleLongPress = () => {
  //   if (!picked) {
  //     handleItemSelect(notification.id, "add");
  //   }
  // };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className={` flex-col gap-2 p-[20px] rounded-[20px] bg-paper-light dark:bg-paper-dark `}
    >
      <View className=" flex-col gap-1 ">
        <View className=" flex-row justify-between items-center ">
          <View>
            {selected && (
              <ThemedIcon
                source={icons.checkbox.checked}
                className=" w-[15px] h-[15px] "
              />
            )}
          </View>
          {!!notification.unread && (
            <View
              className={` w-[10px] h-[10px] rounded-[50%] ${
                notification.type === "error" ? "bg-error" : "bg-info"
              } `}
            />
          )}
        </View>
        <ThemedText
          toggleOnDark={false}
          className={` ${
            notification.type === "error" ? "text-error" : "text-info"
          } capitalize font-urbanistBold text-[1.2rem]  `}
        >
          {notification.title}
        </ThemedText>
      </View>
      <ThemedText toggleOnDark={true} className=" text-[1.1rem] ">
        {notification.message}
      </ThemedText>
      <ThemedText toggleOnDark={false} className=" text-divider ">
        {dayjs(new Date(notification.date)).format("dd DD MMM YYYY, hh:MM A")}
      </ThemedText>
    </Pressable>
  );
});

export default NotificationItem;
