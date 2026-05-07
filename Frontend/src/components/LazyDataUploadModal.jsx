import { lazy, Suspense } from 'react';

// DataUploadModal is a 35 kB component used by 26 route sections.
// Deferring it to a single shared chunk means the browser never downloads
// that code until the user actually clicks an upload button.
const DataUploadModal = lazy(() => import('./DataUploadModal'));

export default function LazyDataUploadModal(props) {
  // Skip even mounting the Suspense boundary until the modal is opened.
  // The chunk fetch is triggered at the moment isOpen first becomes true.
  if (!props.isOpen) return null;
  return (
    <Suspense fallback={null}>
      <DataUploadModal {...props} />
    </Suspense>
  );
}
