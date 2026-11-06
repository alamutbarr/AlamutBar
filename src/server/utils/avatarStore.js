const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'uploads', 'avatars');
const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function ensureDir() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
}

ensureDir();

function publicUrl(kind, id) {
  if (!kind || id == null) return null;
  ensureDir();
  const found = EXTS
    .map((ext) => `${kind}-${id}${ext}`)
    .find((name) => fs.existsSync(path.join(ROOT, name)));
  return found ? `/uploads/avatars/${found}` : null;
}

function saveAvatar(kind, id, file) {
  if (!file) {
    const error = new Error('تصویر را انتخاب کنید.');
    error.statusCode = 400;
    throw error;
  }
  ensureDir();
  EXTS.forEach((ext) => {
    const previous = path.join(ROOT, `${kind}-${id}${ext}`);
    if (fs.existsSync(previous)) fs.unlinkSync(previous);
  });
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const safeExt = EXTS.includes(ext) ? ext : '.jpg';
  const dest = path.join(ROOT, `${kind}-${id}${safeExt}`);
  fs.renameSync(file.path, dest);
  return `/uploads/avatars/${path.basename(dest)}`;
}

function removeAvatar(kind, id) {
  ensureDir();
  EXTS.forEach((ext) => {
    const previous = path.join(ROOT, `${kind}-${id}${ext}`);
    if (fs.existsSync(previous)) fs.unlinkSync(previous);
  });
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

module.exports = {
  ROOT,
  publicUrl,
  saveAvatar,
  removeAvatar,
  splitName,
};
