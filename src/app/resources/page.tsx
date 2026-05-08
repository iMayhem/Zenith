'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Folder, FileText, ChevronRight, Home, Loader2 } from 'lucide-react';
import { PdfViewer } from './_components/PdfViewer';
import { getNodes } from './_lib/resourcesDb';
import type { ResourceNode } from './_lib/types';

export default function ResourcesPage() {
  const [currentFolder, setCurrentFolder] = useState<{ id: string | null; name: string }>({ id: null, name: "Home" });
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Home" }]);
  const [nodes, setNodes] = useState<ResourceNode[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFile, setActiveFile] = useState<ResourceNode | null>(null);

  useEffect(() => {
    setLoading(true);
    getNodes(currentFolder.id)
      .then(setNodes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentFolder.id]);

  const handleNavigate = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setPath([{ id: null, name: "Home" }]);
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

  if (activeFile !== null) {
    return (
      <PdfViewer
        module={activeFile}
        onClose={() => setActiveFile(null)}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center p-2 bg-indigo-500/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Resources Library</h1>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl overflow-x-auto border border-white/10 shadow-inner">
          <button onClick={() => handleNavigate(null, "Home")} className="text-zinc-400 hover:text-white flex items-center shrink-0 transition-colors">
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

        {/* Node Grid */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : nodes.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border border-dashed border-white/10 rounded-2xl bg-white/5">
              This folder is empty. Check back later!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {nodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => node.type === 'folder' ? handleNavigate(node.id, node.name) : setActiveFile(node)}
                  className="flex flex-col items-start p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all text-left group gap-3"
                >
                  <div className={`p-3 rounded-xl ${node.type === 'folder' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    {node.type === 'folder' ? <Folder className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  </div>
                  <span className="font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                    {node.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
