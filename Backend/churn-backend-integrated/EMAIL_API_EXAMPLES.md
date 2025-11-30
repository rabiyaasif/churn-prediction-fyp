# Email API Examples

## Endpoints

### 1. Send Single Email
**Endpoint:** `POST /emails/send-single`  
**Authentication:** Required (X-API-Key header)

### 2. Send Bulk Email
**Endpoint:** `POST /emails/send-bulk`  
**Authentication:** Required (X-API-Key header)

---

## Example Payloads

### Single Email Example

```json
{
  "to_email": "customer@example.com",
  "to_name": "John Doe",
  "subject": "We Miss You! Special Offer Inside",
  "html_content": "Hi John Doe,\n\nWe noticed you haven't shopped with us recently. We'd love to have you back!\n\nAs a valued customer, we're offering you a special 20% discount code: SAVE20\n\nUse this code at checkout to save on your next purchase.\n\nBest regards,\nYour Team"
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/emails/send-single" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "to_email": "customer@example.com",
    "to_name": "John Doe",
    "subject": "We Miss You! Special Offer Inside",
    "html_content": "Hi John Doe,\n\nWe noticed you haven'\''t shopped with us recently. We'\''d love to have you back!\n\nAs a valued customer, we'\''re offering you a special 20% discount code: SAVE20\n\nUse this code at checkout to save on your next purchase.\n\nBest regards,\nYour Team"
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('http://localhost:8000/emails/send-single', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key_here'
  },
  body: JSON.stringify({
    to_email: 'customer@example.com',
    to_name: 'John Doe',
    subject: 'We Miss You! Special Offer Inside',
    html_content: 'Hi John Doe,\n\nWe noticed you haven\'t shopped with us recently. We\'d love to have you back!\n\nAs a valued customer, we\'re offering you a special 20% discount code: SAVE20\n\nUse this code at checkout to save on your next purchase.\n\nBest regards,\nYour Team'
  })
});

const result = await response.json();
console.log(result);
```

---

### Bulk Email Example

```json
{
  "recipients": [
    {
      "email": "customer1@example.com",
      "name": "John Doe"
    },
    {
      "email": "customer2@example.com",
      "name": "Jane Smith"
    },
    {
      "email": "customer3@example.com",
      "name": "Bob Johnson"
    }
  ],
  "subject": "Special Offer for High-Value Customers",
  "html_content": "Dear Valued Customer,\n\nWe have an exclusive offer just for you! As a High-Value customer, we're offering you a special 25% discount.\n\nUse code: VIP25 at checkout.\n\nDon't miss out on this opportunity!\n\nBest regards,\nYour Team"
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/emails/send-bulk" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "recipients": [
      {
        "email": "customer1@example.com",
        "name": "John Doe"
      },
      {
        "email": "customer2@example.com",
        "name": "Jane Smith"
      },
      {
        "email": "customer3@example.com",
        "name": "Bob Johnson"
      }
    ],
    "subject": "Special Offer for High-Value Customers",
    "html_content": "Dear Valued Customer,\n\nWe have an exclusive offer just for you! As a High-Value customer, we'\''re offering you a special 25% discount.\n\nUse code: VIP25 at checkout.\n\nDon'\''t miss out on this opportunity!\n\nBest regards,\nYour Team"
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('http://localhost:8000/emails/send-bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key_here'
  },
  body: JSON.stringify({
    recipients: [
      {
        email: 'customer1@example.com',
        name: 'John Doe'
      },
      {
        email: 'customer2@example.com',
        name: 'Jane Smith'
      },
      {
        email: 'customer3@example.com',
        name: 'Bob Johnson'
      }
    ],
    subject: 'Special Offer for High-Value Customers',
    html_content: 'Dear Valued Customer,\n\nWe have an exclusive offer just for you! As a High-Value customer, we\'re offering you a special 25% discount.\n\nUse code: VIP25 at checkout.\n\nDon\'t miss out on this opportunity!\n\nBest regards,\nYour Team'
  })
});

const result = await response.json();
console.log(result);
```

---

## Response Examples

### Success Response (Single Email)
```json
{
  "success": true,
  "message": "Email sent successfully to customer@example.com",
  "message_id": "1234567890"
}
```

### Success Response (Bulk Email)
```json
{
  "success": true,
  "message": "Bulk email sent successfully to 3 recipients",
  "sent_count": 3,
  "message_id": "1234567890"
}
```

### Error Response
```json
{
  "detail": "Failed to send email: Invalid recipient email address"
}
```

---

## Notes

1. **Plain Text Content**: The `html_content` field accepts both plain text and HTML. If plain text is provided, it will be automatically converted to HTML format.

2. **Plain Text Version**: The backend automatically generates a plain text version from the HTML content to reduce spam score.

3. **Email Headers**: The backend automatically adds proper email headers including:
   - `List-Unsubscribe` header
   - `X-Mailer` header
   - Proper content-type headers

4. **Subject Line**: Avoid all-caps subjects and excessive punctuation to reduce spam score.

5. **Recipients**: For bulk emails, each recipient must have at least an `email` field. The `name` field is optional.

6. **Authentication**: All endpoints require the `X-API-Key` header with a valid API key.

