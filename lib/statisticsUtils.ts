import db from "@/db/schema";
import {
  Expense,
  HomeScope,
  Statistic,
  StatisticOption,
  StatisticPath,
  StatisticTrend,
} from "@/types/common";
import dayjs from "dayjs";
import { formatAmount } from "./appUtils";

export const fetchPathInfo = async (path: {
  time: string[];
  label: string[];
}) => {
  let query = "all";
  let value: string = "";

  if (path.label.length) {
    const labelArr = [...path.label];
    value = labelArr.pop() || "";
    query = `${path.time.join("/") || "all"}/${
      (labelArr.length ? labelArr.join("/") + "/" : "") + "labels/" + value
    }`;
  } else if (path.time.length) {
    const timeArr = [...path.time];
    value = timeArr.pop() || "";
    query =
      (timeArr.length
        ? `${timeArr.join("/")}/${timeArr.length === 1 ? "months" : "dates"}`
        : "years") +
      "/" +
      value;
  }

  const data: Statistic | null = await db.getFirstAsync(
    `SELECT * FROM statistics WHERE path = ? AND total > 0 `,
    query
  );

  return { total: data?.total || 0, value };
};

export const fetchTrends = async (
  path: StatisticPath,
  options: { value: string; total: number }[][]
) => {
  let trends: StatisticTrend[] = [];
  if (path.label.length) {
    const selectedOptions = options[path.time.length];
    if (selectedOptions?.length > 1) {
      const label = path.label[path.label.length - 1];
      let paths = selectedOptions.map(
        (option) =>
          `${path.time.length ? path.time.join("/") + "/" : ""}${
            option.value
          }/labels/${label}`
      );
      const data = await db.getAllAsync(
        `SELECT * FROM statistics WHERE path IN (?${`, ?`.repeat(
          paths.length - 1
        )})`,
        paths
      );

      if (data.length > 1) {
        trends.push({
          title: `Ksh ${formatAmount(path.total / data.length)}`,
          description: `spent on ${path.value} per ${
            !path.time.length
              ? "year"
              : path.time.length === 1
              ? "month"
              : "day"
          }`,
        });
      }
    }
  } else {
    const selectedOptions = options[path.time.length];
    if (selectedOptions?.length > 1) {
      trends.push({
        title: `-Ksh ${formatAmount(
          path.total / selectedOptions.length,
          10000
        )}`,
        description: `per ${
          !path.time.length ? "year" : path.time.length === 1 ? "month" : "day"
        }`,
      });
    }
    if (path.time.length) {
      const relativeOptions = options[path.time.length - 1];
      if (relativeOptions?.length > 1) {
        const pathIndex = relativeOptions.findIndex(
          (item) => item.value === path.value
        );
        const nearestOption =
          relativeOptions[pathIndex - 1] || relativeOptions[pathIndex + 1];
        let nearestOptionPath = path.time.slice(0, -1);
        nearestOptionPath[nearestOptionPath.length] = nearestOption.value;
        const diff = path.total - nearestOption.total;
        trends.push({
          title: `${diff < 0 ? "-" : "+"}Ksh ${formatAmount(
            Math.abs(diff),
            10000
          )}`,
          description: `${
            diff < 0 ? "less than" : "more than"
          } ${getTimePathTitle(nearestOptionPath)}`,
        });
      }
    }
  }
  return trends;
};

export const fetchStatisticLabels = async (
  path: { time: string[]; label: string[] },
  page: number = 1
) => {
  let query =
    (path.time.join("/") || "all") +
    (path.label.length ? "/" + path.label.join("/") : "") +
    `/labels/%`;

  const offset = (page - 1) * 6;
  const data: Statistic[] = await db.getAllAsync(
    `SELECT * FROM statistics WHERE path LIKE ? AND total > 0 ORDER BY total DESC LIMIT 6 OFFSET ${offset} `,
    query
  );

  let result = data.reduce((arr, item, index) => {
    if (index % 2 === 0) {
      arr.push([item]);
    } else {
      arr[arr.length - 1].push(item);
    }
    return arr;
  }, [] as Statistic[][]);

  return result;
};

export const fetchStatisticOptions = async (
  path: string[],
  options: StatisticOption[][]
) => {
  let query = `${
    path.length
      ? path.join("/") + "/" + (path.length === 1 ? "months" : "dates")
      : `years`
  }`;
  const data: Statistic[] = await db.getAllAsync(
    `SELECT * FROM statistics WHERE path LIKE ? AND total > 0 ORDER BY CAST(value AS INTEGER) ASC`,
    query + "%"
  );

  let result: StatisticOption[] = data.map((item) => {
    let title = "";
    let subtitle = "";

    if (!path.length) {
      let date = new Date();
      const diff = date.getFullYear() - Number(item.value);
      subtitle = `${diff === 0 ? "this" : diff === 1 ? "last" : diff} year${
        diff > 1 ? "s ago" : ""
      }`;
      title = item.value;
    } else if (path.length === 1) {
      [subtitle] = item.path.split("/").slice(-3);
      title = months[Number(item.value)];
    } else if (path.length === 2) {
      title = ("0" + item.value).slice(-2);
      const [year, month, _c, day] = item.path.split("/");
      const date = new Date(Number(year), Number(month), Number(day));
      subtitle = dayjs(date).format("ddd");
    }

    return { title, subtitle, value: item.value, total: item.total };
  });

  options = Array.from(options);
  options[path.length] = result;
  return options;
};

export const getTimePathTitle = (path: string[]) => {
  let title = "All time";
  if (path.length) {
    const year = path[0];
    const month = path[1];
    const day = path[2];

    const date = new Date(Number(year), Number(month) || 0, Number(day) || 1);

    if (month) {
      if (day) {
        title = dayjs(date).format("dddd DD MMMM, YYYY");
      } else {
        title = dayjs(date).format("MMMM YYYY");
      }
    } else {
      title = date.getFullYear().toString();
    }
  }
  return title;
};

export const getHomeStatisticScopes = () => {
  const date = new Date();
  let data: HomeScope[] = [
    {
      subtitle: dayjs(date).format("DD MMM YYYY"),
      title: "Today",
      path: [
        date.getFullYear().toString(),
        date.getMonth().toString(),
        date.getDate().toString(),
      ],
    },
    {
      subtitle: dayjs(date).format("MMM YYYY"),
      title: "This month",
      path: [date.getFullYear().toString(), date.getMonth().toString()],
    },
    {
      subtitle: date.getFullYear().toString(),
      title: "This year",
      path: [date.getFullYear().toString()],
    },
    {
      subtitle: "All",
      title: "All time",
      path: [],
    },
  ];

  return data;
};

export const getHomeStatisticOptions = async () => {
  const date = new Date();
  let options: StatisticOption[][] = [];
  (
    await Promise.all([
      fetchStatisticOptions([], []),
      fetchStatisticOptions([date.getFullYear().toString()], []),
      fetchStatisticOptions(
        [date.getFullYear().toString(), date.getMonth().toString()],
        []
      ),
    ])
  ).map((results, index) => {
    options[index] = results[index];
  });
  return options;
};

export const getHomeStatisticLabels = async (path: string[]) => {
  const query = (path.join("/") || "all") + `/labels/%`;
  const data: Statistic[] = await db.getAllAsync(
    `SELECT * FROM statistics WHERE path LIKE ? AND total > 0 ORDER BY total DESC LIMIT 4 OFFSET 0 `,
    query
  );

  return data;
};

export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Nov",
  "Dec",
];

export const getLabelPaths = (label: string[]) => {
  let paths: { path: string; value: string }[] = [];
  let path = "";
  for (let part of label) {
    paths.push({ path: `${path}/labels/${part}`, value: part });
    path += `/${part}`;
  }
  return paths;
};

export const getStatisticsPaths = (dateString: string, label: string[]) => {
  let date = new Date(dateString);
  let [year, month, day] = [
    date.getFullYear().toString(),
    date.getMonth().toString(),
    date.getDate().toString(),
  ];
  // let weekStart = date.getDate() - date.getDay();
  // let weekEnd = weekStart + 6;

  let paths: { path: string; value: string }[] = [{ path: "all", value: "0" }];
  let path: string = "";
  const labelPaths = getLabelPaths(label);

  paths = paths.concat(
    labelPaths.map((item) => ({ path: "all" + item.path, value: item.value }))
  );

  path = year;
  paths.push({ path: `years/${year}`, value: year });
  paths = paths.concat(
    labelPaths.map((item) => ({ path: path + item.path, value: item.value }))
  );

  paths.push({ path: `${path}/months/${month}`, value: month });
  path += "/" + month;
  paths = paths.concat(
    labelPaths.map((item) => ({ path: path + item.path, value: item.value }))
  );

  paths.push({ path: `${path}/dates/${day}`, value: day });
  path += "/" + day;
  paths = paths.concat(
    labelPaths.map((item) => ({ path: path + item.path, value: item.value }))
  );
  
  return paths;
};

export const updateStatistics = (
  expense: Partial<Expense>,
  promises: Promise<any>[],
  mode: "add" | "delete" = "add"
) => {
  if (expense.date && expense.label && expense.amount) {
    const paths = getStatisticsPaths(expense.date, expense.label.split(","));

    for (let { path, value } of paths) {
      promises.push(
        db.runAsync(
          `INSERT INTO statistics (path, value, total) VALUES (?, ?, ?)
          ON CONFLICT(path)
          DO UPDATE SET total = total ${mode === "add" ? "+ " : "- "} ?;`,
          path,
          value,
          expense.amount,
          expense.amount
        )
      );
    }
  }
};
