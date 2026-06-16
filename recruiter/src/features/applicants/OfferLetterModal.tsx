import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { uploadOfferLetter, updateApplicationStatus } from "@/lib/recruiterData";
import { toast } from "sonner";

export function OfferLetterModal({
  applicationId,
  isOpen,
  onClose,
  onSuccess,
}: {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      // 1. Upload to Cloudinary
      const { url, publicId } = await uploadOfferLetter(applicationId, file);

      // 2. Transition status to OfferSent with payload
      await updateApplicationStatus(applicationId, "OfferSent", {
        offerLetterUrl: url,
        offerLetterCloudinaryId: publicId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload offer letter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Offer Letter</DialogTitle>
          <DialogDescription>
            Upload a PDF offer letter. This will notify the candidate via email and allow them to
            Accept or Reject the offer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Offer Letter Document (PDF)</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <span className="text-sm text-muted-foreground truncate">
                {file ? file.name : "No file selected"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? "Sending..." : "Send Offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
