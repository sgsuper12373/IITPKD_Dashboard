import { lazy } from 'react';

// Wraps React.lazy with one retry on transient dynamic-import failures
// (flaky network, brief 404 between deploys). If the second attempt also
// fails, the rejection propagates to ChunkErrorBoundary, which triggers a
// hard reload to pick up a fresh index.html with the current chunk hashes.
const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          factory().then(resolve).catch(() => reject(err));
        }, 400);
      });
    })
  );

export default lazyWithRetry;
