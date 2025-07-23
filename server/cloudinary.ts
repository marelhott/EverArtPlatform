import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
}

export class CloudinaryService {
  static async uploadFromUrl(imageUrl: string, folderPath: string = 'everart-generations'): Promise<CloudinaryUploadResult> {
    try {
      const result = await cloudinary.uploader.upload(imageUrl, {
        folder: folderPath,
        resource_type: 'image'
      });

      return {
        public_id: result.public_id,
        url: result.url,
        secure_url: result.secure_url
      };
    } catch (error: any) {
      console.error('Cloudinary upload failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to upload image to Cloudinary: ${error.message || 'Unknown error'}`);
    }
  }

  static async uploadFromBuffer(buffer: Buffer, filename: string, folderPath: string = 'everart-uploads'): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          resource_type: 'image',
          public_id: filename.split('.')[0] // Use filename without extension
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload failed:', error);
            reject(new Error('Failed to upload image to Cloudinary'));
          } else if (result) {
            resolve({
              public_id: result.public_id,
              url: result.url,
              secure_url: result.secure_url
            });
          } else {
            reject(new Error('No result from Cloudinary upload'));
          }
        }
      ).end(buffer);
    });
  }

  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
      return false;
    }
  }

  static isConfigured(): boolean {
    const configured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    console.log(`Cloudinary configured: ${configured}, cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    return configured;
  }

  static async listImages(folderPath: string = 'everart-generations'): Promise<any> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 50
      });
      console.log(`Found ${result.resources.length} images in ${folderPath} folder`);
      return result;
    } catch (error) {
      console.error('Failed to list Cloudinary images:', error);
      throw error;
    }
  }
}

export { cloudinary };