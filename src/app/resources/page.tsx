'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { InstituteSelector } from './_components/InstituteSelector';
import { SubjectList } from './_components/SubjectList';
import { ModuleList } from './_components/ModuleList';
import { PdfViewer } from './_components/PdfViewer';
import { getSubjects, getModules } from './_lib/resourcesDb';
import type { InstituteId, ResourceModule, FetchState } from './_lib/types';

export default function ResourcesPage() {
  const [selectedInstitute, setSelectedInstitute] = useState<InstituteId | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ResourceModule | null>(null);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [modules, setModules] = useState<ResourceModule[]>([]);

  const [subjectFetch, setSubjectFetch] = useState<FetchState>('idle');
  const [moduleFetch, setModuleFetch] = useState<FetchState>('idle');

  async function handleInstituteSelect(institute: InstituteId) {
    setSelectedInstitute(institute);
    setSelectedSubject(null);
    setActiveModule(null);
    setModules([]);
    setSubjectFetch('loading');
    try {
      const data = await getSubjects(institute);
      setSubjects(data);
      setSubjectFetch('success');
    } catch {
      setSubjectFetch('error');
    }
  }

  async function handleSubjectSelect(subject: string) {
    setSelectedSubject(subject);
    setActiveModule(null);
    setModuleFetch('loading');
    try {
      const data = await getModules(selectedInstitute!, subject);
      setModules(data);
      setModuleFetch('success');
    } catch {
      setModuleFetch('error');
    }
  }

  // PDF viewer takes over the full screen
  if (activeModule !== null) {
    return (
      <PdfViewer
        module={activeModule}
        onClose={() => setActiveModule(null)}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center p-2 bg-white/10 rounded-lg">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Resources</h1>
        </div>

        {/* Institute selector — always visible */}
        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
            Select Institute
          </p>
          <InstituteSelector
            selected={selectedInstitute}
            onSelect={handleInstituteSelect}
          />
        </section>

        {/* Two-column layout on desktop once an institute is selected */}
        {selectedInstitute !== null && (
          <div className="flex flex-col gap-6 md:flex-row md:gap-6">
            {/* Subjects sidebar */}
            <aside className="w-full md:w-48 shrink-0">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
                Subject
              </p>
              <SubjectList
                subjects={subjects}
                selected={selectedSubject}
                fetchState={subjectFetch}
                onSelect={handleSubjectSelect}
                onRetry={() => handleInstituteSelect(selectedInstitute)}
              />
            </aside>

            {/* Modules main area */}
            {selectedSubject !== null && (
              <main className="flex-1 min-w-0">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
                  Modules
                </p>
                <ModuleList
                  modules={modules}
                  fetchState={moduleFetch}
                  onSelect={setActiveModule}
                  onRetry={() => handleSubjectSelect(selectedSubject)}
                />
              </main>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
