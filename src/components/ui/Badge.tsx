const COLORS: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  purple: "bg-brand-100 text-brand-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
};

export function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: keyof typeof COLORS;
}) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${COLORS[color]}`}>
      {children}
    </span>
  );
}
