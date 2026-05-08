'use client';

import { useState } from 'react';
import { firestore, storage } from '@/lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestFirebasePage() {
  const [firestoreStatus, setFirestoreStatus] = useState<string>('Not tested');
  const [storageStatus, setStorageStatus] = useState<string>('Not tested');
  const [testResults, setTestResults] = useState<string[]>([]);

  async function testFirestore() {
    setTestResults(prev => [...prev, '🔍 Testing Firestore access...']);
    try {
      const q = query(collection(firestore, 'resources'), limit(5));
      const snap = await getDocs(q);
      const count = snap.size;
      setFirestoreStatus(`✅ Success - Found ${count} documents`);
      setTestResults(prev => [...prev, `✅ Firestore: ${count} documents found`]);
      
      snap.forEach(doc => {
        const data = doc.data();
        setTestResults(prev => [...prev, `  📄 ${data.institute} - ${data.subject} - ${data.displayName}`]);
      });
    } catch (err: any) {
      setFirestoreStatus(`❌ Failed - ${err.message}`);
      setTestResults(prev => [...prev, `❌ Firestore error: ${err.message}`]);
    }
  }

  async function testStorage() {
    setTestResults(prev => [...prev, '🔍 Testing Storage access...']);
    try {
      const storageRef = ref(storage, 'resources');
      const result = await listAll(storageRef);
      const folderCount = result.prefixes.length;
      setStorageStatus(`✅ Success - Found ${folderCount} folders`);
      setTestResults(prev => [...prev, `✅ Storage: ${folderCount} institute folders found`]);
      
      result.prefixes.forEach(folderRef => {
        setTestResults(prev => [...prev, `  📁 ${folderRef.name}`]);
      });

      // Try to get a download URL from the first file if any
      if (result.items.length > 0) {
        const url = await getDownloadURL(result.items[0]);
        setTestResults(prev => [...prev, `  🔗 Sample URL: ${url.substring(0, 80)}...`]);
      }
    } catch (err: any) {
      setStorageStatus(`❌ Failed - ${err.message}`);
      setTestResults(prev => [...prev, `❌ Storage error: ${err.message}`]);
    }
  }

  async function runAllTests() {
    setTestResults([]);
    setFirestoreStatus('Testing...');
    setStorageStatus('Testing...');
    await testFirestore();
    await testStorage();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Firebase Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Firestore Status</h3>
                <p className="text-white text-sm">{firestoreStatus}</p>
              </div>
              <div className="p-4 bg-gray-900/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Storage Status</h3>
                <p className="text-white text-sm">{storageStatus}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={runAllTests} className="bg-indigo-600 hover:bg-indigo-700">
                Run All Tests
              </Button>
              <Button onClick={testFirestore} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                Test Firestore Only
              </Button>
              <Button onClick={testStorage} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                Test Storage Only
              </Button>
            </div>
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                {testResults.map((result, i) => (
                  <div key={i} className="text-gray-300">{result}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 text-sm space-y-3">
            <p>This page tests Firebase connectivity to diagnose permission issues.</p>
            
            <div className="space-y-2">
              <p className="font-semibold text-white">Expected Results:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Firestore: Should list resources documents</li>
                <li>Storage: Should list institute folders (ALLEN, AAKASH, etc.)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-white">If Tests Fail:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>"Missing or insufficient permissions" → Update Firebase Security Rules</li>
                <li>"storage/unauthorized" → Update Storage Rules</li>
                <li>See <code className="bg-gray-900 px-1 py-0.5 rounded">FIREBASE_RULES_SETUP.md</code> for instructions</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                Access this page at: <code className="bg-gray-900 px-1 py-0.5 rounded">http://localhost:3000/test-firebase</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
