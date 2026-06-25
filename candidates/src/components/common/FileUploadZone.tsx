import { useRef } from "react";
import { UploadCloud, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CV_ACCEPT, fileToUploaded, type UploadedFile } from "@/lib/fileUpload";
import { LottiePlayer } from "./LottiePlayer";

type Props = {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  multiple?: boolean;
  title: string;
  hint: string;
};

export function FileUploadZone({ files, onChange, multiple = true, title, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list);
    try {
      const uploaded: UploadedFile[] = [];
      for (const f of picked) {
        uploaded.push(await fileToUploaded(f));
      }
      onChange(multiple ? [...files, ...uploaded] : uploaded.slice(0, 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read file");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT}
        multiple={multiple}
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-surface-2 px-6 py-10 text-center">
        {files.length === 0 ? (
          <LottiePlayer
            src="/rest_sent_flow.json"
            loop={false}
            className="mx-auto mb-2 h-12 w-12 sm:h-14 sm:w-14"
          />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        <Button
          variant="outline"
          className="mt-4"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
      </div>
      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-sm"
        >
          <span className="min-w-0 flex-1 truncate text-foreground">{f.name}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onChange(files.filter((_, idx) => idx !== i))}
            aria-label="Remove file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
