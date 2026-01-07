import icons from "@/constants/icons";
import { ThemedTextProps } from "@/types/common";
import React, { useMemo } from "react";
import { Image, ImageProps, View } from "react-native";
import ExternalLink from "./externalLink";
import ThemedText from "./textThemed";

const FormattedText = ({
  text,
  props,
  formats,
}: {
  text: string;
  props?: {
    container?: ThemedTextProps;
    text?: ThemedTextProps;
    image?: ImageProps;
  };
  formats?: {
    icon?: (a: string, b: string) => React.JSX.Element;
    b?: (a: string, b: string) => React.JSX.Element;
    link?: (a: string, b: string) => React.JSX.Element;
  };
}) => {
  const parts = useMemo(
    () =>
      text.split("^").map((part, index) => {
        const [a, b] = part.split("|");
        if (b) {
          switch (a) {
            case "icon":
              return (
                formats?.icon?.(a, b) || (
                  <View key={index}>
                    <Image
                      source={icons[b as keyof typeof icons]}
                      className=" w-[15px] h-[15px] "
                      {...props?.image}
                    />
                  </View>
                )
              );

            case "b":
              return (
                formats?.b?.(a, b) || (
                  <ThemedText
                    key={index}
                    className=" font-urbanistBold text-[1.2rem] "
                    {...props?.text}
                  >
                    {b}
                  </ThemedText>
                )
              );

            case "link":
              const [title, href] = b.split(":");
              return (
                formats?.link?.(a, b) || (
                  <ExternalLink key={index} href={href}>
                    {title}
                  </ExternalLink>
                )
              );

            default:
              break;
          }
        }
        return (
          <ThemedText key={index} className=" text-[1.2rem] " {...props?.text} >
            {a}
          </ThemedText>
        );
      }) || [],
    [text]
  );

  return (
    <ThemedText
      className=" flex-row items-center gap-1  flex-wrap "
      {...props?.container}
    >
      {parts}
    </ThemedText>
  );
};

export default FormattedText;
