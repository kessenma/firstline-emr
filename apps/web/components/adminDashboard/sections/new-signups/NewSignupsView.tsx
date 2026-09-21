// apps/web/components/auth/adminDashboard/sections/NewSignupsView.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  UserRoundCheck,
  UserRoundMinus,
  Loader2,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { RoleIcon } from "@/components/ui/RoleIcon";
import InfiniteScroll from "@/components/ui/infiniteScroll";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table } from "@/components/ui/Table/Table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNewSignupsViewModel, User } from "./NewSignupsViewModel";
import { MedicalLicenseModal } from "@/components/adminDashboard/MedicalLicenseModal";
import { SessionExpiredModal } from "@/components/adminDashboard/SessionExpiredModal";
import { motion } from "framer-motion";

interface NewSignupsViewProps {
  isDialog?: boolean;
}

export default function NewSignupsView({ isDialog }: NewSignupsViewProps) {
  const {
    newSignups,
    loadingNewSignups,
    hasMoreNewSignups,
    nextNewSignups,
    selectedUsers,
    missions,
    selectedMissionId,
    setSelectedMissionId,
    handleBulkAction,
    handleCheckboxChange,
    isCountryVisible,
    isDoctorSpecialtyVisible,
    toggleCountryVisibility,
    toggleDoctorSpecialtyVisibility,
    isSessionExpired,
    setIsSessionExpired,
    handleSessionRestored,
  } = useNewSignupsViewModel();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Medical license modal state
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseModalData, setLicenseModalData] = useState<{
    licenses?: Array<{
      specialty: string;
      signedUrl: string;
      uploadedAt?: Date;
    }>;
    userName?: string;
    loading: boolean;
    error?: string;
  }>({ loading: false });

  const handleViewMedicalLicense = async (user: User) => {
    setIsLicenseModalOpen(true);
    setLicenseModalData({ loading: true });

    try {
      const response = await fetch(
        `/api/admin/get-medical-license?userId=${user.id}`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        setLicenseModalData({
          loading: false,
          error: errorData.error || "Failed to load medical licenses",
        });
        return;
      }

      const data = await response.json();
      setLicenseModalData({
        licenses: data.licenses,
        userName: data.userName,
        loading: false,
      });
    } catch (error) {
      setLicenseModalData({
        loading: false,
        error: "Failed to load medical licenses",
      });
    }
  };

  const columns = [
    {
      key: "select",
      header: "",
      render: (value: any, user: User) => (
        <Checkbox
          checked={selectedUsers.includes(user.id?.toString() || "")}
          onCheckedChange={() =>
            handleCheckboxChange(user.id?.toString() || "")
          }
        />
      ),
      width: "40px",
    },
    {
      key: "name",
      header: "Name",
      render: (value: any, user: User) => `${user.firstName} ${user.lastName}`,
    },
    { key: "email", header: "Email" },
    { key: "accountType", header: "User Type" },
    {
      key: "doctorSpecialty",
      header: "Doctor Specialty",
      hidden: !isDoctorSpecialtyVisible,
    },
    {
      key: "countries",
      header: "Country",
      hidden: !isCountryVisible,
    },
    {
      key: "medicalLicense",
      header: "Medical License",
      render: (value: any, user: User) => {
        if (user.accountType !== "Doctor") {
          return <span className="text-muted-foreground">N/A</span>;
        }
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewMedicalLicense(user)}
            className="flex items-center"
          >
            View License
          </Button>
        );
      },
      width: "150px",
    },
  ];

  // Mobile card render function
  const renderMobileCard = (user: User, index: number) => (
    <motion.div
      key={user.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="overflow-hidden shadow-sm border-2">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Checkbox
              checked={selectedUsers.includes(user.id?.toString() || "")}
              onCheckedChange={() =>
                handleCheckboxChange(user.id?.toString() || "")
              }
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-semibold text-base truncate">
                  {user.firstName} {user.lastName}
                </h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground break-all">
                    {user.email}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <RoleIcon
                    accountType={user.accountType}
                    className="h-4 w-4 flex-shrink-0"
                  />
                  <span className="font-medium">{user.accountType}</span>
                </div>

                {user.doctorSpecialty && (
                  <div className="text-xs text-muted-foreground">
                    Specialty: {user.doctorSpecialty}
                  </div>
                )}

                {user.countries && user.countries.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Country: {user.countries.join(", ")}
                  </div>
                )}
              </div>

              {user.accountType === "Doctor" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewMedicalLicense(user)}
                  className="mt-3 w-full"
                >
                  View Medical License
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="bg-background space-y-4">
      <SessionExpiredModal
        isOpen={isSessionExpired}
        onClose={() => setIsSessionExpired(false)}
        onSuccessfulLogin={handleSessionRestored}
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-stretch sm:items-center mb-4 gap-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={selectedMissionId} onValueChange={setSelectedMissionId}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="No mission assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No mission assignment</SelectItem>
              {missions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} ({m.country})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => handleBulkAction("approve-users")}
            variant="outline"
            disabled={selectedUsers.length === 0}
            className="w-full sm:w-auto"
          >
            <UserRoundCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Approve Selected</span>
          </Button>
        </div>

        <Button
          onClick={() => handleBulkAction("deny-users")}
          variant="outline"
          disabled={selectedUsers.length === 0}
          className="w-full sm:w-auto"
        >
          <UserRoundMinus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="text-sm sm:text-base">Deny Selected</span>
        </Button>
      </div>

      {isMobile ? (
        // Mobile view with cards
        <div className="space-y-3">
          <InfiniteScroll
            dataLength={newSignups.length}
            next={nextNewSignups}
            hasMore={!!hasMoreNewSignups}
            isLoading={loadingNewSignups}
          >
            {newSignups.map((user, index) => renderMobileCard(user, index))}
          </InfiniteScroll>
        </div>
      ) : (
        // Desktop view with table
        <ScrollArea className="w-full rounded-md">
          <div className="w-max min-w-full">
            <div className="flex justify-end mb-4 space-x-2">
              <Button
                onClick={toggleCountryVisibility}
                variant="outline"
                size="sm"
              >
                {isCountryVisible ? "Hide Country" : "Show Country"}
              </Button>
              <Button
                onClick={toggleDoctorSpecialtyVisibility}
                variant="outline"
                size="sm"
              >
                {isDoctorSpecialtyVisible
                  ? "Hide Doctor Specialty"
                  : "Show Doctor Specialty"}
              </Button>
            </div>
            <InfiniteScroll
              dataLength={newSignups.length}
              next={nextNewSignups}
              hasMore={!!hasMoreNewSignups}
              isLoading={loadingNewSignups}
            >
              <Table
                data={newSignups}
                columns={columns}
                backgroundColor="card"
                textColor="foreground"
                borderColor="border"
                headerBackgroundColor="card"
                headerTextColor="muted-foreground"
                hoverBackgroundColor="muted"
                hoverTextColor="foreground"
                stickyHeader={true}
              />
            </InfiniteScroll>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {loadingNewSignups && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      )}
      {!hasMoreNewSignups && newSignups.length > 0 && (
        <p className="text-center py-4 text-sm text-muted-foreground">
          No more new signups to load.
        </p>
      )}

      {/* Medical License Modal */}
      <MedicalLicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => {
          setIsLicenseModalOpen(false);
          setLicenseModalData({ loading: false });
        }}
        licenses={licenseModalData.licenses}
        userName={licenseModalData.userName}
        isLoading={licenseModalData.loading}
        error={licenseModalData.error}
      />
    </div>
  );
}
