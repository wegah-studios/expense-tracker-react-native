import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { checkForUnread } from "@/lib/notificationUtils";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import ThemedIcon from "../themedIcon";

const NotificationIcon = () => {
  const [showBadge, setShowBadge] = useState<boolean>(false);
  useEffect(() => {
    const handleShowBadge = async () => {
      try {
        const result = await checkForUnread();
        console.log(result)
        setShowBadge(result);
      } catch (error) {
        toastError(error);
      }
    };
    handleShowBadge();
  }, []);
  return (
    <Link href={"/notifications"} asChild>
      <Pressable className=" relative ">
        {showBadge && (
          <View style={{zIndex:1}} className=" absolute right-0 top-0 w-[10px] h-[10px] rounded-[50%] bg-info " />
        )}
        <ThemedIcon source={icons.notification} className="w-[25px] h-[25px]" />
      </Pressable>
    </Link>
  );
};

export default NotificationIcon;
