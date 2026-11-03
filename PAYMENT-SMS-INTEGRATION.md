# MU Home Service — bKash and Bangladesh SMS Integration

## Included provider adapters

- **Payments:** bKash Tokenized Checkout (`PAYMENT_PROVIDER=bkash`). Sandbox is the default. The backend obtains a bKash ID token, creates a checkout, redirects the Customer to the HTTPS `bkashURL`, and processes the redirect callback by verifying the payment server-to-server with bKash Execute/Payment Status APIs. Browser query parameters alone never mark a payment as paid.
- **SMS:** MiMSMS transactional SMS adapter (`SMS_PROVIDER=mimsms`) using `POST https://api.mimsms.com/api/V2/SMS`. Configure an active API key, account username, and approved sender name from your MiMSMS account. The provider was selected as a concrete Bangladesh gateway adapter because no specific SMS vendor was named. It can be replaced with another gateway adapter later.

## Environment configuration

Set these only in the **server** deployment environment; never put secrets in Vite/client variables or commit them:

```dotenv
PAYMENT_PROVIDER=bkash
PAYMENT_CURRENCY=BDT
BKASH_ENV=sandbox
BKASH_APP_KEY=your-sandbox-app-key
BKASH_APP_SECRET=your-sandbox-app-secret
BKASH_USERNAME=your-sandbox-username
BKASH_PASSWORD=your-sandbox-password
PAYMENT_PUBLIC_CALLBACK_URL=https://YOUR_API_HOST/api/payments/bkash/callback
FRONTEND_URL=https://YOUR_FRONTEND_HOST

SMS_PROVIDER=mimsms
MIMSMS_API_URL=https://api.mimsms.com/api/V2/SMS
MIMSMS_USERNAME=your-provider-account-email
MIMSMS_API_KEY=your-active-api-key
MIMSMS_SENDER_NAME=your-approved-sender-name
```

Use credentials issued by the provider for the relevant environment. Only change `BKASH_ENV=production` after bKash merchant onboarding and production credentials are approved. Production callback and frontend URLs must be HTTPS. Keep credentials out of logs, source control, and client-side environment variables.

## Payment verification and idempotency

1. The backend derives the due amount from the authenticated Customer's own Booking; the browser cannot submit an amount.
2. The backend creates a bKash checkout and stores the bKash `paymentID` against the MU-generated payment record.
3. The bKash redirect callback is treated as untrusted input. The backend executes/queries the payment directly with bKash and checks transaction status, transaction ID, amount, and BDT currency.
4. The booking payment array is guarded by the MU payment ID, and the finance ledger uses the unique `sourceKey` `online-payment:<paymentId>` so retries do not double count.
5. Any mismatch or settlement error is marked `reconciliation_required` for Admin review. Do not manually mark a payment as successful based only on the redirect page.

## SMS behavior

Notifications are best-effort and must not roll back a Booking or verified payment if the SMS provider is down. Bangladesh mobile numbers are normalized to the `8801XXXXXXXXX` format. Confirm transactional messaging, sender ID approval, account credit, and provider terms with the chosen gateway before production.

## Go-live checklist

- Complete bKash Merchant Integration Portal registration and obtain sandbox credentials first.
- Test successful, failed, cancelled, duplicate callback, amount mismatch, delayed callback, and provider timeout scenarios in sandbox.
- Verify the exact API response/status fields against the merchant's current bKash documentation and credentials.
- Configure MiMSMS transactional API access and an approved sender ID; test with an authorized test recipient.
- Run the complete frontend build and MongoDB integration tests before production deployment.

Official references:
- bKash business/payment gateway: https://www.bkash.com/en/business
- bKash developer portal: https://developer.bka.sh/docs/checkout-url-process-overview
- MiMSMS API reference: https://apidoc.mimsms.com/
