const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const supabase = require("../config/supabase");
const { sendSuccess, sendError } = require("../utils/response");

const BUCKET = "vendoor-uploads";

// Compress and resize image before upload
const compressImage = async (buffer, mimetype) => {
  const isGif = mimetype === "image/gif";

  // GIFs can't be compressed well with sharp — upload as-is
  if (isGif) return { buffer, ext: "gif", contentType: "image/gif" };

  const compressed = await sharp(buffer)
    .resize(1200, 1200, {
      fit: "inside",        // never upscale, just shrink if larger than 1200x1200
      withoutEnlargement: true,
    })
    .webp({ quality: 80 }) // convert everything to webp — best size/quality ratio
    .toBuffer();

  return { buffer: compressed, ext: "webp", contentType: "image/webp" };
};

// POST /api/upload/image?folder=logos|products|documents|general
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, "No file provided. Send an image as multipart/form-data field 'image'.", 400);
    }

    const folder = req.query.folder || "general";

    // Compress before uploading
    const { buffer, ext, contentType } = await compressImage(
      req.file.buffer,
      req.file.mimetype
    );

    const filePath = `${folder}/${uuidv4()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return sendError(res, "File upload failed. Please try again.", 500);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    // Return size info so frontend can show compression stats if needed
    const originalKB = Math.round(req.file.size / 1024);
    const compressedKB = Math.round(buffer.length / 1024);

    return sendSuccess(
      res,
      {
        url: data.publicUrl,
        path: filePath,
        originalSize: `${originalKB}KB`,
        compressedSize: `${compressedKB}KB`,
        savedPercent: `${Math.round((1 - buffer.length / req.file.size) * 100)}%`,
      },
      "Image uploaded successfully.",
      201
    );
  } catch (err) {
    next(err);
  }
};

// DELETE /api/upload/image  body: { path }
const deleteImage = async (req, res, next) => {
  try {
    const { path } = req.body;
    if (!path) return sendError(res, "File path is required.", 400);

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error("Supabase delete error:", error);
      return sendError(res, "Failed to delete file.", 500);
    }

    return sendSuccess(res, null, "File deleted successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadImage, deleteImage };