import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import fs from "fs";

const router = express.Router();

const upload = multer({ dest: "public/uploads/" });

router.post("/", upload.single("image"), (req: Request, res: Response): void => {
  const imagePath = req.file?.path;

  if (!imagePath) {
    res.status(400).json({ error: "Image required" });
    return;
  }

  // 🧠 Panggil Python script YOLO
  exec(`python3 detect.py ${imagePath}`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: stderr });
      return;
    }

    const result = JSON.parse(stdout);
    fs.unlinkSync(imagePath); // optional: hapus file setelah diproses

    res.json(result);
  });
});

export default router;
