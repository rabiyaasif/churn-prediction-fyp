# API Integration Guide for Churn Prediction Tool

## Overview

This API allows e-commerce websites to integrate with the Churn Prediction Tool. The system tracks customer behavior, products, and events to predict customer churn risk using machine learning models.

## Authentication

Most endpoints require API key authentication. Include your API key in the request header:

```
X-API-Key: your_api_key_here
```

**Important:** You will receive your API key when you register for the service. Keep it secure and never expose it in client-side code.

---

## Table of Contents

1. [User Management](#user-management)
2. [Product Management](#product-management)
3. [Event Tracking](#event-tracking)

---

## User Management

### Create User

**Endpoint:** `POST /users/`

**Authentication:** Required (X-API-Key header)

**Description:** Register a customer/user in the system. Users are automatically associated with your client account via the API key.

**Request Body:**
```json
{
  "user_id": "user_12345",
  "email": "customer@example.com",
  "name": "John Doe"
}
```

**Required Fields:**
- `user_id` (string): Your unique identifier for this user/customer

**Optional Fields:**
- `email` (string): Customer's email address
- `name` (string): Customer's name

**Response:**
```json
{
  "user_id": "user_12345",
  "email": "customer@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Usage Example:**
- Call this when a new customer registers on your website
- Use your internal user ID as `user_id` to maintain consistency

---

### Update User

**Endpoint:** `PUT /users/{user_id}`

**Authentication:** Required (X-API-Key header)

**Description:** Update user information.

**URL Parameters:**
- `user_id` (string): The user ID you provided when creating the user

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "name": "John Smith"
}
```

**Optional Fields (send only what you want to update):**
- `email` (string): Updated email address
- `name` (string): Updated name

**Response:**
```json
{
  "user_id": "user_12345",
  "email": "newemail@example.com",
  "name": "John Smith",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**⚠️ Do NOT send:**
- `user_id` in the body (it's in the URL)
- `client_id` (automatically handled by API key)

---

### Delete User

**Endpoint:** `DELETE /users/{user_id}`

**Authentication:** Required (X-API-Key header)

**Description:** Remove a user from the system.

**URL Parameters:**
- `user_id` (string): The user ID to delete

**Request Body:** None

**Response:** 204 No Content (empty body)

---

## Product Management

### Bulk Insert Products

**Endpoint:** `POST /products/bulk`

**Authentication:** Required (X-API-Key header)

**Description:** Insert multiple products at once. Products are automatically associated with your client account.

**Request Body:**
```json
[
  {
    "product_id": "prod_001",
    "name": "Wireless Headphones",
    "description": "Premium noise-cancelling headphones",
    "category": "Electronics",
    "price": 199.99,
    "currency": "USD"
  },
  {
    "product_id": "prod_002",
    "name": "Laptop Stand",
    "description": "Adjustable aluminum laptop stand",
    "category": "Accessories",
    "price": 49.99,
    "currency": "USD"
  }
]
```

**Required Fields:**
- `product_id` (string): Your unique identifier for this product
- `name` (string): Product name

**Optional Fields:**
- `description` (string): Product description
- `category` (string): Product category
- `price` (float): Product price
- `currency` (string): Currency code (e.g., "USD", "EUR")

**Response:**
```json
{
  "inserted": 2
}
```

**Usage Example:**
- Call this when syncing your product catalog
- You can send up to hundreds of products in a single request
- Use your internal product ID as `product_id` to maintain consistency

**⚠️ Do NOT send:**
- `client_id` (automatically handled by API key)
- `created_at` (automatically set by the system)

---

### Update Product

**Endpoint:** `PUT /products/{product_id}`

**Authentication:** Required (X-API-Key header)

**Description:** Update product information.

**URL Parameters:**
- `product_id` (string): The product ID you provided when creating the product

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "description": "Updated description",
  "category": "New Category",
  "price": 249.99,
  "currency": "USD"
}
```

**Optional Fields (send only what you want to update):**
- `name` (string): Updated product name
- `description` (string): Updated description
- `category` (string): Updated category
- `price` (float): Updated price
- `currency` (string): Updated currency

**Response:**
```json
{
  "product_id": "prod_001",
  "name": "Updated Product Name",
  "description": "Updated description",
  "category": "New Category",
  "price": 249.99,
  "currency": "USD",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Usage Example:**
- Call this when product details change (price updates, name changes, etc.)
- Only include fields you want to update - omitted fields remain unchanged

**⚠️ Do NOT send:**
- `product_id` in the body (it's in the URL)
- `client_id` (automatically handled by API key)
- `created_at` (cannot be modified)

---

### Delete Product

**Endpoint:** `DELETE /products/{product_id}`

**Authentication:** Required (X-API-Key header)

**Description:** Remove a product from the system.

**URL Parameters:**
- `product_id` (string): The product ID to delete

**Request Body:** None

**Response:** 204 No Content (empty body)

**Usage Example:**
- Call this when a product is discontinued or removed from your catalog

---

## Event Tracking

### Bulk Insert Events

**Endpoint:** `POST /events/bulk`

**Authentication:** Required (X-API-Key header)

**Description:** Track customer behavior events. This is the core of the churn prediction system - events are used to calculate features for the ML model.

**Request Body (Single Event):**
```json
{
  "user_id": "user_12345",
  "product_id": "prod_001",
  "email": "customer@example.com",
  "event_type": "purchase",
  "session_id": "session_abc123",
  "quantity": 2,
  "price": 399.98,
  "timestamp": "2024-01-15T10:30:00Z",
  "extra_data": {
    "payment_method": "credit_card",
    "discount_code": "SAVE10"
  }
}
```

**Request Body (Multiple Events):**
```json
[
  {
    "user_id": "user_12345",
    "product_id": "prod_001",
    "event_type": "added_to_cart",
    "session_id": "session_abc123",
    "quantity": 1,
    "price": 199.99,
    "timestamp": "2024-01-15T10:25:00Z"
  },
  {
    "user_id": "user_12345",
    "product_id": "prod_001",
    "event_type": "purchase",
    "session_id": "session_abc123",
    "quantity": 1,
    "price": 199.99,
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

**Required Fields:**
- `event_type` (string): Type of event (see Event Types below)

**Optional Fields:**
- `user_id` (string): User who performed the action
- `product_id` (string): Product involved in the event
- `email` (string): User's email (alternative to user_id if user not registered)
- `session_id` (string): Session identifier for grouping related events
- `quantity` (integer): Quantity involved (e.g., items purchased, items added to cart)
- `price` (float): Price/value associated with the event
- `timestamp` (datetime): When the event occurred (ISO 8601 format). If omitted, current time is used.
- `extra_data` (object): Additional metadata as key-value pairs

**Response:**
```json
{
  "inserted": 2
}
```

**Event Types (Important for Churn Prediction):**

The following event types are used by the ML model to calculate churn risk:

1. **`added_to_wishlist`** - Customer adds item to wishlist
2. **`removed_from_wishlist`** - Customer removes item from wishlist
3. **`added_to_cart`** - Customer adds item to shopping cart
4. **`removed_from_cart`** - Customer removes item from cart
5. **`cart_quantity_updated`** - Customer changes quantity in cart
6. **`purchase`** - Customer completes a purchase
7. **`page_view`** - Customer views a page
8. **`search`** - Customer performs a search
9. **`login`** - Customer logs in
10. **`logout`** - Customer logs out

**Usage Examples:**

**Example 1: Track a purchase**
```json
{
  "user_id": "user_12345",
  "product_id": "prod_001",
  "event_type": "purchase",
  "session_id": "session_abc123",
  "quantity": 2,
  "price": 399.98,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Example 2: Track cart activity**
```json
{
  "user_id": "user_12345",
  "product_id": "prod_002",
  "event_type": "added_to_cart",
  "session_id": "session_abc123",
  "quantity": 1,
  "price": 49.99
}
```

**Example 3: Track wishlist activity**
```json
{
  "user_id": "user_12345",
  "product_id": "prod_003",
  "event_type": "added_to_wishlist",
  "session_id": "session_abc123"
}
```

**Example 4: Track anonymous user (no user_id)**
```json
{
  "email": "visitor@example.com",
  "product_id": "prod_001",
  "event_type": "page_view",
  "session_id": "session_xyz789"
}
```

**Best Practices:**
- Send events in real-time or batch them every few minutes
- Always include `user_id` or `email` when available
- Use consistent `session_id` values to group related events
- Include `timestamp` for historical events, omit for real-time events
- Track all cart and wishlist interactions - these are critical for churn prediction

**⚠️ Do NOT send:**
- `client_id` (automatically handled by API key)
- `event_id` (automatically generated by the system)

---

### Delete Event

**Endpoint:** `DELETE /events/{event_id}`

**Authentication:** Required (X-API-Key header)

**Description:** Remove an event from the system.

**URL Parameters:**
- `event_id` (integer): The event ID (returned in event queries, not in creation)

**Request Body:** None

**Response:** 204 No Content (empty body)

**Note:** This endpoint is rarely used. Events are typically not deleted unless correcting data errors.

---

## Model Information

### Get Model Metadata

**Endpoint:** `GET /model/meta`

**Authentication:** None

**Description:** Get information about the ML model including feature names and model version.

**Response:**
```json
{
  "status": "ok",
  "features": [
    "added_to_wishlist",
    "removed_from_wishlist",
    "added_to_cart",
    "removed_from_cart",
    "cart_quantity_updated",
    "total_sessions",
    "days_since_last_activity",
    "total_spent_usd"
  ],
  "friendly_names": {
    "added_to_wishlist": "Added to Wishlist",
    "removed_from_wishlist": "Removed from Wishlist",
    "added_to_cart": "Added to Cart",
    "removed_from_cart": "Removed from Cart",
    "cart_quantity_updated": "Cart Qty Updated",
    "total_sessions": "Total Sessions",
    "days_since_last_activity": "Days Since Last Activity",
    "total_spent_usd": "Total Spent (USD)"
  },
  "units": {
    "added_to_wishlist": "count",
    "removed_from_wishlist": "count",
    "added_to_cart": "count",
    "removed_from_cart": "count",
    "cart_quantity_updated": "count",
    "total_sessions": "count",
    "days_since_last_activity": "days",
    "total_spent_usd": "USD"
  },
  "model_version": "1.0.0",
  "last_trained_at": "2024-01-01T00:00:00Z"
}
```

---

### Get Model Feature Names

**Endpoint:** `GET /model/names`

**Authentication:** None

**Description:** Get list of feature names expected by the model.

**Response:**
```json
{
  "count": 8,
  "features": [
    "added_to_wishlist",
    "removed_from_wishlist",
    "added_to_cart",
    "removed_from_cart",
    "cart_quantity_updated",
    "total_sessions",
    "days_since_last_activity",
    "total_spent_usd"
  ]
}
```

---

## Health Check

### Health Status

**Endpoint:** `GET /health`

**Authentication:** None

**Description:** Check API and database health status.

**Response:**
```json
{
  "status": "ok",
  "checks": {
    "db": {
      "ok": true,
      "error": null
    },
    "model": {
      "ok": true,
      "error": null
    }
  }
}
```

**Status Values:**
- `"ok"`: Both database and model are working
- `"degraded"`: One component is down
- `"down"`: Both components are down

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request format or missing required fields"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid or missing API Key"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message",
  "traceback": "Detailed error traceback"
}
```

---

## Integration Workflow

### Step 1: Sync Your Data
1. **Products:** Call `POST /products/bulk` to sync your product catalog
2. **Users:** Call `POST /users/` when customers register (or batch import existing users)

### Step 2: Track Events in Real-Time
1. Integrate event tracking into your website:
   - When customer adds item to cart → `POST /events/bulk` with `event_type: "added_to_cart"`
   - When customer purchases → `POST /events/bulk` with `event_type: "purchase"`
   - When customer adds to wishlist → `POST /events/bulk` with `event_type: "added_to_wishlist"`
   - And so on...

---

## Best Practices

1. **API Key Security:**
   - Never expose your API key in client-side JavaScript
   - Store API key in environment variables on your server
   - Rotate API keys if compromised

2. **Event Tracking:**
   - Send events in real-time for best accuracy
   - Batch events if needed (send every 1-5 minutes)
   - Always include `user_id` or `email` when available
   - Use consistent `session_id` values

3. **Product Management:**
   - Sync products when catalog changes
   - Update product prices regularly
   - Delete discontinued products

4. **User Management:**
   - Register users when they sign up
   - Update user information when profiles change
   - Use your internal user IDs consistently

5. **Error Handling:**
   - Implement retry logic for failed requests
   - Log errors for debugging
   - Handle rate limiting (if implemented)

6. **Data Consistency:**
   - Use the same IDs across all endpoints (user_id, product_id)
   - Ensure timestamps are in UTC
   - Convert all prices to USD for `total_spent_usd` calculations

---

## Rate Limits

Currently, there are no rate limits, but please:
- Batch requests when possible (use bulk endpoints)
- Avoid sending duplicate events
- Implement reasonable retry logic

---

## Support

For issues or questions:
- Check the `/health` endpoint to verify API status
- Review error messages in responses
- Ensure your API key is valid and included in headers

---

## Changelog

- **v1.0.0** (2024-01-01): Initial API release

---

**Last Updated:** January 2024

