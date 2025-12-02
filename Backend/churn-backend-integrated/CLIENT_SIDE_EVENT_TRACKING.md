# Client-Side Event Tracking Implementation

## Overview

This document describes the existing client-side event tracking implementation in the Churn Prediction Tool codebase. The system provides a REST API endpoint that allows client websites to track customer behavior events for churn prediction analysis.

## Similar Code Found

### 1. Backend API Endpoint

**Location:** `Backend/churn-backend-integrated/app/main.py` (lines 500-561)

**Endpoint:** `POST /events/bulk`

**What it does:**
- Accepts event tracking data from client websites
- Requires API key authentication via `X-API-Key` header
- Accepts single events or arrays of events
- Stores events in the database for ML model feature calculation
- Returns the number of events inserted

**Key Features:**
- Platform independent (works with any e-commerce system)
- Supports batch event submission
- Automatically associates events with client account via API key
- Validates event data structure
- Handles both single event objects and arrays

**Example Request:**
```python
POST /events/bulk
Headers:
  X-API-Key: client_api_key
  Content-Type: application/json
Body:
{
  "user_id": "user_123",
  "event_type": "add_to_cart",
  "price": 199.99
}
```

### 2. Frontend Documentation Examples

**Location:** `Frontend/churn-vision-hub/src/pages/Documentation.tsx` (lines 550-622)

**What it does:**
- Provides JavaScript code examples for client-side integration
- Shows how to use `fetch()` API to send events
- Demonstrates tracking different event types (add to cart, checkout, wishlist)
- Includes both frontend and backend integration examples

**Example Code (from Documentation.tsx):**
```javascript
// Track "Add to Cart" event
async function trackAddToCart(userId, productId, price, quantity) {
  await fetch('http://localhost:8000/events/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key_here'
    },
    body: JSON.stringify({
      user_id: userId,
      product_id: productId,
      event_type: 'added_to_cart',
      session_id: getSessionId(),
      quantity: quantity,
      price: price
    })
  });
}
```

### 3. Python Data Ingestion Script

**Location:** `Backend/churn-backend-integrated/data-ingestion.py`

**What it does:**
- Demonstrates how to send events programmatically (Python example)
- Shows batch event submission
- Used for testing and data seeding
- Uses `requests` library to POST events to the API

**Example Code:**
```python
EVENTS_ENDPOINT = "http://localhost:8000/events/bulk/"
headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}

events = [{
    "user_id": user_id,
    "product_id": product_id,
    "event_type": "add_to_cart",
    "price": 199.99
}]

response = requests.post(EVENTS_ENDPOINT, headers=headers, json=events)
```

### 4. API Integration Guide

**Location:** `Backend/churn-backend-integrated/API_INTEGRATION_GUIDE.md` (lines 258-404)

**What it does:**
- Comprehensive documentation of the event tracking API
- Lists all supported event types
- Provides request/response examples
- Includes best practices and usage guidelines

## Comparison with User's Example

### User's Example:
```javascript
fetch("https://your-api.com/api/track", {
  method: "POST",
  headers: {
    "x-api-key": CLIENT_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    user_id: "...",
    event_type: "add_to_cart",
    price: 199
  })
});
```

### Current Implementation:
- **Endpoint:** `/events/bulk` (vs `/api/track` in example)
- **Authentication:** `X-API-Key` header (same as example)
- **Method:** POST (same as example)
- **Body Format:** JSON with `user_id`, `event_type`, `price` (same fields as example)
- **Additional Features:** Supports batch events, more optional fields, session tracking

## Key Differences

1. **Endpoint Path:** Uses `/events/bulk` instead of `/api/track`
2. **Batch Support:** Can send single events or arrays of events
3. **Additional Fields:** Supports more optional fields like:
   - `product_id`
   - `email` (alternative to user_id)
   - `session_id`
   - `quantity`
   - `timestamp`
   - `extra_data` (custom metadata)

## Supported Event Types

The system tracks the following event types for churn prediction:
- `added_to_cart`
- `removed_from_cart`
- `added_to_wishlist`
- `removed_from_wishlist`
- `cart_quantity_updated`
- `purchase`
- `proceed_to_checkout`
- `page_view`
- `search`
- `login`
- `logout`

## Platform Independence

The implementation is designed to be platform-independent:
- ✅ Works with Shopify (via JavaScript snippet)
- ✅ Works with WooCommerce (via PHP/JavaScript)
- ✅ Works with custom PHP sites
- ✅ Works with any e-commerce system that can make HTTP requests
- ✅ No platform-specific dependencies required

## Security

- API key authentication required
- Client ID automatically associated via API key
- No client-side exposure of sensitive data
- Server-side validation of all event data

## Current Status

The event tracking system is **fully implemented** and ready for client integration. The codebase includes:
- ✅ Backend API endpoint
- ✅ Documentation with code examples
- ✅ Data ingestion scripts for testing
- ✅ Comprehensive API integration guide
- ✅ Frontend documentation page

## Recommendations

1. **Endpoint Naming:** Consider adding an alias endpoint `/api/track` that redirects to `/events/bulk` for better compatibility with common tracking patterns
2. **JavaScript SDK:** Could create a lightweight JavaScript SDK/library for easier integration
3. **Error Handling:** Add client-side retry logic examples in documentation
4. **Analytics:** Consider adding event validation and analytics dashboard for tracking integration health

