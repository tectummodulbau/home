/**
 * /admin ohne weiteren Pfad führt auf die Leadliste. Die Zugriffsprüfung
 * übernimmt wie bei allen Seiten hier functions/admin/_middleware.ts.
 */
import { ADMIN_PAGES } from './_lib/theme';

export const onRequestGet: PagesFunction = async () =>
  new Response(null, { status: 302, headers: { Location: ADMIN_PAGES[0].href } });
