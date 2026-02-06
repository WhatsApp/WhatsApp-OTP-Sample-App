import {get, post, ApiResponse} from './ApiClient';

export async function requestOtp(phoneNumber: string): Promise<ApiResponse> {
  const cleanedPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
  return get(`/otp/${cleanedPhoneNumber}/`);
}

export async function verifyOtp(
  phoneNumber: string,
  code: string,
): Promise<ApiResponse> {
  const cleanedPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
  return post(`/otp/${cleanedPhoneNumber}/`, {code});
}
