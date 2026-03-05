import multer from "multer";
import { AppError } from "@shared/errors/app.error";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@modules/attachments/dtos/attachment.dto";

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(), // buffer em memória, sem disco

  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files:    5, // máximo de 5 arquivos por request
  },

  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_MIME_TYPES as readonly string[];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new AppError(
          `Tipo de arquivo não permitido: ${file.mimetype}`,
          415,
          "UNSUPPORTED_MEDIA_TYPE"
        )
      );
    }

    cb(null, true);
  },
});