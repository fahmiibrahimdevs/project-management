import Swal from "sweetalert2";

// Global SweetAlert2 Toast Configuration
export const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
  customClass: {
    popup: "rounded-2xl shadow-xl border border-slate-100 font-sans text-xs",
  },
});

// Toast notifications
export const notifySuccess = (title: string, text?: string) => {
  return Toast.fire({
    icon: "success",
    title,
    text,
  });
};

export const notifyError = (title: string, text?: string) => {
  return Toast.fire({
    icon: "error",
    title,
    text,
  });
};

export const notifyWarning = (title: string, text?: string) => {
  return Toast.fire({
    icon: "warning",
    title,
    text,
  });
};

export const notifyInfo = (title: string, text?: string) => {
  return Toast.fire({
    icon: "info",
    title,
    text,
  });
};

// Modal Alerts
export const showAlert = (options: {
  icon?: "success" | "error" | "warning" | "info" | "question";
  title: string;
  text?: string;
  html?: string;
  confirmButtonText?: string;
}) => {
  return Swal.fire({
    icon: options.icon || "info",
    title: options.title,
    text: options.text,
    html: options.html,
    confirmButtonText: options.confirmButtonText || "Tutup",
    customClass: {
      popup: "rounded-2xl shadow-2xl border border-slate-200 font-sans p-6",
      title: "text-base font-bold text-slate-900",
      htmlContainer: "text-xs text-slate-600 leading-relaxed",
      confirmButton:
        "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors",
    },
    buttonsStyling: false,
  });
};

// Confirmation Dialogs (e.g. Delete, Uncheck, Cancel)
export const showConfirm = async (options: {
  title: string;
  text?: string;
  html?: string;
  icon?: "warning" | "question" | "info";
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDanger?: boolean;
}): Promise<boolean> => {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    html: options.html,
    icon: options.icon || "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || "Ya, Lanjutkan",
    cancelButtonText: options.cancelButtonText || "Batal",
    reverseButtons: true,
    customClass: {
      popup: "rounded-2xl shadow-2xl border border-slate-200 font-sans p-6",
      title: "text-base font-bold text-slate-900",
      htmlContainer: "text-xs text-slate-600 leading-relaxed",
      confirmButton: options.isDanger
        ? "px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors ml-2"
        : "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors ml-2",
      cancelButton:
        "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors",
    },
    buttonsStyling: false,
  });

  return result.isConfirmed;
};

export default Swal;
