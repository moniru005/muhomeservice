import fs from 'node:fs/promises';
import crypto from 'node:crypto';

/** Upload a locally staged file to Cloudinary. When not configured, return a local URL.
 * Cloudinary credentials are server-only; never expose API secret to clients.
 */
export async function persistUploadedFile(file, { folder = 'mu-home-service', resourceType = 'image' } = {}) {
  const provider = String(process.env.UPLOAD_STORAGE || 'local').toLowerCase();
  if (provider === 'local') return { url: null, provider: 'local', publicId: null };
  if (provider !== 'cloudinary') throw new Error(`Unsupported UPLOAD_STORAGE provider: ${provider}`);
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !key || !secret) throw new Error('Cloudinary storage is selected but credentials are incomplete.');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { folder, timestamp };
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(file.path)], { type: file.mimetype }), file.filename);
  form.append('api_key', key); form.append('timestamp', timestamp); form.append('folder', folder); form.append('signature', signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`, { method: 'POST', body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.secure_url) throw new Error(payload.error?.message || 'Cloudinary upload failed.');
  await fs.unlink(file.path).catch(() => {});
  return { url: payload.secure_url, provider: 'cloudinary', publicId: payload.public_id };
}
