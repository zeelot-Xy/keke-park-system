# EmailJS Verification Template

Use this template for the automatic driver-approval email.

## Template Variables Used By The Backend

Your backend sends these variables to EmailJS:

- `{{to_name}}`
- `{{to_email}}`
- `{{verification_url}}`
- `{{app_name}}`
- `{{from_name}}`

These values come from [emailVerificationService.js](C:\Users\Zeelot\Desktop\keke-park-system\backend\services\emailVerificationService.js).

## Recommended Email Subject

```text
Verify your email for automatic approval - {{app_name}}
```

## Recommended Plain Text Message

```text
Hello {{to_name}},

Thank you for registering on {{app_name}}.

To verify your email and get your driver account approved automatically, use the link below:

{{verification_url}}

If you do not verify your email, your registration will remain pending until an admin reviews and approves it manually.

If you did not create this account, you can ignore this email.

Regards,
{{from_name}}
```

## Recommended HTML Message

Paste this into the EmailJS template body if you are using HTML email content:

```html
<div style="margin:0;padding:0;background:#f8f2de;font-family:Arial,sans-serif;color:#1d1a14;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="background:linear-gradient(135deg,#f4c542,#dca117);border-radius:24px;padding:28px 24px;box-shadow:0 16px 40px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:52px;height:52px;border-radius:16px;background:#14532d;color:#f4c542;font-size:26px;font-weight:700;line-height:52px;text-align:center;">K</div>
        <div>
          <div style="font-size:28px;font-weight:800;color:#14532d;line-height:1.1;">{{app_name}}</div>
          <div style="font-size:14px;color:rgba(20,83,45,0.78);font-weight:600;">Email Verification</div>
        </div>
      </div>

      <div style="background:#fffbea;border:1px solid #d8d0bd;border-radius:28px;padding:32px 28px;">
        <h1 style="margin:0 0 12px;font-size:30px;line-height:1.15;color:#1d1a14;">Verify your email</h1>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#6f6758;">
          Hello {{to_name}},
        </p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#6f6758;">
          Thank you for registering on {{app_name}}. Click the button below to verify your email and approve your driver account automatically.
        </p>

        <div style="margin:28px 0;text-align:center;">
          <a
            href="{{verification_url}}"
            style="display:inline-block;background:#14532d;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:16px;"
          >
            Verify Email
          </a>
        </div>

        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#6f6758;">
          If the button does not work, copy and paste this link into your browser:
        </p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.7;word-break:break-all;">
          <a href="{{verification_url}}" style="color:#14532d;">{{verification_url}}</a>
        </p>

        <div style="background:#ffe28a33;border:1px solid #dca11755;border-radius:16px;padding:14px 16px;margin-top:20px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#6f6758;">
            If you do not verify your email, your account will stay pending until an admin reviews it manually.
          </p>
        </div>

        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6f6758;">
          If you did not create this account, you can ignore this email.
        </p>
      </div>
    </div>

    <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#6f6758;">
      Sent by {{from_name}}
    </p>
  </div>
</div>
```

## EmailJS Setup Checklist

1. Create an EmailJS email service connected to your email provider.
2. Create a template and paste the subject/body above.
3. Make sure the template uses the variables exactly as written.
4. Copy these values into your backend environment:
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_TEMPLATE_ID`
   - `EMAILJS_PUBLIC_KEY`
   - `EMAILJS_PRIVATE_KEY`
   - `EMAIL_FROM_NAME`
5. Set `PUBLIC_BACKEND_URL` to your deployed Render backend URL.
6. Run `npm run db:setup` if you have not already added the email-verification columns.
7. Redeploy Render.

## Quick Test

1. Register a new driver with a real email address.
2. Confirm the success message says to check email for verification.
3. Open the email and click `Verify Email`.
4. You should land on the login page with a verification success notice.
5. The driver account should now be approved automatically without admin action.
