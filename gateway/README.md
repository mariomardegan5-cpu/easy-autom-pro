# WhatsApp Gateway

A robust WhatsApp messaging gateway for the Easy Automation Pro platform, enabling seamless integration of WhatsApp messaging capabilities into your automation workflows.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

The WhatsApp Gateway provides a lightweight, easy-to-use interface for sending and receiving WhatsApp messages programmatically. It integrates seamlessly with the Easy Automation Pro platform and supports:

- Sending text messages
- Sending media (images, documents, videos, audio)
- Message scheduling
- Delivery status tracking
- Webhook support for incoming messages
- Rate limiting and throttling

## Prerequisites

Before setting up the WhatsApp Gateway, ensure you have:

- Node.js >= 14.0.0
- npm >= 6.0.0
- A WhatsApp Business Account
- Meta Business Account with WhatsApp API access
- API credentials (Phone Number ID, Business Account ID, Access Token)
- A webhook URL for receiving messages (HTTPS)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mariomardegan5-cpu/easy-autom-pro.git
cd easy-autom-pro/gateway
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install the Gateway

```bash
npm install easy-autom-pro-gateway
```

## Configuration

### Environment Variables

Create a `.env` file in the `gateway` directory with the following variables:

```env
# WhatsApp API Credentials
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token

# Webhook Configuration
WEBHOOK_URL=https://your-domain.com/webhook
WEBHOOK_VERIFY_TOKEN=your_verify_token

# Server Configuration
PORT=3000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_MESSAGES_PER_MINUTE=60
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
```

### Obtaining Credentials

1. **Access Meta Business Suite**: https://business.facebook.com
2. **Navigate to WhatsApp**: Go to Apps > WhatsApp > Configuration
3. **Phone Number ID**: Found in API Setup section
4. **Access Token**: Generate from System User
5. **Business Account ID**: Available in Account Settings

## Usage

### Basic Setup

```javascript
const WhatsAppGateway = require('easy-autom-pro-gateway');

const gateway = new WhatsAppGateway({
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
});

// Initialize the gateway
gateway.initialize();
```

### Sending a Text Message

```javascript
const message = await gateway.sendMessage({
  to: '1234567890',
  text: 'Hello from WhatsApp Gateway!'
});

console.log('Message sent:', message.id);
```

### Sending Media

```javascript
// Send an image
const image = await gateway.sendMedia({
  to: '1234567890',
  type: 'image',
  url: 'https://example.com/image.jpg',
  caption: 'Check out this image!'
});

// Send a document
const document = await gateway.sendMedia({
  to: '1234567890',
  type: 'document',
  url: 'https://example.com/document.pdf',
  filename: 'report.pdf'
});
```

### Scheduling Messages

```javascript
const scheduled = await gateway.scheduleMessage({
  to: '1234567890',
  text: 'This is a scheduled message',
  scheduledTime: new Date(Date.now() + 3600000) // 1 hour from now
});

console.log('Message scheduled:', scheduled.id);
```

### Webhook Setup

Configure your webhook endpoint to receive incoming messages:

```javascript
const express = require('express');
const app = express();

app.post('/webhook', express.json(), (req, res) => {
  const { entry } = req.body;
  
  entry.forEach(item => {
    const changes = item.changes[0].value;
    const messages = changes.messages;
    
    if (messages) {
      messages.forEach(msg => {
        console.log('Incoming message:', msg.body);
        // Handle the incoming message
      });
    }
  });
  
  res.sendStatus(200);
});

app.get('/webhook', (req, res) => {
  const verify_token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (verify_token === process.env.WEBHOOK_VERIFY_TOKEN) {
    res.send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.listen(process.env.PORT, () => {
  console.log('Webhook server running on port', process.env.PORT);
});
```

### Checking Message Status

```javascript
const status = await gateway.getMessageStatus(messageId);

console.log('Message status:', status);
// Output: { id: 'msg_123', status: 'delivered', timestamp: 1234567890 }
```

## API Reference

### Gateway Methods

#### `sendMessage(options)`

Send a text message.

**Parameters:**
- `to` (string): Recipient's phone number (with country code)
- `text` (string): Message content
- `replyTo` (string, optional): Message ID to reply to

**Returns:** Promise with message object

#### `sendMedia(options)`

Send media (image, video, document, audio).

**Parameters:**
- `to` (string): Recipient's phone number
- `type` (string): Media type ('image', 'video', 'document', 'audio')
- `url` (string): URL to the media file
- `caption` (string, optional): Media caption
- `filename` (string, optional): Filename for documents

**Returns:** Promise with message object

#### `scheduleMessage(options)`

Schedule a message for future delivery.

**Parameters:**
- `to` (string): Recipient's phone number
- `text` (string): Message content
- `scheduledTime` (Date): When to send the message

**Returns:** Promise with scheduled message object

#### `getMessageStatus(messageId)`

Get the delivery status of a message.

**Parameters:**
- `messageId` (string): ID of the message

**Returns:** Promise with status object

#### `getMetrics(options)`

Get gateway metrics and statistics.

**Parameters:**
- `startDate` (Date, optional): Start date for metrics
- `endDate` (Date, optional): End date for metrics

**Returns:** Promise with metrics object

## Error Handling

The gateway throws typed errors that should be caught and handled:

```javascript
const { 
  WhatsAppGatewayError, 
  RateLimitError, 
  ValidationError,
  AuthenticationError 
} = require('easy-autom-pro-gateway');

try {
  await gateway.sendMessage({ to: '123', text: 'Hello' });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited. Retry after:', error.retryAfter);
  } else if (error instanceof ValidationError) {
    console.log('Invalid input:', error.message);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed. Check credentials.');
  } else {
    console.log('Gateway error:', error.message);
  }
}
```

## Troubleshooting

### Issue: "Invalid Access Token"

**Solution:**
1. Verify the access token in your `.env` file
2. Check if the token has expired
3. Generate a new token from Meta Business Suite

### Issue: "Phone Number Not Registered"

**Solution:**
1. Ensure the phone number is registered with Meta Business Account
2. Verify the phone number format includes country code (e.g., 11234567890)
3. Check that the phone number is in the allowed list

### Issue: "Webhook Not Receiving Messages"

**Solution:**
1. Verify your webhook URL is HTTPS and publicly accessible
2. Check the verify token matches in your configuration
3. Ensure firewall allows incoming requests
4. Check logs for error details

### Issue: "Rate Limiting"

**Solution:**
1. Implement exponential backoff for retries
2. Adjust `RATE_LIMIT_MESSAGES_PER_MINUTE` in environment
3. Queue messages for batch processing
4. Contact Meta support for higher rate limits

### Debug Mode

Enable debug logging:

```javascript
const gateway = new WhatsAppGateway({
  // ... other options
  debug: true
});
```

## Best Practices

1. **Always validate phone numbers** before sending messages
2. **Use environment variables** for sensitive credentials
3. **Implement proper error handling** and retry logic
4. **Monitor rate limits** and adjust accordingly
5. **Log all messages** for audit trails
6. **Use webhooks** for real-time updates instead of polling
7. **Encrypt sensitive data** in transit and at rest
8. **Test thoroughly** in sandbox mode before production

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:

- **GitHub Issues**: https://github.com/mariomardegan5-cpu/easy-autom-pro/issues
- **Email**: support@easy-autom-pro.com
- **Documentation**: https://docs.easy-autom-pro.com

## Changelog

### Version 1.0.0 (2025-12-10)
- Initial release
- Text message support
- Media messaging (image, video, document, audio)
- Message scheduling
- Webhook support
- Rate limiting
- Error handling and logging
