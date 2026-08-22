import { clearSessionCookie } from './_lib/session';

export const onRequestGet: PagesFunction = async () => {
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin/login', 'Set-Cookie': clearSessionCookie() },
  });
};
