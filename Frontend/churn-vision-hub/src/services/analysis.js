// src/services/analysis.js

const BASE_URL = "http://localhost:8000";

/**
 * Fetch analytics data for the dashboard for a given client.
 *
 * @param {number} clientId - The client_id from your backend (clients table).
 * @returns {Promise<{
 *   summary: any;
 *   segments: any[];
 *   risk_distribution: any[];
 *   feature_importance: any[];
 *   churn_trend: any[];
 *   high_risk_customers: any[];
 * }>}
 */
export async function getDashboardAnalytics(clientId) {
  const res = await fetch(`${BASE_URL}/analysis/dashboard/${clientId}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to fetch dashboard analytics: ${res.status} ${errorText}`);
  }

  const json = await res.json();

  // Your backend (stamp_meta) returns:
  // {
  //   data: { summary, segments, risk_distribution, feature_importance, churn_trend, high_risk_customers },
  //   model_version: "1.0.0",
  //   generated_at: "..."
  // }
  return json.data;
}

const API_BASE_URL = "http://localhost:8000";
/**
 * Fetch Churn Prediction dashboard data for a given client.
 *
 * Calls: GET /churn/churn-page/{client_id}
 *
 * Returns the `data` object from your FastAPI stamp_meta response, i.e.:
 * {
 *   summary,
 *   segments,
 *   risk_distribution,
 *   feature_importance,
 *   churn_trend,
 *   high_risk_customers,
 *   modelPerformance,
 *   segmentPerformance,
 *   featureCategories,
 *   featureImportanceData,
 *   churnTrendData,
 *   activityLog
 * }
 */
export async function fetchChurnAnalysis(clientId) {
  const url = `${API_BASE_URL}/churn/churn-page/${clientId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    // You can customize this error handling as needed
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch churn analysis (${res.status}): ${text || res.statusText}`
    );
  }

  const json = await res.json();

  // Your FastAPI stamp_meta returns:
  // { data: {...}, model_version: "...", generated_at: "..." }
  // For the frontend we only care about `data`
  return json.data;
}

// src/services/analysis.js


export async function getCustomerProfiles(clientId, limit = 500, offset = 0, search = null, segment = null, risk = null) {
  // 👇 match your backend path: /customers/customers/{client_id}
  const url = new URL(`${BASE_URL}/customers/customers/${clientId}`);

  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  
  if (search) {
    url.searchParams.set("search", search);
  }
  if (segment) {
    url.searchParams.set("segment", segment);
  }
  if (risk) {
    url.searchParams.set("risk", risk);
  }

  const apiKey = localStorage.getItem("api_key");
  const headers = {
    Accept: "application/json",
  };
  
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: headers,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(
      `Failed to fetch customer profiles: ${res.status} ${errorText}`
    );
  }

  const json = await res.json();
  // { data: { customers: [...], count: n }, ... }
  return json.data;
}

/**
 * Send a single personalized email to a customer
 * @param {string} toEmail - Recipient email
 * @param {string} toName - Recipient name
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendSingleEmail(toEmail, toName, subject, htmlContent) {
  const apiKey = localStorage.getItem("api_key");
  if (!apiKey) {
    throw new Error("API key not found. Please log in again.");
  }

  const res = await fetch(`${BASE_URL}/emails/send-single`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      to_email: toEmail,
      to_name: toName,
      subject: subject,
      html_content: htmlContent,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to send email: ${res.status} ${errorText}`);
  }

  return await res.json();
}

/**
 * Send bulk emails to multiple customers
 * @param {Array<{email: string, name: string}>} recipients - Array of recipient objects
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 * @returns {Promise<{success: boolean, message: string, sent_count: number}>}
 */
export async function sendBulkEmails(recipients, subject, htmlContent) {
  const apiKey = localStorage.getItem("api_key");
  if (!apiKey) {
    throw new Error("API key not found. Please log in again.");
  }

  const res = await fetch(`${BASE_URL}/emails/send-bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      html_content: htmlContent,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to send bulk email: ${res.status} ${errorText}`);
  }

  return await res.json();
}

/**
 * Fetch high-risk customers + summary stats for a given client.
 *
 * @param {number|string} clientId
 * @param {object} [options]
 * @param {number} [options.limit=500]
 * @returns {Promise<{
 *   highRiskCount: number;
 *   revenueAtRisk: number;
 *   avgChurnProbability: number;
 *   customers: Array<{
 *     id: string;
 *     name: string;
 *     email: string;
 *     segment: string;
 *     daysSinceLastPurchase: number;
 *     churnProbability: number;
 *     totalSpend: number;
 *     topRiskFactors: string[];
 *     recommendations: string[];
 *   }>;
 * }>}
 */
export async function fetchHighRiskCustomers(clientId, options = {}) {
  const { limit = 500, offset = 0, segment = null, risk = null } = options;

  // Validate clientId
  if (!clientId) {
    throw new Error("Client ID is required");
  }

  // ✅ Hit FastAPI directly using the same BASE_URL as other services
  // client_id is in the URL path: /high-risk/{client_id}
  const url = new URL(`${BASE_URL}/high-risk/${clientId}`);
  
  // limit is required as a query parameter
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  
  if (segment && segment !== "all") {
    url.searchParams.set("segment", segment);
  }
  if (risk && risk !== "all") {
    url.searchParams.set("risk", risk);
  }
  
  console.log(`Fetching high-risk customers: ${url.toString()}`);

  const apiKey = localStorage.getItem("api_key");
  const headers = {
    Accept: "application/json",
  };
  
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch high-risk customers (${res.status}): ${
        text || res.statusText
      }`
    );
  }

  const data = await res.json();

  // Backend response format:
  // {
  //   "total_customers": ...,
  //   "high_risk_count": ...,
  //   "revenue_at_risk": ...,
  //   "avg_churn_probability": ...,
  //   "customers": [ ... ]
  // }
  return {
    totalCustomers: data.total_customers ?? 0,
    highRiskCount: data.high_risk_count ?? 0,
    revenueAtRisk: data.revenue_at_risk ?? 0,
    avgChurnProbability: data.avg_churn_probability ?? 0,
    customers: Array.isArray(data.customers) ? data.customers : [],
  };
}

/**
 * Bulk upload products
 * 
 * @param {Array} products - Array of product objects
 * @returns {Promise<{inserted: number}>}
 */
export async function bulkUploadProducts(products) {
  const apiKey = localStorage.getItem("api_key");
  
  if (!apiKey) {
    throw new Error("API key not found. Please log in.");
  }

  const res = await fetch(`${BASE_URL}/products/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(products),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to upload products (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Bulk upload users
 * 
 * @param {Array} users - Array of user objects
 * @returns {Promise<{inserted: number}>}
 */
export async function bulkUploadUsers(users) {
  const apiKey = localStorage.getItem("api_key");
  
  if (!apiKey) {
    throw new Error("API key not found. Please log in.");
  }

  const res = await fetch(`${BASE_URL}/users/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(users),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to upload users (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Get current client profile
 * 
 * @returns {Promise<{client_id: number, name: string, email: string, domain: string, url: string, api_key: string, created_at: string}>}
 */
export async function getClientProfile() {
  const apiKey = localStorage.getItem("api_key");
  
  if (!apiKey) {
    throw new Error("API key not found. Please log in.");
  }

  const res = await fetch(`${BASE_URL}/clients/profile/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to get profile (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Update client profile
 * 
 * @param {Object} profileData - Profile update data
 * @param {string} [profileData.first_name] - First name
 * @param {string} [profileData.last_name] - Last name
 * @param {string} [profileData.email] - Email
 * @param {string} [profileData.current_password] - Current password (required if changing password)
 * @param {string} [profileData.new_password] - New password (required if changing password)
 * @returns {Promise<{client_id: number, name: string, email: string, ...}>}
 */
export async function updateClientProfile(profileData) {
  const apiKey = localStorage.getItem("api_key");
  
  if (!apiKey) {
    throw new Error("API key not found. Please log in.");
  }

  const res = await fetch(`${BASE_URL}/clients/profile/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Failed to update profile (${res.status})`);
  }

  return await res.json();
}

/**
 * Generate a weekly report on-demand
 * @param {number} clientId - Client ID
 * @param {string} weekEnding - Week ending date (YYYY-MM-DD)
 * @returns {Promise<object>} Report data
 */
export async function generateWeeklyReport(clientId, weekEnding) {
  const apiKey = localStorage.getItem("api_key");
  if (!apiKey) throw new Error("API Key not found. Please log in.");

  const res = await fetch(
    `${BASE_URL}/reports/generate?client_id=${clientId}&week_ending=${weekEnding}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-API-Key": apiKey,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to generate report: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return data.report_data; // Return just the report_data part
}

/**
 * Download a weekly report as PDF
 * @param {number} clientId - Client ID
 * @param {string} weekEnding - Week ending date (YYYY-MM-DD)
 */
export async function downloadReportPDF(clientId, weekEnding) {
  const apiKey = localStorage.getItem("api_key");
  if (!apiKey) throw new Error("API Key not found. Please log in.");

  const res = await fetch(
    `${BASE_URL}/reports/generate/pdf?client_id=${clientId}&week_ending=${weekEnding}`,
    {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to download report PDF: ${res.status} ${errorText}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weekly-report-${clientId}-${weekEnding}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

