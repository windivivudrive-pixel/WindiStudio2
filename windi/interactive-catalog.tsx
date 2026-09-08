'use client';

import React, { useState } from 'react';
import type { WindiResource } from '@/lib/windi-data';
import { ResourceGrid } from './ui/resource-card';
import { AppWindowModal } from './ui/app-window-modal';

export function InteractiveCatalog({ resources }: { resources: WindiResource[] }) {
  const [selectedResource, setSelectedResource] = useState<WindiResource | null>(null);

  return (
    <>
      <ResourceGrid resources={resources} onOpen={(res) => setSelectedResource(res)} />
      {selectedResource && (
        <AppWindowModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </>
  );
}
