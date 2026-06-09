import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

export class UploadController {
  upload = (req: any, res: any, next: any) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      res.json({
        file: {
          name: req.file.originalname,
          size: req.file.size,
          url: `/uploads/${req.file.filename}`
        }
      });
    });
  };

  list = async (req: any, res: any, next: any) => {
    try {
      const files = fs.readdirSync(uploadDir).map(name => ({
        name,
        url: `/uploads/${name}`,
        size: fs.statSync(path.join(uploadDir, name)).size
      }));
      res.json({ files });
    } catch (error) { next(error); }
  };
}
