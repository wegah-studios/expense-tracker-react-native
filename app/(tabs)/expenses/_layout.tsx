import { AppPropsProvider } from "@/context/propContext";
import { getCollections } from "@/lib/collectionsUtils";
import { Slot } from "expo-router";
import React, { useEffect, useState } from "react";

const ExpensesLayout = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [collections, setCollections] = useState<{
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  }>({ map: new Map(), names: [], exclusions: [] });

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    const data = await getCollections();
    setCollections(data);
    setLoading(false);
  };

  return (
    <AppPropsProvider value={{ loading, collections, setCollections, fetchCollections }}>
      <Slot />
    </AppPropsProvider>
  );
};

export default ExpensesLayout;
