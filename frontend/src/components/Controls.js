import React from "react";

function Controls({
  product,
  setProduct,
  suggestions,
  minConfidence,
  setMinConfidence,
  minLift,
  setMinLift,
  minSupport,
  setMinSupport,
  limit,
  setLimit,
  sortBy,
  setSortBy,
  order,
  setOrder,
  onClear,
}) {
  return (
    <div className="controls-card">
      <h2>Recommendation Controls</h2>
      <p className="subtitle">
        Recommendations update automatically when you choose a product or change filters.
      </p>

      <div className="form-group">
        <label>Product Name</label>
        <input
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Type product name like whole milk, yogurt, bread..."
          list="product-suggestions"
        />
        <datalist id="product-suggestions">
          {suggestions.map((item, index) => (
            <option key={index} value={item} />
          ))}
        </datalist>
        <small className="hint-text">
          Choose from suggestions for faster matching.
        </small>
      </div>

      <div className="filters-grid">
        <div className="form-group">
          <label>Min Confidence: {minConfidence}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label>Min Lift: {minLift}</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={minLift}
            onChange={(e) => setMinLift(parseFloat(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label>Min Support: {minSupport}</label>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.001"
            value={minSupport}
            onChange={(e) => setMinSupport(parseFloat(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label>Number of Recommendations</label>
          <input
            type="number"
            min="1"
            max="20"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value || "5", 10))}
          />
        </div>

        <div className="form-group">
          <label>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="score">Score</option>
            <option value="lift">Lift</option>
            <option value="confidence">Confidence</option>
            <option value="support">Support</option>
          </select>
        </div>

        <div className="form-group">
          <label>Order</label>
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      <div className="button-row">
        <button type="button" className="secondary-btn" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default Controls;
