"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export type MonthlyStat = {
  month: string;
  revenue: number;
  profit: number;
};

export function RevenueChart({ data }: { data: MonthlyStat[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`}
          />
          <Tooltip
            formatter={(value) => new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ"}
          />
          <Legend />
          <Bar dataKey="revenue" name="Doanh thu" fill="#4c6581" radius={[6, 6, 0, 0]} />
          <Line dataKey="profit" name="Lợi nhuận" stroke="#16a34a" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
