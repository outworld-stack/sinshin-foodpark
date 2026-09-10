// src/components/FileUploader.tsx
import { useState, useRef } from 'react';
import type { FileUploaderProps } from '#/types/shared/ui';
import { Upload } from 'reicon-react';

export function FileUploader({ onUploadComplete, initialImage, accept = "image/*", fileTypeText = "PNG, JPG, WEBP" }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(initialImage);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setProgress(0);
    setIsUploading(true);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          onUploadComplete(selectedFile.name);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-4">
      <div 
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-[#3a151c] rounded-xl p-6 text-center cursor-pointer hover:border-primary dark:hover:border-dark-primary transition"
      >
        {preview ? (
          <img src={preview} alt="پیش‌نمایش" className="max-h-48 mx-auto rounded-lg" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload size={40} />
            <span className="text-sm font-DanaMedium">کلیک کنید یا فایل را رها کنید</span>
            <span className="text-xs text-gray-400">{fileTypeText} (حداکثر ۲MB)</span>
          </div>
        )}
        <input type="file" ref={inputRef} className="hidden" onChange={handleFileChange} accept={accept} />
      </div>

      {isUploading && (
        <div className="w-full bg-gray-200 dark:bg-[#1a0a0e] rounded-full h-2.5 overflow-hidden">
          <div className="bg-primary dark:bg-dark-primary h-2.5 rounded-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      
      {file && !isUploading && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a0a0e] p-2 rounded-lg">
          <span className="truncate">{file.name}</span>
          <button onClick={() => { setFile(null); setPreview(undefined); }} className="text-red-400 hover:text-red-500">حذف</button>
        </div>
      )}
    </div>
  );
}