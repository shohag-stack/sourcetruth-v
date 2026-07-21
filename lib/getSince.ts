type Range = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

export function getSince(range: Range) {
  const now = new Date();

  switch (range) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);

    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    case "all":
      return null;
  }
}
