# Weekly Report Generation Flow

## Overview
This document explains the complete flow of how weekly reports are generated on-demand from the events table.

---

## 1. User Initiates Report Generation

### Frontend (`Reports.tsx`)
- User navigates to `/dashboard/reports`
- User selects a **week ending date** (e.g., `2025-01-19`)
- User clicks **"Generate Report"** button

### API Call
```javascript
GET /reports/generate?client_id=1&week_ending=2025-01-19
Headers: X-API-Key: <user_api_key>
```

---

## 2. Backend Receives Request

### Endpoint (`routes_reports.py`)
```python
@router.get("/reports/generate")
async def generate_report(
    client_id: int,
    week_ending: date,
    db: AsyncSession
)
```

**Steps:**
1. Validates `client_id` and `week_ending` parameters
2. Authenticates using API key
3. Calls `generate_weekly_report_from_events()`

---

## 3. Data Collection Phase

### Service (`report_generator_on_demand.py`)

#### 3.1 Calculate Week Range
```python
week_start = week_ending - timedelta(days=6)  # 7 days total
# Example: If week_ending = 2025-01-19
# week_start = 2025-01-13
```

#### 3.2 Query Events Table
```sql
SELECT
    user_id,
    event_type,
    timestamp,
    price,
    quantity,
    session_id
FROM events
WHERE client_id = :cid
  AND timestamp >= :week_start
  AND timestamp <= :week_end
ORDER BY user_id, timestamp
```

**What this retrieves:**
- All events for the client in that week
- Event types: `added_to_cart`, `removed_from_cart`, `purchase`, `added_to_wishlist`, etc.
- User activity data

---

## 4. Feature Engineering Phase

### 4.1 Group Events by User
```python
user_events = {
    "user_001": [
        {event_type: "added_to_cart", timestamp: ..., price: 49.99},
        {event_type: "purchase", timestamp: ..., price: 49.99},
        ...
    ],
    "user_002": [...],
    ...
}
```

### 4.2 Aggregate Features Per User

For each user, calculate:

| Feature | Calculation |
|---------|-------------|
| `added_to_wishlist` | Count events where `event_type = "added_to_wishlist"` |
| `removed_from_wishlist` | Count events where `event_type = "removed_from_wishlist"` |
| `added_to_cart` | Count events where `event_type = "added_to_cart"` |
| `removed_from_cart` | Count events where `event_type = "removed_from_cart"` |
| `cart_quantity_updated` | Count events where `event_type = "cart_quantity_updated"` |
| `total_sessions` | Count unique `session_id` values |
| `total_spent_usd` | Sum of `price * quantity` for `purchase`/`order_completed` events |
| `days_since_last_activity` | Days between last event timestamp and today |

**Example Output:**
```python
features = {
    "added_to_wishlist": 2,
    "removed_from_wishlist": 0,
    "added_to_cart": 5,
    "removed_from_cart": 1,
    "cart_quantity_updated": 3,
    "total_sessions": 8,
    "days_since_last_activity": 2,
    "total_spent_usd": 149.97
}
```

### 4.3 Enrich with User Info
```python
# Query users table to get email and name
SELECT user_id, email, name
FROM users
WHERE client_id = :cid AND user_id IN (...)
```

---

## 5. ML Prediction Phase

### 5.1 Build Prediction Payload
```python
payload = [
    {
        "added_to_wishlist": 2,
        "removed_from_wishlist": 0,
        "added_to_cart": 5,
        "removed_from_cart": 1,
        "cart_quantity_updated": 3,
        "total_sessions": 8,
        "days_since_last_activity": 2,
        "total_spent_usd": 149.97
    },
    # ... one object per user
]
```

### 5.2 Run ML Model
```python
predictions = await predict_churn(payload)
# Returns:
# [
#   {"probability": 0.85, "prediction": 1},  # High churn risk
#   {"probability": 0.23, "prediction": 0},  # Low churn risk
#   ...
# ]
```

### 5.3 Classify Risk Levels
```python
for each user:
    prob = prediction["probability"]
    if prob >= 0.7:
        risk_level = "High"
    elif prob >= 0.4:
        risk_level = "Medium"
    else:
        risk_level = "Low"
```

### 5.4 Classify Segments
```python
for each user:
    if total_spent >= 1000 OR total_sessions >= 40:
        segment = "High-Value"
    elif total_spent >= 200 OR total_sessions >= 15:
        segment = "Regular"
    elif total_spent >= 50 OR total_sessions >= 5:
        segment = "Occasional"
    else:
        segment = "New"
```

---

## 6. Metrics Aggregation Phase

### 6.1 Calculate Summary Metrics
```python
total_customers = len(customers)  # Total users with events
high_risk_count = count(risk_level == "High")
churned_this_week = count(churn_probability >= 0.8)
retention_rate = (1 - churned_this_week / total_customers) * 100
avg_churn_probability = average(all churn_probabilities)
```

### 6.2 Week-over-Week Comparison
```python
# Query previous week's events
prev_week_ending = week_ending - timedelta(days=7)
# Calculate previous week metrics (simplified)
# Calculate percentage changes
high_risk_change = ((current - previous) / previous) * 100
```

---

## 7. Insights Generation Phase

### 7.1 Generate Key Insights
```python
insights = []
if high_risk_count > 0:
    insights.append(f"{high_risk_count} customers are currently classified as high churn risk.")
if churned_this_week > 0:
    insights.append(f"{churned_this_week} customers are estimated to have churned this week.")
insights.append(f"Average churn probability across your base is {avg_churn_prob*100:.1f}%.")
```

### 7.2 Segment Breakdown
```python
for each segment (High-Value, Regular, Occasional, New):
    count = number of users in segment
    avg_risk = average churn probability for segment * 100
    trend = compare with previous week (if available)
    
    segment_breakdown.append({
        "segment": segment_name,
        "count": count,
        "riskLevel": avg_risk,
        "trend": "up" or "down"
    })
```

### 7.3 Identify Top Risk Factors
```python
# Analyze high-risk customers
for each high_risk_customer:
    extract top_risk_factors from their features
    # e.g., "Decreased Purchase Frequency", "High Cart Abandonment"

# Count frequency of each risk factor
risk_factors = [
    {"factor": "Decreased Purchase Frequency", "impact": "High"},
    {"factor": "High Cart Abandonment", "impact": "Medium"},
    ...
]
```

### 7.4 Generate Recommendations
```python
recommendations = []
if high_risk_count > 0:
    recommendations.append({
        "action": "Launch targeted win-back campaign...",
        "priority": "high",
        "expectedImpact": "Reduce churn by 25-30%..."
    })
if retention_rate < 95:
    recommendations.append({
        "action": "Review onboarding flows...",
        "priority": "medium",
        "expectedImpact": "Increase retention rate..."
    })
```

---

## 8. AI Executive Summary Generation

### 8.1 Prepare Data for Gemini
```python
report_payload = {
    "summary": {
        "totalCustomers": 1000,
        "highRiskCount": 150,
        "churnedThisWeek": 50,
        "retentionRate": 95.0,
        "avgChurnProbability": 0.15,
        "prevWeekComparison": {...}
    },
    "keyInsights": [...],
    "topRiskFactors": [...],
    "segmentBreakdown": [...],
    "recommendations": [...]
}
```

### 8.2 Call Gemini API
```python
prompt = """
You are an analyst writing a short weekly report for a non-technical business owner.

SUMMARY (numbers):
{summary}

KEY INSIGHTS:
{key_insights}

SEGMENT BREAKDOWN:
{segments}

TOP RISK FACTORS:
{risk_factors}

Write a concise executive summary in plain business language.
- 2–3 short paragraphs max
- No jargon, no formulas
- Focus on what is happening and why it matters
- End with a positive, action-oriented tone
"""

model = genai.GenerativeModel("gemini-1.5-pro")
response = model.generate_content(prompt)
executive_summary = response.text
```

### 8.3 Fallback (if Gemini fails)
```python
if Gemini API fails or no API key:
    use template-based summary:
    "This week you had {total} active customers, 
     with {high} currently flagged as high churn risk..."
```

---

## 9. Assemble Final Report

### 9.1 Structure Report Data
```python
final_report = {
    "summary": {
        "totalCustomers": 1000,
        "highRiskCount": 150,
        "churnedThisWeek": 50,
        "retentionRate": 95.0,
        "avgChurnProbability": 0.15,
        "prevWeekComparison": {
            "highRisk": 5.2,  # +5.2% change
            "churned": -2.1,  # -2.1% change
            "retention": 0.5   # +0.5% change
        }
    },
    "keyInsights": [
        "150 customers are currently classified as high churn risk.",
        "50 customers are estimated to have churned this week.",
        "Average churn probability across your base is 15.0%."
    ],
    "topRiskFactors": [
        {"factor": "Decreased Purchase Frequency", "impact": "High"},
        {"factor": "High Cart Abandonment", "impact": "Medium"}
    ],
    "segmentBreakdown": [
        {
            "segment": "High-Value",
            "count": 200,
            "riskLevel": 12.5,
            "trend": "down"
        },
        ...
    ],
    "recommendations": [
        {
            "action": "Launch targeted win-back campaign...",
            "priority": "high",
            "expectedImpact": "Reduce churn by 25-30%..."
        },
        ...
    ],
    "executiveSummary": "This week you had 1000 active customers..."
}
```

---

## 10. Return Response

### 10.1 API Response
```json
{
    "week_ending": "2025-01-19",
    "report_data": {
        "summary": {...},
        "keyInsights": [...],
        "topRiskFactors": [...],
        "segmentBreakdown": [...],
        "recommendations": [...],
        "executiveSummary": "..."
    }
}
```

### 10.2 Frontend Display
- Frontend receives the report data
- Displays in professional format:
  - Executive Summary section
  - Key Metrics cards (Total Customers, High Risk, Churned, Retention)
  - Key Insights list
  - Top Risk Factors
  - Customer Segment Analysis
  - Recommended Actions
- User can click "Download PDF" to generate PDF version

---

## Complete Flow Diagram

```
┌─────────────────┐
│  User Clicks   │
│ "Generate"     │
│ (Selects Date) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend API   │
│  Call: GET      │
│  /reports/      │
│  generate       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend Route  │
│  Validates      │
│  Authenticates  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Query Events    │
│ Table for Week  │
│ (7 days)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Aggregate       │
│ Events by User  │
│ Build Features  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run ML Model    │
│ predict_churn() │
│ Get Probabilities│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │
│ Metrics:        │
│ - Total Users   │
│ - High Risk     │
│ - Churned       │
│ - Retention     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │
│ - Insights      │
│ - Segments      │
│ - Risk Factors  │
│ - Recommendations│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call Gemini AI  │
│ Generate        │
│ Executive       │
│ Summary         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Assemble Report │
│ JSON Structure  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return to       │
│ Frontend        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Display Report  │
│ Professional UI │
│ (PDF Download)  │
└─────────────────┘
```

---

## Key Points

1. **No Database Storage**: Reports are generated on-demand and not stored
2. **Real-time Analysis**: Always uses latest events data
3. **ML Integration**: Uses your existing `predict_churn()` function
4. **AI Enhancement**: Gemini generates human-readable executive summary
5. **Flexible**: Can generate reports for any week by changing `week_ending` parameter

---

## Performance Considerations

- **Query Optimization**: Events table should be indexed on `client_id`, `timestamp`
- **Caching**: Consider caching if generating same week multiple times
- **Async Processing**: All database queries and ML predictions are async
- **Error Handling**: Graceful fallbacks if Gemini API fails

---

## Example Timeline

For a report for week ending `2025-01-19`:

1. **00:00ms** - User clicks "Generate Report"
2. **00:50ms** - Backend receives request
3. **01:00ms** - Query events table (7 days: Jan 13-19)
4. **01:200ms** - Aggregate events into features (1000 users)
5. **01:500ms** - Run ML predictions (1000 predictions)
6. **01:800ms** - Calculate metrics and insights
7. **02:000ms** - Call Gemini API for executive summary
8. **02:500ms** - Assemble final report
9. **02:600ms** - Return JSON to frontend
10. **02:700ms** - Frontend displays report

**Total Time: ~2.7 seconds** (varies based on data volume and API response times)

