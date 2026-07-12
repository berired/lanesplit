export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors?: Record<string, string[]>; formError?: string };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionFieldErrors<T>(fieldErrors: Record<string, string[]>): ActionResult<T> {
  return { success: false, fieldErrors };
}

export function actionFormError<T>(formError: string): ActionResult<T> {
  return { success: false, formError };
}
