export interface FormDetailsInput {
  phone:string; borrowerIdentifier:string; unit:string; activityName:string; activityLocation:string; activityDescription:string;
  acknowledgement:{version:string;accepted:boolean};
}
export interface SavedFormDetails extends FormDetailsInput { acknowledgedAt:string }
export const ACKNOWLEDGEMENT_VERSION:string;
export const ACKNOWLEDGEMENT_TEXT:string;
export const FORM_LIMITS:Readonly<Record<'phone'|'borrowerIdentifier'|'unit'|'activityName'|'activityLocation'|'activityDescription',number>>;
export function emptyFormDetails():FormDetailsInput;
export function normalizeFormDetails(value:FormDetailsInput):FormDetailsInput;
export function validateFormDetails(value:unknown):Record<string,string>;
export function validSavedFormDetails(value:unknown):value is SavedFormDetails;
