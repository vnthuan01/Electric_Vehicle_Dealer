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

const accessoryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "accessory_images",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{width: 800, crop: "limit"}],
  },
});

const optionImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "option_images",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{width: 800, crop: "limit"}],
  },
});

// ===== Contract Uploads =====
const contractStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "contracts",
    allowed_formats: ["pdf", "jpg", "jpeg", "png"],
    transformation: [],
  },
});

export const uploadUserAvatar = multer({storage: userAvatarStorage});
export const uploadVehicleImage = multer({storage: vehicleImageStorage});
export const uploadAccessoryImage = multer({storage: accessoryImageStorage});
export const uploadOptionImage = multer({storage: optionImageStorage});
export const uploadContract = multer({storage: contractStorage});
