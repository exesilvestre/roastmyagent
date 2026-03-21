"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./app-toast.css";

type AppToastProviderProps = {
  children: ReactNode;
};

export function AppToastProvider({ children }: AppToastProviderProps) {
  return (
    <>
      {children}
      <ToastContainer
        className="appToast_container"
        position="bottom-right"
        autoClose={2800}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable={false}
        theme="dark"
        limit={4}
        toastStyle={{ margin: 0 }}
      />
    </>
  );
}
