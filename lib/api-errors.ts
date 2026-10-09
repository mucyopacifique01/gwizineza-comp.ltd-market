/** Shared API error helper. Internal details are kept in server logs. */
export function apiErrorResponse(route: string, error: unknown): Response {
  if (error instanceof Response) return error;
  console.error('[api/' + route + ']', error);
  return Response.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}
