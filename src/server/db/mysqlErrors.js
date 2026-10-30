function errorCode(error) {
  return error?.code || error?.original?.code || error?.parent?.code || '';
}

function errorErrno(error) {
  return error?.errno || error?.original?.errno || error?.parent?.errno || '';
}

function isConnectionRefused(error) {
  const code = String(errorCode(error));
  const errno = errorErrno(error);
  return code === 'ECONNREFUSED'
    || code === 'ETIMEDOUT'
    || code === 'PROTOCOL_CONNECTION_LOST'
    || errno === 'ECONNREFUSED'
    || errno === -4078
    || errno === 2003;
}

function xamppRecoverySteps() {
  return [
    'Apache زمپ برای این پروژه لازم نیست؛ فقط MySQL را Start کنید.',
    'اگر کنترل‌پنل نوشت MySQL shutdown unexpectedly، سرویس اصلاً بالا نیامده است.',
    'علت رایج: پورت 3306 در اشغال سرویس MySQL ویندوز است، یا پوشه data زمپ بعد از crash خراب شده.',
    'از ریشه پروژه این را اجرا کنید: npm run db:doctor',
    'روی ویندوز برای تعمیر زمپ: powershell -ExecutionPolicy Bypass -File scripts/fix-xampp-mysql.ps1',
    'اگر دکتر گفت data خراب است، همان دستور را با -Repair بزنید. یک نسخه پشتیبان کنار پوشه mysql ساخته می‌شود.',
    'اگر پورت 3306 اشغال بود، اسکریپت می‌تواند MySQL زمپ را روی 3307 بیاورد و DB_PORT را در .env عوض کند.',
    'DB_HOST را 127.0.0.1 بگذارید نه localhost؛ روی ویندوز localhost به named pipe می‌رود و به زمپ وصل نمی‌شود.',
  ];
}

function formatMysqlStartupError({ error, dbConfig }) {
  const code = errorCode(error);
  const errno = errorErrno(error);
  const host = dbConfig?.host || '127.0.0.1';
  const port = dbConfig?.port || 3306;
  const user = dbConfig?.user || 'root';
  const message = error?.message || String(error || 'خطای ناشناخته');

  if (isConnectionRefused(error)) {
    return {
      title: `MySQL روی ${host}:${port} روشن نیست (MySQL shutdown unexpectedly).`,
      lines: [
        `Node به ${host}:${port} وصل نشد. خود زمپ باید MySQL را Start کند؛ این پروژه MySQL را روشن نمی‌کند.`,
        ...xamppRecoverySteps(),
      ],
    };
  }

  if (code === 'ER_ACCESS_DENIED_ERROR' || errno === 1045) {
    return {
      title: `MySQL ورود کاربر «${user}» را رد کرد.`,
      lines: [
        `DB_USER و DB_PASS را در فایل .env با کاربر phpMyAdmin زمپ یکی کنید.`,
        'در زمپ پیش‌فرض معمولاً کاربر root و رمز خالی است: DB_USER=root و DB_PASS=',
      ],
    };
  }

  if (code === 'ER_NOT_SUPPORTED_AUTH_MODE' || errno === 1251) {
    return {
      title: 'روش احراز هویت MySQL با Node سازگار نیست.',
      lines: [
        'در phpMyAdmin این را اجرا کنید:',
        "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';",
        'بعد MySQL زمپ را Restart کنید.',
      ],
    };
  }

  if (code === 'EPERM' || code === 'EACCES') {
    return {
      title: `اجازه اتصال به ${host}:${port} داده نشد.`,
      lines: [
        'فایروال ویندوز یا آنتی‌ویروس پورت MySQL را بسته است.',
        ...xamppRecoverySteps(),
      ],
    };
  }

  return {
    title: `راه‌اندازی دیتابیس ناموفق بود: ${message}`,
    lines: xamppRecoverySteps(),
  };
}

function printMysqlStartupError(formatted, write = console.error) {
  write(formatted.title);
  for (const line of formatted.lines) write(line);
}

function normalizeDbHost(host, platform = process.platform) {
  if (platform === 'win32' && String(host || '').trim().toLowerCase() === 'localhost') {
    return '127.0.0.1';
  }
  return host;
}

module.exports = {
  errorCode,
  errorErrno,
  isConnectionRefused,
  xamppRecoverySteps,
  formatMysqlStartupError,
  printMysqlStartupError,
  normalizeDbHost,
};
