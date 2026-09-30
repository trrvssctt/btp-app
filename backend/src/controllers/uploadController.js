const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const cloudinary = require('../config/cloudinary');

// On reçoit une image encodée en base64 (data URL) depuis le frontend.
const schema = z.object({
  image: z.string().min(10), // data:image/png;base64,....
  folder: z.string().max(100).optional(),
});

exports.uploadImage = [
  validate(schema),
  asyncHandler(async (req, res) => {
    const { image, folder } = req.body;

    if (!image.startsWith('data:image/')) {
      throw new HttpError(400, "Format d'image invalide (data URL attendue)");
    }

    try {
      const result = await cloudinary.uploader.upload(image, {
        folder: folder || 'btp-manager',
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      res.status(201).json({ data: { url: result.secure_url, public_id: result.public_id } });
    } catch (err) {
      throw new HttpError(502, `Échec upload Cloudinary : ${err.message}`);
    }
  }),
];
