"use client";

import { useState, useRef } from "react";
import { storage, firestore } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import type { InstituteId } from "@/app/resources/_lib/types";

const INSTITUTES: { id: InstituteId; label: string }[] = [
  { id: "ALLEN", label: "ALLEN" },
  { id: "AAKASH", label: "AAKASH" },
  { id: "PHYSICS_WALLAH", label: "Physics Wallah" },
  { id: "CAREER_WILL", label: "Career Will" },
];

const SUBJECTS = ["Physics", "Chemistry", "Biology", "Mathematics"];

interface FormState {
  institute: InstituteId | "";
  subject: string;
  displayName: string;
  chapterName: string;
  topicName: string;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  institute: "",
  subject: "",
  displayName: "",
  chapterName: "",
  topicName: "",
  sortOrder: "1",
};

export default function ResourcesManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "done">("idle");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select a PDF file." });
      return;
    }
    setSelectedFile(file);
    // Auto-fill displayName from filename if empty
    if (file && !form.displayName) {
      setForm(f => ({ ...f, displayName: file.name.replace(/\.pdf$/i, "") }));
    }
  }

  function isValid() {
    return (
      form.institute !== "" &&
      form.subject.trim() !== "" &&
      form.displayName.trim() !== "" &&
      selectedFile !== null
    );
  }

  async function handleUpload() {
    if (!isValid() || !selectedFile) return;

    setStatus("uploading");
    setUploadProgress(0);

    try {
      // 1. Upload PDF to Firebase Storage
      const storagePath = `resources/${form.institute}/${form.subject}/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      const pdfUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Save metadata to Firestore `resources` collection
      setStatus("saving");
      const docData: Record<string, unknown> = {
        institute: form.institute,
        subject: form.subject.trim(),
        displayName: form.displayName.trim(),
        pdfUrl,
        sortOrder: parseInt(form.sortOrder, 10) || 1,
        createdAt: serverTimestamp(),
      };
      if (form.chapterName.trim()) docData.chapterName = form.chapterName.trim();
      if (form.topicName.trim()) docData.topicName = form.topicName.trim();

      await addDoc(collection(firestore, "resources"), docData);

      setStatus("done");
      toast({ title: "Module uploaded", description: `"${form.displayName}" is now live in Resources.` });

      // Reset after short delay
      setTimeout(() => {
        setForm(EMPTY_FORM);
        setSelectedFile(null);
        setUploadProgress(0);
        setStatus("idle");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 2000);

    } catch (err) {
      console.error("Upload failed:", err);
      toast({ variant: "destructive", title: "Upload failed", description: "Something went wrong. Please try again." });
      setStatus("idle");
    }
  }

  const isUploading = status === "uploading" || status === "saving";

  return (
    <Card className="bg-[#1e1f22]/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-400" />
          Upload Module
        </CardTitle>
        <CardDescription>
          Upload a PDF to Firebase Storage and add it to the Resources catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Institute + Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Institute</Label>
            <Select
              value={form.institute}
              onValueChange={(v) => setForm(f => ({ ...f, institute: v as InstituteId }))}
              disabled={isUploading}
            >
              <SelectTrigger className="bg-black/20 border-zinc-700">
                <SelectValue placeholder="Select institute" />
              </SelectTrigger>
              <SelectContent>
                {INSTITUTES.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select
              value={form.subject}
              onValueChange={(v) => setForm(f => ({ ...f, subject: v }))}
              disabled={isUploading}
            >
              <SelectTrigger className="bg-black/20 border-zinc-700">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label>Module Name</Label>
          <Input
            placeholder="e.g. Mechanics Module 1"
            value={form.displayName}
            onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
            disabled={isUploading}
            className="bg-black/20 border-zinc-700"
          />
        </div>

        {/* Chapter + Topic (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Chapter <span className="text-zinc-500 text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g. Kinematics"
              value={form.chapterName}
              onChange={(e) => setForm(f => ({ ...f, chapterName: e.target.value }))}
              disabled={isUploading}
              className="bg-black/20 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Topic <span className="text-zinc-500 text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g. Projectile Motion"
              value={form.topicName}
              onChange={(e) => setForm(f => ({ ...f, topicName: e.target.value }))}
              disabled={isUploading}
              className="bg-black/20 border-zinc-700"
            />
          </div>
        </div>

        {/* Sort Order */}
        <div className="space-y-2 w-32">
          <Label>Sort Order</Label>
          <Input
            type="number"
            min={1}
            value={form.sortOrder}
            onChange={(e) => setForm(f => ({ ...f, sortOrder: e.target.value }))}
            disabled={isUploading}
            className="bg-black/20 border-zinc-700"
          />
        </div>

        {/* File picker */}
        <div className="space-y-2">
          <Label>PDF File</Label>
          <div
            className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-zinc-700 bg-black/20 cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
            ) : (
              <Upload className="w-5 h-5 text-zinc-500 shrink-0" />
            )}
            <span className="text-sm text-zinc-400 truncate">
              {selectedFile ? selectedFile.name : "Click to select a PDF"}
            </span>
            {selectedFile && (
              <span className="ml-auto text-xs text-zinc-500 shrink-0">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {/* Progress bar */}
        {(status === "uploading" || status === "saving" || status === "done") && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>
                {status === "uploading" && "Uploading to Storage..."}
                {status === "saving" && "Saving to Firestore..."}
                {status === "done" && "Done!"}
              </span>
              {status === "uploading" && <span>{uploadProgress}%</span>}
            </div>
            <Progress
              value={status === "saving" ? 100 : status === "done" ? 100 : uploadProgress}
              className="h-1.5 bg-zinc-800"
            />
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleUpload}
          disabled={!isValid() || isUploading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {status === "uploading" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {status === "saving" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {status === "done" && <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />}
          {status === "idle" && <Upload className="w-4 h-4 mr-2" />}
          {status === "idle" && "Upload Module"}
          {status === "uploading" && `Uploading... ${uploadProgress}%`}
          {status === "saving" && "Saving metadata..."}
          {status === "done" && "Uploaded!"}
        </Button>

      </CardContent>
    </Card>
  );
}
