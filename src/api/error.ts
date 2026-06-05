import type { AxiosError } from "axios";

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const axiosError = error as AxiosError;
  const responseData = axiosError.response?.data as any;

  if (responseData?.error?.message) {
    return String(responseData.error.message);
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof axiosError.message === "string" && axiosError.message !== "Request failed with status code 500") {
    return axiosError.message;
  }

  if (typeof (error as any).message === "string") {
    return String((error as any).message);
  }

  return fallback;
}
