export type Category =
  | "Food"
  | "Transport"
  | "Entertainment"
  | "Shopping"
  | "Bills"
  | "Other";

const colors = {
  light: {
    text: "#1C1C1E",
    tint: "#3A3A3C",

    background: "#FFFFFF",
    foreground: "#1C1C1E",

    card: "#F9F9F9",
    cardForeground: "#1C1C1E",

    primary: "#3A3A3C",
    primaryForeground: "#FFFFFF",

    secondary: "#F2F2F7",
    secondaryForeground: "#1C1C1E",

    muted: "#F2F2F7",
    mutedForeground: "#8E8E93",

    accent: "#F2F2F7",
    accentForeground: "#1C1C1E",

    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",

    border: "#E5E5EA",
    input: "#E5E5EA",
  },

  radius: 16,
};

export const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
];

export const CATEGORY_CONFIG: Record<
  Category,
  { light: string; bar: string; icon: string }
> = {
  Food:          { light: "#FFF0F0", bar: "#FF6B6B", icon: "restaurant-outline" },
  Transport:     { light: "#EFF6FF", bar: "#3B82F6", icon: "car-outline" },
  Entertainment: { light: "#F5F0FF", bar: "#8B5CF6", icon: "film-outline" },
  Shopping:      { light: "#FFFBEB", bar: "#F59E0B", icon: "bag-outline" },
  Bills:         { light: "#F0FFF4", bar: "#22C55E", icon: "receipt-outline" },
  Other:         { light: "#FFF7ED", bar: "#F97316", icon: "ellipsis-horizontal-outline" },
};

export default colors;
