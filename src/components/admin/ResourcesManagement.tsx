"use client";

import { useState, useRef, useEffect } from "react";
import { storage, firestore } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, Folder, Plus, ChevronRight, Home, Trash2, Edit2 } from "lucide-react";
import { getNodes } from "@/app/resources/_lib/resourcesDb";
import type { ResourceNode } from "@/app/resources/_lib/types";

export default function ResourcesManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentFolder, setCurrentFolder] = useState<{ id: string | null; name: string }>({ id: null, name: "Root" });
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
  const [nodes, setNodes] = useState<ResourceNode[]>([]);
  const [loading, setLoading] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // For rename
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const loadNodes = async (parentId: string | null) => {
    setLoading(true);
    try {
      const data = await getNodes(parentId);
      setNodes(data);
    } catch (err) {
      console.error("Failed to load nodes", err);
      toast({ variant: "destructive", title: "Error", description: "Could not load folder contents." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNodes(currentFolder.id);
  }, [currentFolder.id]);

  const handleNavigate = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setPath([{ id: null, name: "Root" }]);
    } else {
      const existingIdx = path.findIndex(p => p.id === folderId);
      if (existingIdx >= 0) {
        setPath(path.slice(0, existingIdx + 1));
      } else {
        setPath([...path, { id: folderId, name: folderName }]);
      }
    }
    setCurrentFolder({ id: folderId, name: folderName });
  };

  const handleCreateFolder = async () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName?.trim()) return;

    try {
      await addDoc(collection(firestore, "resourceNodes"), {
        type: 'folder',
        name: folderName.trim(),
        parentId: currentFolder.id,
        createdAt: Date.now()
      });
      toast({ title: "Folder created", description: `"${folderName}" has been created.` });
      loadNodes(currentFolder.id);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to create folder." });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "Invalid file", description: "Please upload a PDF file." });
      return;
    }

    let fileName = file.name.replace(/\.pdf$/i, "");
    const promptName = prompt("Enter file name:", fileName);
    if (!promptName?.trim()) return;
    fileName = promptName.trim();

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `resources/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      const pdfUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
          (error) => reject(error),
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
        );
      });

      await addDoc(collection(firestore, "resourceNodes"), {
        type: 'file',
        name: fileName,
        parentId: currentFolder.id,
        pdfUrl,
        createdAt: Date.now()
      });

      toast({ title: "File uploaded", description: `"${fileName}" has been added.` });
      loadNodes(currentFolder.id);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Upload failed." });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (node: ResourceNode) => {
    if (node.type === 'folder') {
      const confirm = window.confirm(`Are you sure you want to delete the folder "${node.name}"? Ensure it is empty!`);
      if (!confirm) return;
    } else {
      const confirm = window.confirm(`Delete file "${node.name}"?`);
      if (!confirm) return;
    }

    try {
      await deleteDoc(doc(firestore, "resourceNodes", node.id));
      toast({ title: "Deleted", description: `"${node.name}" has been deleted.` });
      loadNodes(currentFolder.id);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Deletion failed." });
    }
  };

  const handleRenameSave = async (node: ResourceNode) => {
    if (!editName.trim() || editName.trim() === node.name) {
      setEditingNodeId(null);
      return;
    }
    try {
      await updateDoc(doc(firestore, "resourceNodes", node.id), { name: editName.trim() });
      toast({ title: "Renamed", description: "Successfully renamed." });
      setEditingNodeId(null);
      loadNodes(currentFolder.id);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Rename failed." });
    }
  };

  return (
    <Card className="bg-[#1e1f22]/50 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>File Manager</CardTitle>
          <CardDescription>Organize your resources into folders and upload PDFs.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateFolder} className="bg-black/20 border-zinc-700">
            <Plus className="w-4 h-4 mr-2" /> New Folder
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload PDF
          </Button>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
        </div>
      </CardHeader>
      <CardContent>
        {isUploading && (
          <div className="mb-4 space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Uploading file...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5 bg-zinc-800" />
          </div>
        )}

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 p-3 bg-black/20 rounded-lg overflow-x-auto border border-zinc-800">
          <button onClick={() => handleNavigate(null, "Root")} className="text-zinc-400 hover:text-white flex items-center shrink-0">
            <Home className="w-4 h-4" />
          </button>
          {path.slice(1).map((crumb, idx) => (
            <div key={crumb.id || idx} className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-4 h-4 text-zinc-600" />
              <button onClick={() => handleNavigate(crumb.id, crumb.name)} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Node List */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
          ) : nodes.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
              This folder is empty. Create a folder or upload a PDF.
            </div>
          ) : (
            nodes.map(node => (
              <div key={node.id} className="group flex items-center justify-between p-3 bg-black/20 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  {node.type === 'folder' ? (
                    <Folder className="w-5 h-5 text-yellow-500 shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                  )}
                  
                  {editingNodeId === node.id ? (
                    <Input 
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSave(node);
                        if (e.key === 'Escape') setEditingNodeId(null);
                      }}
                      onBlur={() => handleRenameSave(node)}
                      className="h-7 text-sm bg-black/40 border-indigo-500"
                    />
                  ) : (
                    <span 
                      className={`text-sm font-medium truncate ${node.type === 'folder' ? 'cursor-pointer hover:text-indigo-300 transition-colors' : 'text-zinc-300'}`}
                      onClick={() => node.type === 'folder' && handleNavigate(node.id, node.name)}
                    >
                      {node.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => {
                    setEditingNodeId(node.id);
                    setEditName(node.name);
                  }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => handleDelete(node)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
