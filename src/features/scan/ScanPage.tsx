import { useRef, type DragEvent, type ChangeEvent } from 'react';
import { type User } from 'firebase/auth';
import { useScan } from './useScan';

export default function ScanPage({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const { phase, submitScan, reset } = useScan(user);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    submitScan(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isProcessing = ['uploading', 'submitting', 'pending'].includes(phase.type);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">iCheckLungs</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={onSignOut}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-xl space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Lung X-ray Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">Upload a chest X-ray image for AI analysis</p>
          </div>

          {/* Upload zone */}
          {(phase.type === 'idle' || phase.type === 'failed') && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <UploadIcon />
              <p className="text-sm font-medium text-gray-700">Drop image here or click to upload</p>
              <p className="text-xs text-gray-400">JPEG, PNG supported</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
            </div>
          )}

          {/* Processing states */}
          {isProcessing && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {'previewUrl' in phase && (
                <img src={phase.previewUrl} alt="X-ray preview" className="w-full object-contain max-h-72 bg-black" />
              )}
              <div className="p-6 flex flex-col items-center gap-3">
                <Spinner />
                <div className="text-center">
                  <p className="font-medium text-gray-900">{phaseLabel(phase.type)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {phase.type === 'pending' && 'This may take up to a minute…'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {phase.type === 'done' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden space-y-0">
              <img src={phase.previewUrl} alt="X-ray" className="w-full object-contain max-h-72 bg-black" />
              <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckIcon />
                <h3 className="font-semibold text-gray-900">Analysis complete</h3>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Confidence</p>
                <p className="text-sm text-gray-700">{phase.confidence}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Findings</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{phase.findings}</p>
              </div>

              <button
                onClick={reset}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Analyse another image
              </button>
              </div>
            </div>
          )}

          {/* Error */}
          {phase.type === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <ErrorIcon />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Analysis failed</p>
                <p className="text-sm text-red-600 mt-0.5">{phase.message}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function phaseLabel(type: string) {
  if (type === 'uploading') return 'Uploading image…';
  if (type === 'submitting') return 'Submitting for analysis…';
  if (type === 'pending') return 'Analysing X-ray…';
  return '';
}

function Spinner() {
  return (
    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  );
}

function UploadIcon() {
  return (
    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
      <svg className="w-3 h-3 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
      </svg>
    </div>
  );
}
