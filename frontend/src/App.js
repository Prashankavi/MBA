import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import Controls from "./components/Controls";
import Charts from "./components/Charts";
import NetworkGraph from "./components/NetworkGraph";

const API_BASE = "https://mbann-backend.onrender.com";

function App() {
  const [product, setProduct] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [rules, setRules] = useState([]);

  const [minConfidence, setMinConfidence] = useState(0.02);
  const [minLift, setMinLift] = useState(0.8);
  const [minSupport, setMinSupport] = useState(0.001);
  const [limit, setLimit] = useState(5);
  const [sortBy, setSortBy] = useState("score");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    fetch(`${API_BASE}/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {});

    fetch(`${API_BASE}/top-products`)
      .then((res) => res.json())
      .then((data) => setTopProducts(data.top_products || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!product.trim()) {
      setSuggestions([]);
      return;
    }

    fetch(`${API_BASE}/products?search=${encodeURIComponent(product)}`)
      .then((res) => res.json())
      .then((data) => setSuggestions(data.products || []))
      .catch(() => setSuggestions([]));
  }, [product]);

useEffect(() => {
  const timer = setTimeout(() => {

    // ✅ ALWAYS fetch rules (for charts)
    const rulesUrl = `${API_BASE}/rules-visualization?min_confidence=${minConfidence}&min_lift=${minLift}&min_support=${minSupport}`;
    fetch(rulesUrl)
      .then((res) => res.json())
      .then((data) => setRules(data.rules || []))
      .catch(() => {});

    // ❌ Only skip recommendations if no product
    if (!product.trim()) {
      setRecommendations([]);
      setMessage("");
      return;
    }

    // ✅ Recommendations API
    const recommendUrl = `${API_BASE}/recommend?product=${encodeURIComponent(
      product
    )}&min_confidence=${minConfidence}&min_lift=${minLift}&min_support=${minSupport}&limit=${limit}&sort_by=${sortBy}&order=${order}`;

    fetch(recommendUrl)
      .then((res) => res.json())
      .then((data) => {
        setRecommendations(data.recommendations || []);
        setMessage(data.message || "");
        if (data.input_product) {
          setProduct(data.input_product);
        }
      })
      .catch(() => {
        setRecommendations([]);
        setMessage("Error connecting to backend.");
      });

  }, 300);

  return () => clearTimeout(timer);
}, [product, minConfidence, minLift, minSupport, limit, sortBy, order]);

  const handleClear = () => {
    setProduct("");
    setRecommendations([]);
    setMessage("");
    setMinConfidence(0.02);
    setMinLift(0.8);
    setMinSupport(0.001);
    setLimit(5);
    setSortBy("score");
    setOrder("desc");
  };

  const quickSelect = (item) => {
    setProduct(item);
  };

  const exportRecommendations = () => {
    if (!recommendations.length) return;

    const rows = [
      ["Input Product", product],
      [],
      ["Recommended Product", "Support", "Confidence", "Lift", "Score", "Why"],
      ...recommendations.map((rec) => [
        rec.product,
        rec.support,
        rec.confidence,
        rec.lift,
        rec.score,
        rec.why,
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${product || "recommendations"}_recommendations.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const businessInsight = useMemo(() => {
    if (!product.trim() || !recommendations.length) return "";

    const topRec = recommendations[0];

    return `Customers who buy ${product} are also likely to buy ${topRec.product}. This suggests a useful product bundling or cross-selling opportunity based on the discovered association rules.`;
  }, [product, recommendations]);

  const networkData = useMemo(() => {
    const center = product?.trim();
    if (!center || !recommendations.length) {
      return { nodes: [], links: [] };
    }

    const nodes = [{ id: center, group: "center" }];
    const links = [];

    recommendations.forEach((rec) => {
      nodes.push({
        id: rec.product,
        group: "recommendation",
      });

      links.push({
        source: center,
        target: rec.product,
        value: rec.lift,
      });
    });

    return { nodes, links };
  }, [product, recommendations]);

  return (
    <div className="app-container">
      <header className="hero-section">
        <h1>🛒 MARKET BASKET ANALYSIS</h1>
        <p>Smart product bundling using Apriori and association rules</p>
      </header>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{stats.total_transactions}</h3>
            <p>Transactions</p>
          </div>
          <div className="stat-card">
            <h3>{stats.total_products}</h3>
            <p>Products</p>
          </div>
          <div className="stat-card">
            <h3>{stats.total_rules}</h3>
            <p>Rules</p>
          </div>
        </div>
      )}

      <div className="quick-products">
        <h3>Popular Products</h3>
        <div className="quick-buttons">
          {topProducts.slice(0, 8).map((item, index) => (
            <button
              key={index}
              type="button"
              className="chip-btn"
              onClick={() => quickSelect(item.product)}
            >
              {item.product}
            </button>
          ))}
        </div>
      </div>

      <Controls
        product={product}
        setProduct={setProduct}
        suggestions={suggestions}
        minConfidence={minConfidence}
        setMinConfidence={setMinConfidence}
        minLift={minLift}
        setMinLift={setMinLift}
        minSupport={minSupport}
        setMinSupport={setMinSupport}
        limit={limit}
        setLimit={setLimit}
        sortBy={sortBy}
        setSortBy={setSortBy}
        order={order}
        setOrder={setOrder}
        onClear={handleClear}
      />

      <div className="results-section">
        <div className="results-header">
          <h2>Recommended Bundle Products</h2>
          <button
            type="button"
            className="export-btn"
            onClick={exportRecommendations}
            disabled={!recommendations.length}
          >
            Download CSV
          </button>
        </div>

        {message && <p className="message-box">{message}</p>}

        <div className="recommendation-grid">
          {recommendations.map((rec, index) => (
            <div className="recommendation-card" key={index}>
              <h3>{rec.product}</h3>
              <p>{rec.why}</p>
              <div className="metrics">
                <span><strong>Support:</strong> {rec.support}</span>
                <span><strong>Confidence:</strong> {rec.confidence}</span>
                <span><strong>Lift:</strong> {rec.lift}</span>
                <span><strong>Score:</strong> {rec.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {businessInsight && (
        <div className="insight-card">
          <h2>Business Insight</h2>
          <p>{businessInsight}</p>
        </div>
      )}

      {networkData.nodes.length > 0 && (
        <div className="network-section">
          <h2>Product Relationship Network</h2>
          <NetworkGraph graphData={networkData} />
        </div>
      )}

      <Charts topProducts={topProducts} rules={rules} />
    </div>
  );
}

export default App;
