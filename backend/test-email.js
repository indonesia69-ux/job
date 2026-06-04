require('dotenv').config();

async function test() {
  const url = 'https://api.brevo.com/v3/smtp/email';
  const apiKey = process.env.BREVO_API_KEY;

  const institutionName = 'Test Hospital';
  const activationCode = 'ABC-123-XYZ';

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ApronHanger Activation</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;background:#f5f8fc;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.wrapper{width:100%;padding:40px 20px;background:linear-gradient(135deg,#071829 0%,#0D2746 50%,#144A7A 100%);}
.container{max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.12);}
.header{padding:48px 56px;background:linear-gradient(135deg,#0D2746,#144A7A);position:relative;}
.header::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(90deg,transparent,transparent 58px,rgba(255,255,255,0.03) 60px);pointer-events:none;}
.brand{position:relative;z-index:2;}
.brand-name{color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;}
.brand-name span{color:#74C7FF;}
.brand-tag{margin-top:10px;color:#A6D8FF;font-size:11px;text-transform:uppercase;letter-spacing:2px;}
.hero-title{margin-top:32px;color:#ffffff;font-size:34px;line-height:1.2;font-weight:600;}
.hero-subtitle{margin-top:16px;color:#D6E7F7;font-size:15px;line-height:1.8;max-width:450px;}
.content{padding:48px 56px;}
.welcome{color:#334155;font-size:15px;line-height:1.8;}
.institution{font-weight:600;color:#0D2746;}
.code-box{margin:36px 0;background:#F8FBFF;border:1px solid #D9EAF8;border-radius:20px;text-align:center;padding:32px;}
.code-label{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4A90C2;margin-bottom:18px;}
.activation-code{font-size:34px;font-weight:700;color:#0D2746;letter-spacing:4px;font-family:'Courier New',monospace;}
.code-validity{margin-top:18px;color:#64748B;font-size:13px;}
.trust-bar{display:flex;justify-content:center;flex-wrap:wrap;gap:16px;margin-bottom:40px;}
.trust-item{font-size:13px;color:#475569;}
.section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4A90C2;margin-bottom:24px;}
.step{display:flex;margin-bottom:22px;}
.step-number{width:32px;height:32px;border-radius:10px;background:#E9F4FD;color:#0D2746;font-weight:600;display:flex;align-items:center;justify-content:center;margin-right:16px;flex-shrink:0;}
.step-text{color:#475569;font-size:14px;line-height:1.8;}
.cta-wrapper{text-align:center;margin:40px 0;}
.cta{display:inline-block;background:linear-gradient(135deg,#144A7A,#1D74C7);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:999px;font-size:14px;font-weight:600;}
.support{text-align:center;color:#64748B;font-size:14px;line-height:1.8;}
.signature{margin-top:36px;color:#334155;line-height:1.8;}
.footer{background:#F8FAFC;padding:28px;text-align:center;border-top:1px solid #E2E8F0;}
.footer-brand{color:#0D2746;font-weight:700;}
.footer-brand span{color:#1D74C7;}
.footer-text{margin-top:10px;font-size:12px;color:#94A3B8;}
</style>
</head>
<body>
<div class="wrapper">
<div class="container">
<div class="header">
<div class="brand">
<div class="brand-name">Apron<span>hanger</span></div>
<div class="brand-tag">Healthcare Talent Platform</div>
</div>
<div class="hero-title">Complete Your Institution Activation</div>
<div class="hero-subtitle">Your healthcare organization has been successfully onboarded. Use the secure activation code below to access the ApronHanger platform.</div>
</div>
<div class="content">
<div class="welcome">
Dear <span class="institution">${institutionName}</span>,<br><br>
Thank you for joining ApronHanger. We are excited to partner with your institution and support your healthcare recruitment initiatives.
</div>
<div class="code-box">
<div class="code-label">Activation Code</div>
<div class="activation-code">${activationCode}</div>
<div class="code-validity">Valid for 72 hours &bull; Single institution use</div>
</div>
<div class="trust-bar">
<div class="trust-item">&#10003; Encrypted Verification</div>
<div class="trust-item">&#10003; Secure Onboarding</div>
<div class="trust-item">&#10003; Single Use Activation</div>
</div>
<div class="section-title">How To Activate</div>
<div class="step"><div class="step-number">1</div><div class="step-text">Visit the ApronHanger recruiter portal.</div></div>
<div class="step"><div class="step-number">2</div><div class="step-text">Enter the activation code exactly as displayed above.</div></div>
<div class="step"><div class="step-number">3</div><div class="step-text">Complete your institution profile and begin posting healthcare opportunities.</div></div>
<div class="cta-wrapper"><a href="https://app.apronhanger.com/activate" class="cta">Begin Platform Setup</a></div>
<div class="support">If you did not request this activation, please ignore this email or contact our support team.</div>
<div class="signature">Warm regards,<br><strong>ApronHanger Onboarding Team</strong><br>Healthcare Talent Platform</div>
</div>
<div class="footer">
<div class="footer-brand">Apron<span>hanger</span></div>
<div class="footer-text">Connecting Hospitals, Clinics and Healthcare Professionals<br><br>&copy; 2026 ApronHanger. All Rights Reserved.</div>
</div>
</div>
</div>
</body>
</html>`;

  const body = JSON.stringify({
    sender: { name: 'ApronHanger Onboarding Team', email: process.env.BREVO_SENDER_EMAIL },
    to: [{ email: 'rajendrasinghrao004@gmail.com', name: institutionName }],
    subject: 'Your ApronHanger Account is Approved — Activation Code Inside',
    htmlContent: htmlContent
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
