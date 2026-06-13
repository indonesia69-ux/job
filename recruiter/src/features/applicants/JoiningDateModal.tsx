import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function JoiningDateModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { joiningDate: string; joiningNote?: string }) => Promise<void>;
}) {
  const [joiningDate, setJoiningDate] = useState("");
  const [joiningNote, setJoiningNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        joiningDate: new Date(joiningDate).toISOString(),
        ...(joiningNote.trim() ? { joiningNote: joiningNote.trim() } : {}),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Joining Date</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Joining Date</label>
            <Input
              type="date"
              required
              value={joiningDate}
              onChange={(event) => setJoiningDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Joining Note</label>
            <Input
              value={joiningNote}
              onChange={(event) => setJoiningNote(event.target.value)}
              placeholder="Optional instructions for the candidate"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !joiningDate}>
              {loading ? "Saving..." : "Confirm Joining"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
