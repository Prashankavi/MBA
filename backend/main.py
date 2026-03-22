from contextlib import asynccontextmanager
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

DATA_PATH = Path(__file__).parent / "groceries.csv"

transactions = []
all_products = []
rules_df = pd.DataFrame()
top_items_df = pd.DataFrame()


def load_transactions():
    global transactions, all_products, top_items_df

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH).head(2000)
    df.columns = [col.strip() for col in df.columns]

    required_cols = ["Member_number", "Date", "itemDescription"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    df = df.dropna(subset=required_cols).copy()

    df["Member_number"] = df["Member_number"].astype(str).str.strip()
    df["Date"] = df["Date"].astype(str).str.strip()
    df["itemDescription"] = df["itemDescription"].astype(str).str.strip()

    df["Transaction"] = df["Member_number"] + "_" + df["Date"]

    grouped = df.groupby("Transaction")["itemDescription"].apply(list)

    transactions.clear()
    for items in grouped:
        clean_items = list(dict.fromkeys([item for item in items if item]))
        if clean_items:
            transactions.append(clean_items)

    all_products.clear()
    all_products.extend(sorted(df["itemDescription"].dropna().unique().tolist()))

    counts = df["itemDescription"].value_counts().reset_index()
    counts.columns = ["product", "count"]
    globals()["top_items_df"] = counts


def build_rules_once():
    global rules_df

    if not transactions:
        rules_df = pd.DataFrame()
        return

    te = TransactionEncoder()
    te_array = te.fit(transactions).transform(transactions)
    basket = pd.DataFrame(te_array, columns=te.columns_)

    frequent_itemsets = apriori(
        basket,
        min_support=0.001,
        use_colnames=True
    )

    if frequent_itemsets.empty:
        rules_df = pd.DataFrame()
        return

    rules = association_rules(
        frequent_itemsets,
        metric="confidence",
        min_threshold=0.01
    )

    if rules.empty:
        rules_df = pd.DataFrame()
        return

    rules["antecedents"] = rules["antecedents"].apply(lambda x: sorted(list(x)))
    rules["consequents"] = rules["consequents"].apply(lambda x: sorted(list(x)))

    rules["score"] = (
        (rules["confidence"] * 0.5) +
        (rules["lift"] * 0.3) +
        (rules["support"] * 0.2)
    )

    rules_df = rules.sort_values(
        by=["score", "lift", "confidence"],
        ascending=False
    ).reset_index(drop=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_transactions() 
    build_rules_once()
    yield


app = FastAPI(title="Market Basket Analysis API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Market Basket Analysis API is running successfully"}


@app.get("/stats")
def stats():
    return {
        "total_transactions": len(transactions),
        "total_products": len(all_products),
        "total_rules": 0 if rules_df.empty else len(rules_df),
        "top_products": top_items_df.head(10).to_dict(orient="records"),
    }


@app.get("/products")
def get_products(search: str = Query(default="")):
    if not search.strip():
        return {"products": all_products[:50]}

    search_lower = search.lower()
    matched = [p for p in all_products if search_lower in p.lower()]
    return {"products": matched[:50]}


@app.get("/recommend")
def recommend(
    product: str,
    min_confidence: float = 0.02,
    min_lift: float = 0.8,
    min_support: float = 0.001,
    limit: int = 5,
    sort_by: str = "score",
    order: str = "desc",
):
    if rules_df.empty:
        build_rules_once()
    
        if rules_df.empty:
            return {
                "input_product": product,
                "recommendations": [],
                "message": "Rules are not available.",
            }

    product = product.strip()
    product_lower = product.lower()

    exact_match = next((p for p in all_products if p.lower() == product_lower), None)

    if not exact_match:
        partial_match = next((p for p in all_products if product_lower in p.lower()), None)
        if partial_match:
            exact_match = partial_match

    if not exact_match:
        return {
            "input_product": product,
            "recommendations": [],
            "message": "Product not found in dataset. Please choose from suggestions.",
        }

    matched_rules = rules_df[
        rules_df["antecedents"].apply(
            lambda items: any(exact_match.lower() == item.lower() for item in items)
        )
    ].copy()

    if matched_rules.empty:
        return {
            "input_product": exact_match,
            "recommendations": [],
            "message": "No recommendations found for this product.",
        }

    matched_rules = matched_rules[
        (matched_rules["confidence"] >= min_confidence) &
        (matched_rules["lift"] >= min_lift) &
        (matched_rules["support"] >= min_support)
    ].copy()

    if matched_rules.empty:
        return {
            "input_product": exact_match,
            "recommendations": [],
            "message": "No recommendations found. Lower the thresholds.",
        }

    valid_sort_fields = ["score", "lift", "confidence", "support"]
    if sort_by not in valid_sort_fields:
        sort_by = "score"

    ascending = order == "asc"
    matched_rules = matched_rules.sort_values(by=sort_by, ascending=ascending)

    recommendations = []
    seen = set()

    for _, row in matched_rules.iterrows():
        for item in row["consequents"]:
            item_lower = item.lower()
            if item_lower != exact_match.lower() and item_lower not in seen:
                seen.add(item_lower)
                recommendations.append({
                    "product": item,
                    "support": round(float(row["support"]), 4),
                    "confidence": round(float(row["confidence"]), 4),
                    "lift": round(float(row["lift"]), 4),
                    "score": round(float(row["score"]), 4),
                    "why": f"{item} is frequently bought together with {exact_match}.",
                })

            if len(recommendations) >= limit:
                break

        if len(recommendations) >= limit:
            break

    return {
        "input_product": exact_match,
        "recommendations": recommendations,
        "message": "Recommendations generated successfully." if recommendations else "No recommendations found.",
    }


@app.get("/top-products")
def top_products():
    return {"top_products": top_items_df.head(15).to_dict(orient="records")}


@app.get("/rules-visualization")
def rules_visualization(
    min_confidence: float = 0.02,
    min_lift: float = 0.8,
    min_support: float = 0.001,
):
    global rules_df

    # ✅ BUILD RULES IF EMPTY
    if rules_df.empty:
        build_rules_once()

    if rules_df.empty:
        return {"rules": []}

    df = rules_df[
        (rules_df["confidence"] >= min_confidence) &
        (rules_df["lift"] >= min_lift) &
        (rules_df["support"] >= min_support)
    ].head(100)

    result = []
    for _, row in df.iterrows():
        result.append({
            "support": float(row["support"]),
            "confidence": float(row["confidence"]),
            "lift": float(row["lift"]),
        })

    return {"rules": result}

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)