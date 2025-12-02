# Complete User Flow Documentation
## Churn Prediction Tool - Comprehensive User Journey

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Event Explorer (High-Risk Shoppers)](#3-event-explorer-high-risk-shoppers)
4. [Customer Profiles](#4-customer-profiles)
5. [Churn Prediction](#5-churn-prediction)
6. [Bulk Upload](#6-bulk-upload)
7. [Reports](#7-reports)
8. [Settings](#8-settings)
9. [Email & Discount Features](#9-email--discount-features)

---

## 1. Authentication Flow

### 1.1 User Registration (Sign Up)

**Entry Point:** Landing Page → "Sign Up" button

**Flow Steps:**

1. **Navigate to Sign Up Page**
   - User clicks "Sign Up" or "Create Account" link
   - URL: `/signup`

2. **Fill Registration Form**
   - **Business Name** (required)
     - Field validation: Shows red border + "Business name is required" if empty
   - **Email Address** (required)
     - Field validation: Shows red border + "Email is required" if empty
     - Backend validation: Checks for duplicate emails (case-insensitive)
   - **Domain** (required)
     - Field validation: Shows red border + "Domain is required" if empty
   - **Website URL** (required)
     - Field validation: Shows red border + "Website URL is required" if empty
   - **Password** (required)
     - Field validation: Shows red border + "Password is required" if empty
     - Toggle visibility with eye icon

3. **Form Submission**
   - User clicks "Create Account" button
   - **Validation Check:**
     - If any field is empty → Red borders appear on empty fields with error messages
     - Form does NOT submit
   - **If all fields valid:**
     - API Call: `POST /clients/`
     - Request Body:
       ```json
       {
         "name": "Business Name",
         "email": "user@company.com",
         "domain": "Domain Name",
         "password": "password123",
         "url": "https://website.com"
       }
       ```
     - **Success Response:**
       - Returns: `{ "api_key": "...", "client_id": 1 }`
       - Stores `api_key` and `client_id` in localStorage
       - Redirects to: `/onboarding/intro`
     - **Error Response:**
       - Email already exists → Shows error message
       - Other errors → Shows generic error message

**User Experience:**
- Real-time validation feedback
- Clear error messages
- Smooth transition to onboarding

---

### 1.2 User Login

**Entry Point:** Landing Page → "Sign In" button

**Flow Steps:**

1. **Navigate to Login Page**
   - User clicks "Sign In" link
   - URL: `/login`

2. **Fill Login Form**
   - **Email Address** (required)
     - Field validation: Shows red border + "Email is required" if empty
   - **Password** (required)
     - Field validation: Shows red border + "Password is required" if empty
     - Toggle visibility with eye icon
   - "Forgot password?" link (UI only, not implemented)

3. **Form Submission**
   - User clicks "Sign In" button
   - **Validation Check:**
     - If email empty → Red border + "Email is required"
     - If password empty → Red border + "Password is required"
     - Form does NOT submit if validation fails
   - **If validation passes:**
     - API Call: `POST /clients/login`
     - Request Body:
       ```json
       {
         "email": "user@company.com",
         "password": "password123"
       }
       ```
     - **Success Response (200):**
       - Returns: `{ "api_key": "...", "client_id": 1 }`
       - Stores `api_key` and `client_id` in localStorage
       - Redirects to: `/dashboard`
     - **Error Response (401):**
       - Invalid email or password → Shows error: "Invalid email or password"
       - User stays on login page

**User Experience:**
- Immediate validation feedback
- Clear error messages
- Automatic redirect on success

---

## 2. Dashboard Overview

**Entry Point:** After successful login → `/dashboard`

**Flow Steps:**

1. **Page Load**
   - Fetches client profile from localStorage
   - API Call: `GET /clients/profile/me`
   - Displays client name in sidebar

2. **Dashboard Content**
   - **Header:**
     - Title: "E-Commerce Customer Churn Intelligence"
     - Subtitle: Shows model accuracy percentage
   
   - **Top Metrics Cards (6 cards):**
     - Total Customers
     - Average Churn Risk
     - High Risk Customers
     - Total Revenue at Risk
     - Interventions This Month
     - Model Accuracy
     - API Call: `GET /analysis/{client_id}?limit=1000`

3. **Customer Segmentation Section**
   - Shows 4 segment cards:
     - High-Value
     - Regular
     - Occasional
     - New
   - Each card shows:
     - Customer count
     - Percentage of total
     - Average churn rate
     - Average customer value

4. **Charts Section**
   - **Churn Risk Distribution** (Pie Chart)
     - Shows distribution of High/Medium/Low risk customers
   - **Top Churn Risk Factors** (Bar Chart)
     - Shows top 6 features contributing to churn
   - **Churn Rate Trends** (Line Chart)
     - Shows churn rate over time
     - Shows interventions over time

5. **Recently Identified High-Risk Customers**
   - Lists top 5 high-risk customers
   - Shows:
     - Customer name and email
     - Churn probability percentage
     - Top risk factors
   - "View Details" button → Navigates to Customer Profiles page

6. **Sidebar Navigation**
   - Dashboard (active)
   - Event Explorer
   - Churn Prediction
   - Customer Profiles
   - Bulk Upload
   - Reports
   - Settings
   - API Documentation
   - Admin Panel (if admin)

7. **Top Header**
   - Mobile menu button (mobile only)
   - User profile dropdown (right side)
     - Shows user avatar
     - Dropdown: Logout

**User Experience:**
- Comprehensive overview of business health
- Visual data representation
- Quick access to high-risk customers
- Easy navigation to other sections

---

## 3. Event Explorer (High-Risk Shoppers)

**Entry Point:** Sidebar → "Event Explorer" or URL: `/dashboard/events`

**Flow Steps:**

1. **Page Load**
   - Validates `client_id` from localStorage
   - API Call: `GET /customers/customers/{client_id}?limit=10&offset=0&risk=High`
   - Filters for high-risk customers only
   - Displays loading state

2. **Filters Section**
   - **Segment Filter:**
     - Options: All Segments, High-Value, Regular, Occasional, New
     - Default: "All Segments"
     - On change: Resets to page 1, refetches data
   - **Risk Level Filter:**
     - Options: All Risk Levels, High, Medium, Low
     - Default: "High"
     - On change: Resets to page 1, refetches data

3. **Summary Metrics Cards (3 cards)**
   - **High-Risk Count:**
     - Shows total number of high-risk customers
     - Shows percentage of total customers
   - **Revenue at Risk:**
     - Shows total revenue value at risk
     - Formatted as $XK
   - **Average Churn Probability:**
     - Shows average churn probability percentage
     - Progress bar visualization

4. **Bulk Actions by Segment**
   - For each unique segment in the results:
     - Shows segment name
     - Shows customer count for that segment
     - **"Send Email" button:**
       - Opens bulk email dialog
       - Pre-filled with segment-specific content
       - User can edit subject and message
       - On send: Fetches ALL customers in segment, sends bulk email
     - **"Apply Discount" button:**
       - Opens discount dialog
       - User enters discount code and percentage
       - On apply: Sends discount email to all customers in segment

5. **Individual Customer Actions**
   - For each high-risk customer (paginated):
     - **Customer Card displays:**
       - Customer name with churn risk badge (e.g., "91% Churn Risk")
       - Segment badge
       - Email address
       - Customer metrics:
         - Customer Value ($XK)
         - Last Purchase (X days ago)
         - Segment name
     - **Critical Risk Factors section:**
       - Lists top risk factors (e.g., "Days Since Last Activity", "Total Sessions")
     - **Immediate Actions Required section:**
       - Lists recommendations (e.g., "Send 20% discount code", "Trigger win-back email")
     - **Action Buttons:**
       - **"Send Personalized Email":**
         - Opens email dialog
         - Pre-filled with customer name and personalized content
         - User edits subject and message
         - On send: Calls `POST /emails/send-single`
         - Shows success/error message
       - **"Schedule Call":**
         - Placeholder button (not implemented)
       - **"Apply Discount":**
         - Opens discount dialog
         - User enters discount code and percentage
         - On apply: Sends discount email via `POST /emails/send-single`
         - Email includes discount code and percentage

6. **Pagination**
   - Shows: "Showing X to Y of Z customers"
   - Items per page selector: 10, 20, 50, 100
   - Page navigation:
     - Previous button (disabled on page 1)
     - Page numbers (shows up to 5 pages)
     - Next button (disabled on last page)
   - On page change: Refetches data with new offset

**User Experience:**
- Focus on high-risk customers
- Easy filtering by segment
- Quick bulk actions
- Individual customer management
- Efficient pagination for large datasets

---

## 4. Customer Profiles

**Entry Point:** Sidebar → "Customer Profiles" or URL: `/dashboard/customers`

**Flow Steps:**

1. **Page Load**
   - Validates `client_id` from localStorage
   - API Call: `GET /customers/customers/{client_id}?limit=10&offset=0`
   - Displays loading state

2. **Filters Section**
   - **Segment Filter:**
     - Options: All Segments, High-Value, Regular, Occasional, New
     - Default: "All Segments"
     - On change: Resets to page 1, refetches data
   - **Risk Level Filter:**
     - Options: All Risk Levels, High, Medium, Low
     - Default: "All Risk Levels"
     - On change: Resets to page 1, refetches data

3. **Summary Display**
   - Shows: "Showing X to Y of Z customers"
   - Updates based on filters and pagination

4. **Customer Cards (Paginated)**
   - For each customer:
     - **Left Section:**
       - Customer name, email, ID
       - Risk level badge (High/Medium/Low with color coding)
       - Segment badge (High-Value/Regular/Occasional/New with color coding)
       - **Metrics Grid (4 metrics):**
         - Churn Probability (percentage)
         - Total Spend ($XK)
         - Orders (count)
         - Last Purchase (X days ago)
       - **Top Risk Factors:**
         - Shows risk factors as tags
     - **Right Section:**
       - **Recommended Actions:**
         - Lists recommendations as bullet points
       - **"Take Action" button:**
         - Navigates to customer detail or opens action menu
         - Button style changes based on risk level

5. **Pagination**
   - Same as Event Explorer
   - Items per page: 10, 20, 50, 100
   - Page navigation controls

**User Experience:**
- Complete customer database view
- Easy filtering and search
- Detailed customer insights
- Actionable recommendations

---

## 5. Churn Prediction

**Entry Point:** Sidebar → "Churn Prediction" or URL: `/dashboard/churn`

**Flow Steps:**

1. **Page Load**
   - Validates `client_id` from localStorage
   - API Call: `GET /churn/{client_id}?limit=1000`
   - Displays churn prediction data

2. **Churn Prediction Content**
   - Shows detailed churn analysis
   - Model performance metrics
   - Prediction accuracy
   - Customer risk classifications

**Note:** This page's specific implementation details would depend on the exact requirements, but it follows the same authentication and data fetching patterns.

---

## 6. Bulk Upload

**Entry Point:** Sidebar → "Bulk Upload" or URL: `/dashboard/bulk-upload`

**Flow Steps:**

1. **Page Load**
   - Two upload sections side by side

2. **Products CSV Upload**
   - **File Input:**
     - Accepts `.csv` files
     - User clicks to select file
   - **File Selection:**
     - Shows selected file name
     - Status icon (Upload/Check/Error)
   - **Upload Button:**
     - User clicks "Upload Files"
     - **Validation:**
       - If no file selected → Shows error: "File is required" with red border
       - Form does NOT submit
     - **If file selected:**
       - Parses CSV file (flexible column mapping)
       - Maps columns to: product_id, name, description, category, price, currency
       - Validates required fields (product_id, name)
       - API Call: `POST /products/bulk`
       - Request Body: Array of product objects
       - **Success:**
         - Shows: "✓ X products inserted"
         - Green checkmark icon
       - **Error:**
         - Shows error message
         - Red error icon

3. **Users CSV Upload**
   - **File Input:**
     - Accepts `.csv` files
     - User clicks to select file
   - **File Selection:**
     - Shows selected file name
     - Status icon (Upload/Check/Error)
   - **Upload Button:**
     - User clicks "Upload Files"
     - **Validation:**
       - If no file selected → Shows error: "File is required" with red border
       - Form does NOT submit
     - **If file selected:**
       - Parses CSV file (flexible column mapping)
       - Maps columns to: user_id, email, name
       - Validates required fields (user_id)
       - API Call: `POST /users/bulk`
       - Request Body: Array of user objects
       - **Success:**
         - Shows: "✓ X users inserted"
         - Green checkmark icon
       - **Error:**
         - Shows error message
         - Red error icon

4. **Progress Bar**
   - Shows during upload process
   - Displays percentage (0-100%)
   - Updates as upload progresses

5. **Error/Success Messages**
   - Error card (red border) if upload fails
   - Success card (green border) if upload succeeds
   - Clear error messages

**User Experience:**
- Flexible CSV format support
- Automatic column detection
- Clear validation feedback
- Progress indication
- Success/error notifications

---

## 7. Reports

**Entry Point:** Sidebar → "Reports" or URL: `/dashboard/reports`

**Flow Steps:**

1. **Page Load**
   - Defaults to current week
   - Shows date picker for week ending date
   - Default date: Today's date

2. **Generate Report**
   - User selects week ending date (optional, defaults to today)
   - User clicks "Generate Report" button
   - **API Call:** `GET /reports/generate?client_id={id}&week_ending={date}`
   - **Backend Process:**
     - Queries events table for the selected week
     - Performs feature engineering
     - Runs ML predictions
     - Aggregates metrics
     - Generates insights and segments
     - Calls Gemini AI for executive summary
     - Returns complete report data
   - **Loading State:**
     - Shows "Generating report..." message
   - **On Success:**
     - Displays full report

3. **Report Display**
   - **Report Header:**
     - Title: "Weekly Retention & Churn Risk Report"
     - Week ending date
     - "Back to Reports" button
     - "Download PDF" button
   
   - **Executive Summary:**
     - AI-generated summary (2-3 paragraphs)
     - Key metrics cards:
       - Total Customers
       - At High Risk (with trend indicator)
       - Churned This Week (with trend indicator)
       - Retention Rate (with trend indicator)
   
   - **Key Insights This Week:**
     - Bulleted list of insights
     - Generated from analysis
   
   - **Top Risk Factors:**
     - List of risk factors with impact level (High/Medium/Low)
     - Color-coded by impact
   
   - **Customer Segment Analysis:**
     - Grid of segment cards
     - Each shows:
       - Segment name
       - Customer count
       - Risk level percentage
       - Trend indicator (up/down)
   
   - **Recommended Actions:**
     - List of recommendations
     - Each shows:
       - Action description
       - Priority level (High/Medium/Low)
       - Expected impact
     - Color-coded by priority

4. **Download PDF**
   - User clicks "Download PDF" button
   - **API Call:** `GET /reports/generate/pdf?client_id={id}&week_ending={date}`
   - Backend generates PDF using reportlab
   - Downloads PDF file to user's device
   - Filename: `weekly-report-{client_id}-{date}.pdf`

**User Experience:**
- On-demand report generation
- Real-time data analysis
- AI-powered insights
- Professional PDF export
- Comprehensive week-over-week comparison

---

## 8. Settings

**Entry Point:** Sidebar → "Settings" or URL: `/dashboard/settings`

**Flow Steps:**

1. **Page Load**
   - Fetches current client profile
   - API Call: `GET /clients/profile/me`
   - Pre-fills form with current data

2. **Profile Form**
   - **First Name** field
     - Pre-filled with current first name
   - **Last Name** field
     - Pre-filled with current last name
   - **Email** field
     - Pre-filled with current email
   - **Password Fields (Optional):**
     - Current Password (optional)
     - New Password (optional)
     - Confirm New Password (optional)
     - Note: Password change is optional

3. **Form Submission**
   - User clicks "Save Profile" button
   - **Validation:**
     - Checks if any non-password fields changed
     - If no changes → Does NOT save (no API call)
     - If password fields empty → No password update
     - If password fields filled → Validates new password matches confirm
   - **If changes detected:**
     - API Call: `PUT /clients/profile/me`
     - Request Body:
       ```json
       {
         "first_name": "John",
         "last_name": "Doe",
         "email": "newemail@company.com",
         "current_password": "oldpass",  // Only if changing password
         "new_password": "newpass"      // Only if changing password
       }
       ```
     - **Success:**
       - Shows success message
       - Updates displayed profile
     - **Error:**
       - Shows error message
       - Form remains editable

**User Experience:**
- Simple profile management
- Optional password change
- Only saves if changes made
- Clear validation feedback

---

## 9. Email & Discount Features

### 9.1 Personalized Email Flow

**Entry Point:** Event Explorer → Customer Card → "Send Personalized Email" button

**Flow Steps:**

1. **Open Email Dialog**
   - User clicks "Send Personalized Email" on a customer card
   - Dialog opens with:
     - Title: "Send Personalized Email"
     - Customer info: Name and email displayed
     - **Subject field:**
       - Pre-filled: "We Miss You, {Customer Name}!"
       - User can edit
     - **Message field:**
       - Pre-filled with personalized content
       - User can edit
       - Multi-line text area

2. **Edit Email Content**
   - User modifies subject and/or message as needed
   - Content is plain text (backend converts to HTML)

3. **Send Email**
   - User clicks "Send Email" button
   - **API Call:** `POST /emails/send-single`
   - Request Body:
     ```json
     {
       "to_email": "customer@example.com",
       "to_name": "John Doe",
       "subject": "We Miss You, John Doe!",
       "html_content": "Hi John Doe,\n\nWe noticed..."
     }
     ```
   - **Backend Process:**
     - Converts plain text to HTML
     - Adds plain text version
     - Adds anti-spam headers
     - Sends via Brevo API
   - **Success:**
     - Shows alert: "Personalized email sent successfully to {Customer Name}!"
     - Dialog closes
     - Form resets
   - **Error:**
     - Shows error message
     - Dialog stays open

---

### 9.2 Bulk Email Flow

**Entry Point:** Event Explorer → Bulk Actions → Segment → "Send Email" button

**Flow Steps:**

1. **Open Bulk Email Dialog**
   - User clicks "Send Email" for a segment
   - Dialog opens with:
     - Title: "Send Bulk Email to Segment"
     - Segment info: "{Segment} customers (X customers)"
     - **Subject field:**
       - Pre-filled: "Special Offer for {Segment} Customers"
       - User can edit
     - **Message field:**
       - Pre-filled with segment-specific content
       - User can edit

2. **Edit Email Content**
   - User modifies subject and/or message
   - Content applies to all customers in segment

3. **Send Bulk Email**
   - User clicks "Send to All" button
   - **System Process:**
     - Fetches ALL customers in selected segment (not just current page)
     - API Call: `GET /customers/customers/{client_id}?limit=1000&segment={segment}&risk=High`
     - Creates recipients list
   - **API Call:** `POST /emails/send-bulk`
   - Request Body:
     ```json
     {
       "recipients": [
         {"email": "customer1@example.com", "name": "John Doe"},
         {"email": "customer2@example.com", "name": "Jane Smith"}
       ],
       "subject": "Special Offer for High-Value Customers",
       "html_content": "Dear Valued Customer..."
     }
     ```
   - **Backend Process:**
     - Converts plain text to HTML
     - Adds plain text version
     - Adds anti-spam headers
     - Sends to all recipients via Brevo API
   - **Success:**
     - Shows alert: "Bulk email sent successfully to X customers in {Segment} segment!"
     - Dialog closes
   - **Error:**
     - Shows error message
     - Dialog stays open

---

### 9.3 Personalized Discount Flow

**Entry Point:** Event Explorer → Customer Card → "Apply Discount" button

**Flow Steps:**

1. **Open Discount Dialog**
   - User clicks "Apply Discount" on a customer card
   - Dialog opens with:
     - Title: "Apply Discount"
     - Customer info: "Apply discount to {Customer Name}"
     - **Discount Code field:**
       - User enters discount code (e.g., "SAVE20")
     - **Discount Percentage field:**
       - User enters percentage (e.g., "20")
       - Number input, min 1, max 100

2. **Apply Discount**
   - User clicks "Apply Discount" button
   - **Validation:**
     - Checks if both code and percentage are filled
     - If empty → Shows error
   - **If valid:**
     - Creates discount email content
     - Subject: "Exclusive {X}% Off - Use Code {CODE}"
     - Message: Includes discount code and percentage
     - **API Call:** `POST /emails/send-single`
     - Sends discount email to customer
   - **Success:**
     - Shows alert: "Discount code {CODE} ({X}% off) sent via email to {Customer Name}!"
     - Dialog closes
   - **Error:**
     - Shows error message
     - Dialog stays open

---

### 9.4 Bulk Discount Flow

**Entry Point:** Event Explorer → Bulk Actions → Segment → "Apply Discount" button

**Flow Steps:**

1. **Open Discount Dialog**
   - User clicks "Apply Discount" for a segment
   - Dialog opens with:
     - Title: "Apply Discount"
     - Segment info: "Apply discount to all {Segment} customers"
     - **Discount Code field:**
       - User enters discount code
     - **Discount Percentage field:**
       - User enters percentage

2. **Apply Bulk Discount**
   - User clicks "Apply Discount" button
   - **Validation:**
     - Checks if both code and percentage are filled
   - **If valid:**
     - Fetches ALL customers in selected segment
     - Creates discount email content
     - Subject: "Exclusive {X}% Off for {Segment} Customers - Use Code {CODE}"
     - Message: Includes discount code and percentage
     - **API Call:** `POST /emails/send-bulk`
     - Sends discount email to all customers in segment
   - **Success:**
     - Shows alert: "Discount code {CODE} ({X}% off) sent via email to X customers in {Segment} segment!"
     - Dialog closes
   - **Error:**
     - Shows error message
     - Dialog stays open

---

## 10. Complete User Journey Examples

### Example 1: New User Onboarding

1. **Landing Page** → User clicks "Sign Up"
2. **Sign Up Page** → Fills form → Creates account
3. **Onboarding** → Completes onboarding flow
4. **Dashboard** → Views overview of business
5. **Bulk Upload** → Uploads products and users CSV files
6. **Dashboard** → Sees updated metrics
7. **Event Explorer** → Reviews high-risk customers
8. **Reports** → Generates first weekly report

### Example 2: Daily Operations

1. **Login** → Enters credentials → Redirects to Dashboard
2. **Dashboard** → Reviews key metrics
3. **Event Explorer** → Filters by "High-Value" segment
4. **Bulk Actions** → Sends retention email to High-Value segment
5. **Individual Customer** → Sends personalized email to specific customer
6. **Apply Discount** → Sends 20% discount code to high-risk customer
7. **Reports** → Generates weekly report for current week
8. **Download PDF** → Downloads report for sharing

### Example 3: Customer Retention Campaign

1. **Event Explorer** → Views high-risk customers
2. **Filter by Segment** → Selects "Regular" segment
3. **Bulk Email** → Sends win-back email to all Regular customers
4. **Individual Actions** → For very high-risk customers:
   - Sends personalized email
   - Applies special discount code
5. **Reports** → Generates report to track campaign effectiveness
6. **Customer Profiles** → Reviews updated customer data

---

## 11. Error Handling & Edge Cases

### Authentication Errors
- **Invalid API Key:** Redirects to login
- **Session Expired:** Shows error, prompts re-login
- **Missing Client ID:** Shows error message

### Data Loading Errors
- **Network Error:** Shows error message, allows retry
- **Empty Results:** Shows "No data found" message
- **Invalid Filters:** Shows appropriate error message

### Email Errors
- **Brevo API Error:** Shows error message with details
- **Invalid Email:** Validation error before sending
- **No Recipients:** Shows "No customers found" message

### Validation Errors
- **Form Validation:** Red borders + error messages
- **API Validation:** Shows backend error messages
- **File Upload Errors:** Shows specific error (missing fields, invalid format)

---

## 12. Navigation Flow Diagram

```
Landing Page
    ├── Sign Up → Registration → Onboarding → Dashboard
    └── Login → Dashboard
                │
                ├── Event Explorer
                │   ├── Filter by Segment/Risk
                │   ├── Bulk Actions (Email/Discount by Segment)
                │   ├── Individual Actions (Email/Discount per Customer)
                │   └── Pagination
                │
                ├── Customer Profiles
                │   ├── Filter by Segment/Risk
                │   ├── View Customer Details
                │   └── Pagination
                │
                ├── Churn Prediction
                │   └── View Churn Analysis
                │
                ├── Bulk Upload
                │   ├── Upload Products CSV
                │   └── Upload Users CSV
                │
                ├── Reports
                │   ├── Select Week Ending Date
                │   ├── Generate Report
                │   └── Download PDF
                │
                └── Settings
                    ├── Update Profile
                    └── Change Password (Optional)
```

---

## 13. API Endpoints Summary

### Authentication
- `POST /clients/` - Register new client
- `POST /clients/login` - Login client

### Customer Data
- `GET /customers/customers/{client_id}` - Get customer profiles (with filters)
- `GET /high-risk/high-risk/{client_id}` - Get high-risk customers

### Analytics
- `GET /analysis/{client_id}` - Get dashboard analytics
- `GET /churn/{client_id}` - Get churn prediction data

### Products & Users
- `POST /products/bulk` - Bulk upload products
- `POST /users/bulk` - Bulk upload users
- `POST /events/bulk` - Bulk upload events

### Reports
- `GET /reports/generate` - Generate on-demand report
- `GET /reports/generate/pdf` - Download report PDF

### Email
- `POST /emails/send-single` - Send personalized email
- `POST /emails/send-bulk` - Send bulk emails

### Profile
- `GET /clients/profile/me` - Get client profile
- `PUT /clients/profile/me` - Update client profile

---

## 14. Key Features Summary

### Data Management
- ✅ Flexible CSV upload (auto-detects columns)
- ✅ Bulk operations (products, users, events)
- ✅ Real-time data updates

### Customer Analysis
- ✅ Segmentation (High-Value, Regular, Occasional, New)
- ✅ Risk classification (High, Medium, Low)
- ✅ Churn probability prediction
- ✅ Risk factor identification

### Communication
- ✅ Personalized emails
- ✅ Bulk emails by segment
- ✅ Discount code distribution
- ✅ Anti-spam email formatting

### Reporting
- ✅ On-demand report generation
- ✅ AI-powered executive summaries
- ✅ PDF export
- ✅ Week-over-week comparison

### User Experience
- ✅ Form validation with visual feedback
- ✅ Pagination for large datasets
- ✅ Loading states
- ✅ Error handling
- ✅ Success notifications

---

## 15. Technical Stack

### Frontend
- React.js with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- shadcn/ui components
- Local Storage for session management

### Backend
- FastAPI (Python)
- SQLAlchemy (Async ORM)
- PostgreSQL database
- ML Model (XGBoost)
- Brevo API (Email service)
- Gemini API (AI summaries)

---

This document provides a complete overview of all user flows in the Churn Prediction Tool application.


