import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const configured = () =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

function client() {
  if (!configured()) {
    throw new HttpError(
      503,
      'Image uploads are not set up yet. Add the Cloudinary keys to the server environment.'
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

/** Uploads one image buffer. Returns the URL (optimised with f_auto,q_auto) and the public id. */
export function uploadImage(buffer, { folder = 'novelle-tech/products' } = {}) {
  const cl = client();
  return new Promise((resolve, reject) => {
    const stream = cl.uploader.upload_stream({ folder, resource_type: 'image' }, (err, result) => {
      if (err)
        return reject(
          new HttpError(502, 'The image could not be uploaded. Try a smaller JPG, PNG or WebP.')
        );
      resolve({
        url: cl.url(result.public_id, { fetch_format: 'auto', quality: 'auto', secure: true }),
        publicId: result.public_id,
      });
    });
    stream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  const cl = client();
  await cl.uploader.destroy(publicId);
}

export { configured as cloudinaryConfigured };
