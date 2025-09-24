import {CloudinaryStorage} from "multer-storage-cloudinary";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const userAvatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "user_avatars",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{width: 250, height: 250, crop: "fill"}],
  },
});

const vehicleImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "vehicle_images",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{width: 800, crop: "limit"}],
  },
});

export const uploadUserAvatar = multer({storage: userAvatarStorage});
export const uploadVehicleImage = multer({storage: vehicleImageStorage});
