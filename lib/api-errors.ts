/**
 * Generic server error normalizer retained for legacy imports. Database details
 * belong in Django logs; this frontend never depends on Prisma or MongoDB.
 */
export function apiErrorResponse(route: string, error: unknown): Response {
  if (error instanceof Response) return error;
  console.error('[api/' + route + ']', error);
  const message = error instanceof Error ? error.message : String(error);

  if (/connection|unavailable|timeout|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return Response.json(
      { error: 'The service is temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }
  if (/duplicate|unique constraint/i.test(message)) {
    return Response.json({ error: 'This record already exists. Check the submitted values.' }, { status: 409 });
  }
  return Response.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
}
