// src/controllers/upload.controller.js
const { v4: uuidv4 } = require("uuid");
const supabase = require("../config/supabase");
const { sendSuccess, sendError } = require("../utils/response");

const BUCKET = "vendoor-uploads";

// POST /api/upload/image?folder=logos|products|documents|general
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, "No file provided. Send an image as multipart/form-data field 'image'.", 400);
    }

    const ext      = req.file.originalname.split(".").pop().toLowerCase();
    const folder   = req.query.folder || "general";
    const filePath = `${folder}/${uuidv4()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return sendError(res, "File upload failed. Please try again.", 500);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    return sendSuccess(res, { url: data.publicUrl, path: filePath }, "Image uploaded successfully.", 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/upload/image  body: { path: "folder/file.jpg" }
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
