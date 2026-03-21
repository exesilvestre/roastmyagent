import { toast as toastify, type ToastOptions } from "react-toastify";

const base: ToastOptions = {};

export const appToast = {
  success: (message: string) => toastify.success(message, base),
  error: (message: string) => toastify.error(message, base),
};
