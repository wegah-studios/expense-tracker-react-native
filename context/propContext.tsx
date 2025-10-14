import React, { createContext, useContext } from "react";

type AppProps = Record<string, any>;

const AppPropsContext = createContext<Record<string, any> | null>(null);

export const useAppProps = () => {
  const context = useContext(AppPropsContext);
  if (!context) {
    throw new Error(
      "useAppProps must be used within a AppPropsContextProvider"
    );
  }
  return context;
};

export const AppPropsProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AppProps;
}) => {
  return (
    <AppPropsContext.Provider value={value}>
      {children}
    </AppPropsContext.Provider>
  );
};
