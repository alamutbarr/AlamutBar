// انتزاع درگاه پیامک: اگر متغیرهای محیطی درگاه واقعی تنظیم شده باشند از آن استفاده می‌شود،
// در غیر این‌صورت (حالت توسعه) کد روی کنسول چاپ می‌شود تا بدون هزینه قابل تست باشد.
// برای اتصال واقعی فقط کافیست SMS_PROVIDER, SMS_API_KEY, SMS_SENDER را در .env تنظیم کنید.

async function sendViaKavenegar(phoneNumber, code) {
  const url = `https://api.kavenegar.com/v1/${process.env.SMS_API_KEY}/verify/lookup.json`;
  const params = new URLSearchParams({
    receptor: phoneNumber,
    token: code,
    template: process.env.SMS_TEMPLATE || 'verify',
  });

  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`SMS gateway error: ${res.status}`);
  }
  return res.json();
}

async function sendOtpSms(phoneNumber, code) {
  const provider = process.env.SMS_PROVIDER;

  if (provider === 'kavenegar' && process.env.SMS_API_KEY) {
    await sendViaKavenegar(phoneNumber, code);
    return { mocked: false };
  }

  // حالت توسعه / بدون درگاه متصل
  console.log(`📲 [SMS MOCK] کد تأیید برای ${phoneNumber}: ${code}`);
  return { mocked: true };
}

module.exports = { sendOtpSms };
