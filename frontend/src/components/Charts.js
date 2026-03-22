import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";

function Charts({ topProducts, rules }) {
  return (
    <div className="charts-section">
      <h2>Analytics Dashboard</h2>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Top Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <XAxis dataKey="product" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Support vs Confidence</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="number" dataKey="support" name="Support" />
              <YAxis type="number" dataKey="confidence" name="Confidence" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={rules} fill="#38bdf8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Charts;
