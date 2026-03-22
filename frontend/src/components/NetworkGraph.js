import React from "react";
import ForceGraph2D from "react-force-graph-2d";

function NetworkGraph({ graphData }) {

  // Safety check
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="network-card">
        <p style={{ textAlign: "center", padding: "20px", color: "#cbd5e1" }}>
          No network data available.
        </p>
      </div>
    );
  }

  return (
    <div className="network-card">
      <ForceGraph2D
        graphData={graphData}
        height={420}
        nodeLabel="id"

        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={() => 0.003}

        linkWidth={(link) => Math.max(1, (link.value || 1) / 1.5)}

        nodeCanvasObject={(node, ctx, globalScale) => {

          const label = node.id;
          const fontSize = 12 / globalScale;

          ctx.font = `${fontSize}px Sans-Serif`;

          const isCenter = node.group === "center";
          const radius = isCenter ? 10 : 7;

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = isCenter ? "#22c55e" : "#38bdf8";
          ctx.fill();

          // Draw label
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(label, node.x, node.y + radius + 4);
        }}
      />
    </div>
  );
}

export default NetworkGraph;
