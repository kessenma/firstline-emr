"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface AdminConfigContextType {
  analyticsPassphrase?: string;
}

const AdminConfigContext = createContext<AdminConfigContextType>({});

export const useAdminConfig = () => useContext(AdminConfigContext);

export const AdminConfigProvider = ({
  children,
  analyticsPassphrase,
}: {
  children: ReactNode;
  analyticsPassphrase?: string;
}) => {
  return (
    <AdminConfigContext.Provider value={{ analyticsPassphrase }}>
      {children}
    </AdminConfigContext.Provider>
  );
};
