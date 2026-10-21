import { createContext, useContext } from 'react';

// Stand-in user for the "View Public Page" preview. Sections gate restricted
// content on role 0, so rendering them with this user shows exactly what a
// public visitor sees, regardless of the logged-in user's real role.
export const PUBLIC_PREVIEW_USER = Object.freeze({ role_id: 0 });

// Lets components that don't receive `user` (e.g. ExportMenu, which reads the
// role from localStorage) know they are rendering inside the public preview.
export const PublicPreviewContext = createContext(false);

export const useIsPublicPreview = () => useContext(PublicPreviewContext);

// Pages reached by navigating out of the preview (e.g. Outreach cards) carry
// the preview in the URL so it survives the route change and a refresh.
export const PREVIEW_PARAM = 'preview';
export const PREVIEW_VALUE = 'public';
export const PREVIEW_QUERY = `?${PREVIEW_PARAM}=${PREVIEW_VALUE}`;

export const isPreviewSearch = (searchParams) =>
  searchParams.get(PREVIEW_PARAM) === PREVIEW_VALUE;
