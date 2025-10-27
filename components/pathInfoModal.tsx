import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { toastError } from "@/lib/appUtils";
import { getPreferences, setPreferences } from "@/lib/preferenceUtils";
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable } from "react-native";
import ExternalLink from "./externalLink";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const PathInfoModal = () => {
  const content = useMemo<
    Record<string, { icon: any; title: string; description: string }[]>
  >(
    () => ({
      "/": [
        {
          icon: icons.logo,
          title: `Welcome to Expense tracker for M-pesa.`,
          description: `The app captures expenses and allows you to accurately track your spending, it also stores the statistics of each expense and tracks budgets for you and much more.`,
        },
        {
          icon: icons.logo,
          title: `Important note`,
          description: `All your data is stored securely on your device and only you have access to it. By using this app you agree to our ^Terms of use</>https://qwantu.wegahstudios.com/terms-of-service^ and ^Privacy policy</>https://qwantu.wegahstudios.com/privacy-policy^.`,
        },
        {
          icon: icons.logo,
          title: `Send Feedback`,
          description: `This is the early release version of the app, there are multiple features and updates that are to come. Go to preferences and tap "Send feedback" to notify us of any issues or improvements. Press the "?" button for help.`,
        },
      ],
      "/expenses/collections": [
        {
          icon: icons.expenses.filled,
          title: `Expenses`,
          description: `The expenses tab allows you to view, export, search and edit all your expenses and much more. Long press an expense for more options`,
        },
      ],
      "/insights": [
        {
          icon: icons.insights.filled,
          title: `Insights`,
          description: `The insights tab allows you to view key information of all your expenses.`,
        },
      ],
      "/budgets": [
        {
          icon: icons.budgets.filled,
          title: "Budgets",
          description: `The Budgets tab allows you to add and view multiple budgets and keep track of how much you've spent for each. Tap a budget for more info`,
        },
      ],
    }),
    []
  );

  const { showPathInfo } = useEditingContext();
  const pathname = usePathname();
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [info, setInfo] = useState<
    {
      icon: any;
      title: string;
      description: string;
    }[]
  >([]);
  const active = useMemo<
    | {
        icon: any;
        title: string;
        description: string;
      }
    | undefined
  >(() => info[step], [info, step]);

  useEffect(() => {
    if (!showPathInfo) {
      setOpen(false);
    } else {
      if (content[pathname] && !seen.has(pathname)) {
        const fetchPreferences = async () => {
          const preferences = await getPreferences(pathname);
          let currentStep = 0;
          if (preferences[pathname] !== undefined) {
            currentStep = Number(preferences[pathname]);
          }
          if (currentStep !== -1) {
            setInfo(content[pathname]);
            setStep(currentStep);
            setOpen(true);
          } else {
            addPathnameToSeen();
          }
        };
        fetchPreferences();
      }
    }
  }, [pathname, showPathInfo]);

  const handleClose = () => {
    try {
      let nextStep = step + 1;
      if (nextStep >= info.length) {
        nextStep = -1;
        addPathnameToSeen();
        setOpen(false);
      } else {
        setStep(nextStep);
      }
      setPreferences({ [pathname]: `${nextStep}` });
    } catch (error) {
      toastError(error);
    }
  };

  const addPathnameToSeen = () => {
    setSeen((prev) => {
      const newSet = new Set(prev);
      newSet.add(pathname);
      return newSet;
    });
  };

  return (
    <>
      {active && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={open}
          onRequestClose={handleClose}
        >
          <Pressable
            onPress={handleClose}
            className=" flex-1 bg-black/50 flex-row justify-center items-center "
          >
            <Pressable
              onPress={() => {}}
              style={{ height: "auto" }}
              className=" flex-col gap-[20px] items-center w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
            >
              <ThemedIcon
                toggleOnDark={pathname !== "/"}
                source={active.icon}
                className=" w-[30px] h-[30px] rounded-[10px] "
              />
              <ThemedText className=" font-urbanistBold text-[1.5rem] text-center ">
                {active.title}
              </ThemedText>
              <ThemedText className=" tracking-[0.1em] text-center text-[1.2rem] ">
                {active.description.split("^").map((str, index) => {
                  const [text, link] = str.split("</>");
                  return !!link ? (
                    <ExternalLink key={index} href={link}>
                      {text}
                    </ExternalLink>
                  ) : (
                    text
                  );
                })}
              </ThemedText>
              <Pressable
                onPress={handleClose}
                className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white `}
              >
                <ThemedText reverse className=" text-white ">
                  Ok
                </ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

export default PathInfoModal;
