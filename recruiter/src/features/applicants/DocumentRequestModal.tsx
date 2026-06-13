import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export function DocumentRequestModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [docs, setDocs] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const docList = docs
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (docList.length === 0) return;

    setLoading(true);
    try {
      await onSubmit({
        requestedDocumentList: docList,
        documentRequestNote: note,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Documents</DialogTitle>
          <DialogDescription>
            Ask the candidate to upload specific documents. They will be notified via email and
            in-app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Required Documents (comma separated)</label>
            <Textarea
              required
              placeholder="e.g. Passport, Medical License, Recommendation Letter"
              value={docs}
              onChange={(e) => setDocs(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Note to Candidate (Optional)</label>
            <Textarea
              placeholder="Any specific instructions for uploading..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !docs.trim()}>
              {loading ? "Sending..." : "Request Documents"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
