const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { supabase, hasSupabaseConfig, supabaseBucket } = require("../config/supabase");

const localUploadsDirectory = path.resolve(__dirname, "../uploads");
fs.mkdirSync(localUploadsDirectory, { recursive: true });

const buildFileName = (originalName = "passport.jpg") => {
  const extension = path.extname(originalName) || ".jpg";
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
};

const uploadPassportPhoto = async (file) => {
  if (!file) {
    return null;
  }

  const fileName = buildFileName(file.originalname);

  if (hasSupabaseConfig) {
    const objectPath = `drivers/${fileName}`;
    const { error } = await supabase.storage
      .from(supabaseBucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(supabaseBucket).getPublicUrl(objectPath);

    return {
      storageType: "supabase",
      path: objectPath,
      publicUrl: data.publicUrl,
    };
  }

  const localPath = path.join(localUploadsDirectory, fileName);
  await fs.promises.writeFile(localPath, file.buffer);

  return {
    storageType: "local",
    path: fileName,
    publicUrl: `/uploads/${fileName}`,
  };
};

module.exports = {
  uploadPassportPhoto,
  hasSupabaseConfig,
};
