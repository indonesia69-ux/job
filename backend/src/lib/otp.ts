const BASE_URL = 'https://www.fast2sms.com/dev/otp';

interface OTPOptions {
  expiryMinutes?: number;
  otpLength?: number;
  customOtp?: string;
  variablesValues?: string;
  templateType?: 'verification' | 'reset';
}

interface Fast2SMSResponse {
  return: boolean;
  status_code: number;
  message: string;
  request_id?: string;
}

const getHeaders = () => {
  const key = process.env.FAST2SMS_API_KEY;
  if (!key) throw new Error('FAST2SMS_API_KEY is not set');
  return {
    'authorization': key,
    'Content-Type': 'application/json',
  };
};

export class OTPError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'OTPError';
    this.statusCode = statusCode;
  }
}

export async function sendOTP(mobile: string, options: OTPOptions = {}): Promise<Fast2SMSResponse> {
  const {
    expiryMinutes = 10,
    otpLength = 6,
    customOtp,
    variablesValues,
    templateType = 'verification',
  } = options;

  let templateId;
  if (templateType === 'verification') {
    templateId = process.env.FAST2SMS_VERIFICATION_TEMPLATE_ID;
  } else if (templateType === 'reset') {
    templateId = process.env.FAST2SMS_RESET_TEMPLATE_ID;
  }
  
  if (!templateId) throw new Error(`FAST2SMS_${templateType.toUpperCase()}_TEMPLATE_ID is not set`);

  const payload: any = {
    mobile,
    otp_id: templateId,
    otp_expiry: expiryMinutes,
    otp_length: otpLength,
  };

  if (customOtp) payload.otp = customOtp;
  if (variablesValues) payload.variables_values = variablesValues;

  const res = await fetch(`${BASE_URL}/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  const data: Fast2SMSResponse = await res.json();
  if (!data.return) {
    throw new OTPError(data.message || 'Failed to send OTP', data.status_code || res.status);
  }

  return data;
}

export async function verifyOTP(mobile: string, otp: string): Promise<Fast2SMSResponse> {
  const res = await fetch(`${BASE_URL}/verify`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ mobile, otp })
  });

  const data: Fast2SMSResponse = await res.json();
  if (!data.return) {
    throw new OTPError(data.message || 'Invalid or expired OTP', data.status_code || res.status);
  }

  return data;
}

export async function resendOTP(mobile: string): Promise<Fast2SMSResponse> {
  const res = await fetch(`${BASE_URL}/resend`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ mobile })
  });

  const data: Fast2SMSResponse = await res.json();
  if (!data.return) {
    throw new OTPError(data.message || 'Cannot resend OTP', data.status_code || res.status);
  }

  return data;
}

export async function smartResendOTP(mobile: string, options?: OTPOptions): Promise<Fast2SMSResponse> {
  try {
    return await resendOTP(mobile);
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 400) {
      return await sendOTP(mobile, options);
    }
    throw err;
  }
}
