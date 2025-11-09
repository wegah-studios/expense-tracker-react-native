import db from "@/db/schema";
import {
  Expense,
  HomeScope,
  Insight,
  Statistic,
  StatisticOption,
  StatisticTrend,
} from "@/types/common";
import dayjs from "dayjs";
import { formatAmount } from "./appUtils";

export const getPathString = (path: string[][]) => {
  const group = path[1].length
    ? path[0].length
      ? "labels"
      : "all/labels"
    : path[0].length === 1
    ? "years"
    : path[0].length === 2
    ? "months"
    : path[0].length === 3
    ? "dates"
    : "all";
  const combined = path.flat();
  const value = combined.pop();
  const pathstring =
    combined.join("/") +
    (combined.length ? "/" : "") +
    group +
    (value ? "/" + value : "");
  return pathstring;
};

export const fetchPathInfo = async (path: string[][]) => {
  const data: Statistic | null = await db.getFirstAsync(
    `SELECT * FROM statistics WHERE path = ? AND total > 0 LIMIT 1`,
    getPathString(path)
  );

  return { total: data?.total || 0, value: data?.value || "" };
};

export const fetchInsightTrends = async (
  insight: Insight,
  options: Map<string, StatisticOption[]>
) => {
  let trends: StatisticTrend[] = [];
  if (insight.path[1].length) {
    const key = getPathString([insight.path[0], []]);
    const selectedOptions = options.get(key);
    if (selectedOptions && selectedOptions.length > 1) {
      const label = insight.path[1][insight.path[1].length - 1];
      let paths = selectedOptions.map(
        (option) =>
          `${insight.path[0].length ? insight.path[0].join("/") + "/" : ""}${
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
          title: `Ksh ${formatAmount(insight.total / data.length)}`,
          description: `spent on ${insight.value} per ${
            !insight.path[0].length
              ? "year"
              : insight.path[0].length === 1
              ? "month"
              : "day"
          }`,
        });
      }
    }
  } else {
    const key = getPathString([insight.path[0], []]);
    const selectedOptions = options.get(key);
    if (selectedOptions && selectedOptions.length > 1) {
      trends.push({
        title: `-Ksh ${formatAmount(
          insight.total / selectedOptions.length,
          10000
        )}`,
        description: `per ${
          !insight.path[0].length
            ? "year"
            : insight.path[0].length === 1
            ? "month"
            : "day"
        }`,
      });
    }

    if (insight.path[0].length) {
      const key = getPathString([insight.path[0].slice(0, -1), []]);
      const relativeOptions = options.get(key);
      if (relativeOptions && relativeOptions.length > 1) {
        const pathIndex = relativeOptions.findIndex(
          (item) => item.value === insight.value
        );
        const nearestOption =
          relativeOptions[pathIndex - 1] || relativeOptions[pathIndex + 1];
        let nearestOptionPath = insight.path[0].slice(0, -1);
        nearestOptionPath[nearestOptionPath.length] = nearestOption.value;
        const diff = insight.total - nearestOption.total;
        trends.push({
          title: `${diff < 0 ? "-" : "+"}Ksh ${formatAmount(
            Math.abs(diff),
            10000
          )}`,
          description: `${diff < 0 ? "less than" : "more than"} ${getPathTitles(
            [nearestOptionPath, []]
          ).title}`,
        });
      }
    }
  }
  return trends;
};

export const fetchInsightLabels = async (
  path: string[][],
  page: number = 1
) => {
  let query =
    (path[0].join("/") || "all") +
    (path[1].length ? "/" + path[1].join("/") : "") +
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

export const fetchInsightOptions = async (path: string[][]) => {
  let query = `${
    path[0].length
      ? path[0].join("/") + "/" + (path[0].length === 1 ? "months" : "dates")
      : `years`
  }`;
  const data: Statistic[] = await db.getAllAsync(
    `SELECT * FROM statistics WHERE path LIKE ? AND total > 0 ORDER BY CAST(value AS INTEGER) ASC`,
    query + "%"
  );

  let result: StatisticOption[] = data.map((item) => {
    let title = "";
    let subtitle = "";

    if (!path[0].length) {
      let date = new Date();
      const diff = date.getFullYear() - Number(item.value);
      subtitle = `${diff === 0 ? "this" : diff === 1 ? "last" : diff} year${
        diff > 1 ? "s ago" : ""
      }`;
      title = item.value;
    } else if (path[0].length === 1) {
      [subtitle] = item.path.split("/").slice(-3);
      title = months[Number(item.value)];
    } else if (path[0].length === 2) {
      title = ("0" + item.value).slice(-2);
      const [year, month, _c, day] = item.path.split("/");
      const date = new Date(Number(year), Number(month), Number(day));
      subtitle = dayjs(date).format("ddd");
    }

    return { title, subtitle, value: item.value, total: item.total };
  });

  return result;
};

export const getPathTitles = (path: string[][]) => {
  let title = "All time";
  let subtitle = "";
  if (path[0].length) {
    const year = path[0][0];
    const month = path[0][1];
    const day = path[0][2];

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
  if (path[1].length) {
    subtitle = title;
    title = path[1][path[1].length - 1];
  }
  return { title, subtitle };
};

export const getHomeInsightScopes = () => {
  const date = new Date();
  let data: HomeScope[] = [
    {
      subtitle: dayjs(date).format("DD MMM YYYY"),
      title: "Today",
      path: [
        [
          date.getFullYear().toString(),
          date.getMonth().toString(),
          date.getDate().toString(),
        ],
        [],
      ],
    },
    {
      subtitle: dayjs(date).format("MMM YYYY"),
      title: "This month",
      path: [[date.getFullYear().toString(), date.getMonth().toString()], []],
    },
    {
      subtitle: date.getFullYear().toString(),
      title: "This year",
      path: [[date.getFullYear().toString()], []],
    },
    {
      subtitle: "All",
      title: "All time",
      path: [[], []],
    },
  ];

  return data;
};

export const getHomeInsightOptions = async () => {
  const date = new Date();
  let paths: Record<number, string[][]> = {
    0: [[], []],
    1: [[date.getFullYear().toString()], []],
    2: [[date.getFullYear().toString(), date.getMonth().toString()], []],
  };
  let record: Map<string, StatisticOption[]> = new Map();
  (
    await Promise.all([
      fetchInsightOptions(paths[0]),
      fetchInsightOptions(paths[1]),
      fetchInsightOptions(paths[2]),
    ])
  ).map((results, index) => {
    const pathstring = getPathString(paths[index]);
    record.set(pathstring, results);
  });
  return record;
};

export const getHomeInsightLabels = async (path: string[][]) => {
  let query =
    (path[0].join("/") || "all") +
    (path[1].length ? "/" + path[1].join("/") : "") +
    `/labels/%`;
  const data: Statistic[] = await db.getAllAsync(
    `SELECT * FROM statistics WHERE path LIKE ? AND total > 0 ORDER BY total DESC LIMIT 4 OFFSET 0 `,
    query
  );

  return data;
};

export const parseHomeRecord = async (
  record: Insight & { labels: Statistic[] },
  options: Map<string, StatisticOption[]>
) => {};

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
  "Oct",
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
