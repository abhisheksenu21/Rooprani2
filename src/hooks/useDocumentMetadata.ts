import { useEffect } from 'react';

interface MetadataOptions {
  title: string;
  description: string;
}

function updateMetaTag(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) {
    el.setAttribute('content', content);
  }
}

export function useDocumentMetadata({ title, description }: MetadataOptions) {
  useEffect(() => {
    document.title = title;
    updateMetaTag('meta[name="description"]', description);
    updateMetaTag('meta[property="og:title"]', title);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[name="twitter:title"]', title);
    updateMetaTag('meta[name="twitter:description"]', description);
  }, [title, description]);
}
