# Gateway API Documentation

This document provides comprehensive documentation for all API endpoints available in the Easy Autom Pro gateway.

## Base URL

```
http://localhost:3000/api
```

## Authentication

API requests may require authentication tokens depending on your deployment configuration. Include authentication tokens in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

---

## Endpoints

### 1. Send Message

Sends a text message through the gateway to a specified recipient.

**Endpoint:** `POST /send-message`

**Description:** Sends a text message to a recipient via the configured messaging service.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if required)
```

**Request Body:**
```json
{
  "recipient": "string",
  "message": "string",
  "priority": "normal|high|low",
  "timeout": 30000
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recipient` | string | Yes | The recipient's phone number or identifier |
| `message` | string | Yes | The message content to send |
| `priority` | string | No | Message priority level. Default: `normal` |
| `timeout` | number | No | Request timeout in milliseconds. Default: `30000` |

**Response (Success - 200):**
```json
{
  "success": true,
  "messageId": "msg_123456789",
  "recipient": "recipient-identifier",
  "status": "sent",
  "timestamp": "2025-12-10T04:11:42Z"
}
```

**Response (Error - 400/401/500):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "recipient": "+1234567890",
    "message": "Hello, this is a test message!",
    "priority": "normal"
  }'
```

**Status Codes:**
- `200 OK` - Message sent successfully
- `400 Bad Request` - Invalid parameters or missing required fields
- `401 Unauthorized` - Authentication failed or missing credentials
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 2. Send Audio

Sends an audio message or plays audio content through the gateway.

**Endpoint:** `POST /send-audio`

**Description:** Sends or streams audio content to a recipient. Supports various audio formats and can be used for voice messages or audio playback.

**Request Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token> (if required)
```

**Request Body (Form Data):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recipient` | string | Yes | The recipient's phone number or identifier |
| `audio` | file | Yes | Audio file to send (mp3, wav, ogg, m4a) |
| `duration` | number | No | Duration in seconds |
| `priority` | string | No | Message priority level. Default: `normal` |

**Response (Success - 200):**
```json
{
  "success": true,
  "messageId": "audio_123456789",
  "recipient": "recipient-identifier",
  "status": "sent",
  "duration": 15,
  "format": "mp3",
  "timestamp": "2025-12-10T04:11:42Z"
}
```

**Response (Error - 400/401/500):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/send-audio \
  -H "Authorization: Bearer your-token" \
  -F "recipient=+1234567890" \
  -F "audio=@path/to/audio.mp3" \
  -F "priority=high"
```

**Supported Audio Formats:**
- `mp3` - MPEG Audio
- `wav` - Waveform Audio
- `ogg` - Ogg Vorbis
- `m4a` - MPEG-4 Audio

**Status Codes:**
- `200 OK` - Audio message sent successfully
- `400 Bad Request` - Invalid parameters or unsupported format
- `401 Unauthorized` - Authentication failed or missing credentials
- `413 Payload Too Large` - Audio file exceeds size limit
- `415 Unsupported Media Type` - Unsupported audio format
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 3. Status

Retrieves the status of a previously sent message or the overall gateway health.

**Endpoint:** `GET /status` or `GET /status/:messageId`

**Description:** Retrieves delivery status for a specific message or checks the overall gateway health status.

#### 3.1 Gateway Health Status

**Endpoint:** `GET /status`

**Request Headers:**
```
Authorization: Bearer <token> (if required)
```

**Response (Success - 200):**
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 86400,
  "timestamp": "2025-12-10T04:11:42Z",
  "services": {
    "messaging": "operational",
    "audio": "operational",
    "database": "operational",
    "webhook": "operational"
  },
  "version": "1.0.0",
  "activeConnections": 42
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/status \
  -H "Authorization: Bearer your-token"
```

#### 3.2 Message Status

**Endpoint:** `GET /status/:messageId`

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageId` | string | Yes | The message ID to check (from send-message or send-audio response) |

**Response (Success - 200):**
```json
{
  "success": true,
  "messageId": "msg_123456789",
  "recipient": "recipient-identifier",
  "status": "delivered|sent|pending|failed",
  "deliveryTime": "2025-12-10T04:12:00Z",
  "attempts": 1,
  "lastUpdate": "2025-12-10T04:11:50Z",
  "errorDetails": null
}
```

**Response (Error - 404/500):**
```json
{
  "success": false,
  "error": "Message not found or has expired",
  "code": "MESSAGE_NOT_FOUND"
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/status/msg_123456789 \
  -H "Authorization: Bearer your-token"
```

**Status Values:**
- `pending` - Message queued for delivery
- `sent` - Message sent to carrier/service
- `delivered` - Message delivered to recipient
- `failed` - Message delivery failed

**Status Codes:**
- `200 OK` - Status retrieved successfully
- `400 Bad Request` - Invalid message ID format
- `401 Unauthorized` - Authentication failed
- `404 Not Found` - Message not found
- `500 Internal Server Error` - Server error

---

### 4. Webhook Endpoints

Webhooks allow the gateway to notify your application about message status changes and events.

#### 4.1 Configure Webhook

**Endpoint:** `POST /webhook/configure`

**Description:** Registers a webhook URL to receive status updates and events.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (if required)
```

**Request Body:**
```json
{
  "url": "string",
  "events": ["message.sent", "message.delivered", "message.failed"],
  "active": true,
  "retryAttempts": 3,
  "retryDelay": 5000
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | HTTPS webhook URL to receive events |
| `events` | array | Yes | List of events to subscribe to |
| `active` | boolean | No | Enable/disable webhook. Default: `true` |
| `retryAttempts` | number | No | Number of retry attempts on failure. Default: `3` |
| `retryDelay` | number | No | Delay between retries in milliseconds. Default: `5000` |

**Response (Success - 201):**
```json
{
  "success": true,
  "webhookId": "webhook_123456789",
  "url": "https://your-domain.com/webhook",
  "events": ["message.sent", "message.delivered", "message.failed"],
  "active": true,
  "createdAt": "2025-12-10T04:11:42Z",
  "lastUsed": null
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/webhook/configure \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "url": "https://your-domain.com/webhook",
    "events": ["message.sent", "message.delivered", "message.failed"],
    "active": true,
    "retryAttempts": 3
  }'
```

**Status Codes:**
- `201 Created` - Webhook configured successfully
- `400 Bad Request` - Invalid URL or parameters
- `401 Unauthorized` - Authentication failed
- `409 Conflict` - Webhook already exists for this URL
- `500 Internal Server Error` - Server error

---

#### 4.2 List Webhooks

**Endpoint:** `GET /webhook/list`

**Description:** Retrieves all configured webhooks.

**Request Headers:**
```
Authorization: Bearer <token> (if required)
```

**Response (Success - 200):**
```json
{
  "success": true,
  "webhooks": [
    {
      "webhookId": "webhook_123456789",
      "url": "https://your-domain.com/webhook",
      "events": ["message.sent", "message.delivered"],
      "active": true,
      "createdAt": "2025-12-10T04:11:42Z",
      "lastUsed": "2025-12-10T04:20:00Z"
    }
  ],
  "count": 1
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/webhook/list \
  -H "Authorization: Bearer your-token"
```

---

#### 4.3 Webhook Event Payload

When an event occurs, the gateway sends a POST request to your registered webhook URL with the following payload structure:

**Event Payload Structure:**
```json
{
  "webhookId": "webhook_123456789",
  "event": "message.delivered",
  "timestamp": "2025-12-10T04:11:42Z",
  "data": {
    "messageId": "msg_123456789",
    "recipient": "recipient-identifier",
    "status": "delivered",
    "type": "text|audio",
    "deliveryTime": "2025-12-10T04:11:50Z",
    "attempts": 1
  }
}
```

**Webhook Headers (Sent by Gateway):**
```
X-Webhook-Id: webhook_123456789
X-Webhook-Signature: sha256=<signature>
X-Webhook-Timestamp: 2025-12-10T04:11:42Z
```

**Supported Events:**
| Event | Description |
|-------|-------------|
| `message.sent` | Message has been sent to the service |
| `message.delivered` | Message has been delivered to recipient |
| `message.failed` | Message delivery failed |
| `audio.sent` | Audio message has been sent |
| `audio.delivered` | Audio message has been delivered |
| `audio.failed` | Audio delivery failed |
| `gateway.status.change` | Gateway status has changed |

**Webhook Response:**

Your webhook endpoint should respond with:
```json
{
  "success": true,
  "acknowledged": true
}
```

HTTP Status Code: `200 OK`

**Example Webhook Handler (Node.js):**
```javascript
app.post('/webhook', (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-webhook-signature'];
  
  // Verify signature
  const verified = verifySignature(payload, signature, YOUR_SECRET);
  
  if (!verified) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }
  
  console.log(`Event: ${payload.event}`);
  console.log(`Message ID: ${payload.data.messageId}`);
  console.log(`Status: ${payload.data.status}`);
  
  // Process the webhook event
  handleWebhookEvent(payload);
  
  // Acknowledge receipt
  res.status(200).json({ success: true, acknowledged: true });
});
```

---

#### 4.4 Delete Webhook

**Endpoint:** `DELETE /webhook/:webhookId`

**Description:** Removes a configured webhook.

**Request Headers:**
```
Authorization: Bearer <token> (if required)
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookId` | string | Yes | The webhook ID to delete |

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Webhook deleted successfully",
  "webhookId": "webhook_123456789"
}
```

**Example Request:**
```bash
curl -X DELETE http://localhost:3000/api/webhook/webhook_123456789 \
  -H "Authorization: Bearer your-token"
```

**Status Codes:**
- `200 OK` - Webhook deleted successfully
- `401 Unauthorized` - Authentication failed
- `404 Not Found` - Webhook not found
- `500 Internal Server Error` - Server error

---

## Error Handling

All endpoints return error responses in the following format:

**Error Response:**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:

**Rate Limits:**
- **Default**: 100 requests per minute per API key
- **Burst**: Up to 200 requests in a 60-second window
- **Message endpoints**: 1000 messages per hour per API key

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702190802
```

When rate limited, the API returns a `429 Too Many Requests` response.

---

## Best Practices

1. **Always use HTTPS** for webhook URLs
2. **Implement exponential backoff** for retry logic
3. **Verify webhook signatures** for security
4. **Monitor message status** regularly for important messages
5. **Use appropriate timeout values** based on your use case
6. **Implement circuit breaker patterns** for fault tolerance
7. **Cache status responses** when appropriate to reduce API calls
8. **Use batch operations** when sending multiple messages

---

## Changelog

### Version 1.0.0 (2025-12-10)
- Initial API release
- Send-message endpoint
- Send-audio endpoint
- Status endpoint (gateway and message-level)
- Webhook configuration and event delivery
- Rate limiting and error handling

---

## Support

For issues, questions, or feature requests, please contact our support team or open an issue in the project repository.
