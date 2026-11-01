import 'server-only';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';

let configured = false;
export function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET.');
  if (!configured) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }
  return cloudinary;
}

export type CloudinaryUpload = Pick<UploadApiResponse, 'public_id' | 'secure_url' | 'format' | 'resource_type' | 'bytes' | 'width' | 'height' | 'version' | 'type'>;

export async function uploadCloudinaryImage(buffer: Buffer, options: UploadApiOptions): Promise<CloudinaryUpload> {
  const client = getCloudinary();
  return await new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream({ resource_type: 'image', unique_filename: true, overwrite: false, ...options }, (error, result) => {
      if (error || !result) reject(error || new Error('Cloudinary tidak mengembalikan hasil unggahan.'));
      else resolve(result as CloudinaryUpload);
    });
    stream.end(buffer);
  });
}

export async function deleteCloudinaryImage(publicId: string, type: 'upload' | 'authenticated' = 'upload') {
  if (!publicId || publicId.length > 500) return;
  const client = getCloudinary();
  await client.uploader.destroy(publicId, { resource_type: 'image', type, invalidate: true });
}

export function authenticatedCloudinaryImageUrl(publicId: string, format = 'jpg') {
  const client = getCloudinary();
  return client.url(publicId, { secure: true, sign_url: true, type: 'authenticated', resource_type: 'image', format });
}

export async function assertCloudinaryImageExists(publicId: string, type: 'upload' | 'authenticated' = 'authenticated') {
  const client = getCloudinary();
  await client.api.resource(publicId, { resource_type: 'image', type });
}
