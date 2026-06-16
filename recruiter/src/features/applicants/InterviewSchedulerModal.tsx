import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function InterviewSchedulerModal({
  isOpen,
  onClose,
  onSubmit,
  isReschedule = false,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  isReschedule?: boolean;
  title?: string;
}) {
  const [date, setDate] = useState("");
  const [type, setType] = useState("Virtual");
  const [linkOrVenue, setLinkOrVenue] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const minDateTime = new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = new Date(date);
    if (Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
      toast.error("Choose a future date and time.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        interviewDate: new Date(date).toISOString(),
        interviewType: type,
        [type === "Virtual" ? "meetingLink" : "venue"]: linkOrVenue,
        interviewerName,
        interviewerEmail,
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
          <DialogTitle>
            {title || (isReschedule ? "Reschedule Interview" : "Schedule Interview")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Date & Time</label>
            <Input
              type="datetime-local"
              required
              min={minDateTime}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Virtual">Virtual</option>
              <option value="Physical">Physical</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {type === "Virtual" ? "Meeting Link" : "Venue"}
            </label>
            <Input
              required
              placeholder={
                type === "Virtual" ? "https://meet.google.com/..." : "123 Hospital Wing A..."
              }
              value={linkOrVenue}
              onChange={(e) => setLinkOrVenue(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Interviewer Name</label>
              <Input
                required
                placeholder="Dr. Smith"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Interviewer Email</label>
              <Input
                type="email"
                required
                placeholder="smith@hospital.com"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isReschedule ? "Reschedule" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
