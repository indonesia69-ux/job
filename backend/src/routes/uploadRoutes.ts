import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { uploadRawBuffer, deleteCloudinaryAsset } from '../lib/cloudinary';

const router = Router();

// Store files in memory buffer so we can send straight to Cloudinary
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

function validateMime(mimetype: string) {
  if (!ALLOWED_MIMES.has(mimetype)) {
    throw new Error('Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG.');
  }
}

// POST /api/upload/cv
// Candidate uploads their CV
router.post('/cv', requireAuth, requireRole('CANDIDATE'), upload.single('cv'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No CV file provided' });
      return;
    }
    
    validateMime(file.mimetype);
    
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked' });
      return;
    }

    const timestamp = Date.now();
    const publicId = `${candidateId}_${timestamp}`;
    
    // Upload to cloudinary folder `candidates/cv/`
    const result = await uploadRawBuffer(file.buffer, 'candidates/cv', publicId);

    // Immediately persist the Cloudinary URL + filename in the candidate record
    // so the filename is never lost even if the frontend doesn't do a separate profile save.
    try {
      const prisma = (await import('../lib/prisma')).default;
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          cvUrl: result.secure_url,
          cvCloudinaryId: result.public_id,
          uploadedCvName: file.originalname,
          uploadedCvMime: file.mimetype,
        },
      });
    } catch (dbErr: any) {
      // Non-fatal: the URL is still returned to the caller; they can still submit the application
      logger.warn('Could not persist CV metadata to candidate record after upload: %s', dbErr?.message);
    }

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mime: file.mimetype
    });
  } catch (error: any) {
    logger.error('CV Upload error:', error);
    res.status(error.message?.startsWith('Unsupported file format') ? 400 : 500).json({ error: error.message || 'Failed to upload CV' });
  }
});


// DELETE /api/upload/cv/:publicId
// Used if the candidate uploads a new CV and wants to delete the old one from Cloudinary
router.delete('/cv/:publicId', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  try {
    // Only allow deletion if the publicId starts with candidate's folder & ID
    // (Basic security check so they can't delete other people's files)
    const publicId = req.params.publicId;
    
    // Since Cloudinary public_ids include the folder, we need to decode if it was URL encoded, 
    // or just pass it straight through if the frontend sends it accurately.
    const decodedPublicId = decodeURIComponent(publicId as string);

    if (!decodedPublicId.startsWith('candidates/cv/' + req.user!.candidateId)) {
      res.status(403).json({ error: 'Forbidden. You can only delete your own CVs.' });
      return;
    }

    await deleteCloudinaryAsset(decodedPublicId, 'raw');
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete CV error:', error);
    res.status(500).json({ error: 'Failed to delete old CV' });
  }
});

// POST /api/upload/documents
// Candidate uploads multiple supporting documents
router.post('/documents', requireAuth, requireRole('CANDIDATE'), upload.array('documents', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No documents provided' });
      return;
    }
    
    for (const file of files) {
      validateMime(file.mimetype);
    }
    
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked' });
      return;
    }

    const timestamp = Date.now();
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const publicId = `${candidateId}_doc_${timestamp}_${i}`;
      
      const result = await uploadRawBuffer(file.buffer, 'candidates/documents', publicId);
      
      results.push({
        url: result.secure_url,
        publicId: result.public_id,
        name: file.originalname,
        mime: file.mimetype
      });
    }

    res.json(results);
  } catch (error: any) {
    logger.error('Documents Upload error:', error);
    res.status(error.message?.startsWith('Unsupported file format') ? 400 : 500).json({ error: error.message || 'Failed to upload documents' });
  }
});

// POST /api/upload/document
// Recruiter uploads a hospital verification document for their own hospital
router.post('/document', requireAuth, requireRole('RECRUITER'), upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No document file provided' });
      return;
    }
    
    validateMime(file.mimetype);

    const { hospitalId, type } = req.body;
    if (!hospitalId) {
      res.status(400).json({ error: 'hospitalId is required' });
      return;
    }
    if (!req.user!.hospitalId || String(hospitalId) !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden. You can only upload documents for your own hospital.' });
      return;
    }

    const docType = type || 'verification';
    const timestamp = Date.now();
    const publicId = `${hospitalId}_${docType}_${timestamp}`;
    
    const result = await uploadRawBuffer(file.buffer, 'hospitals/documents', publicId);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mime: file.mimetype
    });
  } catch (error: any) {
    logger.error('Document Upload error:', error);
    res.status(error.message?.startsWith('Unsupported file format') ? 400 : 500).json({ error: error.message || 'Failed to upload document' });
  }
});

export default router;
