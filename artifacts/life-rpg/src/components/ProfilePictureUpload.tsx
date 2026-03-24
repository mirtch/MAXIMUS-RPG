import { useRef, useState } from "react";
import { Camera } from "lucide-react";

interface ProfilePictureUploadProps {
  currentImage?: string | null;
  fallbackEmoji?: string;
  onImageChange: (dataUrl: string) => void;
  size?: "sm" | "md" | "lg";
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down to fit maxSize x maxSize
        if (width > height) {
          if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
        } else {
          if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const SIZES = {
  sm: "w-16 h-16 text-2xl",
  md: "w-24 h-24 text-4xl",
  lg: "w-32 h-32 text-5xl",
};

export function ProfilePictureUpload({ currentImage, fallbackEmoji = "⚔️", onImageChange, size = "md" }: ProfilePictureUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const displayImage = preview || currentImage;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await resizeImage(file, 300);
    setPreview(dataUrl);
    onImageChange(dataUrl);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`${SIZES[size]} rounded-full border-2 border-dashed border-muted-foreground/40 hover:border-primary flex items-center justify-center overflow-hidden transition-all bg-muted cursor-pointer group`}
      >
        {displayImage ? (
          <img src={displayImage} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span>{fallbackEmoji}</span>
        )}
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
