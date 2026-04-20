import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
}

export function FileUpload({ onFileSelect, accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt', maxSizeMb = 50, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`Arquivo muito grande. Máximo: ${maxSizeMb}MB`);
      return;
    }
    setSelected(file);
    onFileSelect(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint, Imagens — máx. {maxSizeMb}MB</p>
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {selected && (
        <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="flex-1 truncate">{selected.name}</span>
          <span className="text-muted-foreground whitespace-nowrap">{(selected.size / 1024 / 1024).toFixed(2)} MB</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelected(null); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
