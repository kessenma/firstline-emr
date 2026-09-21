import React, { useState } from "react";
import { Table } from "@/components/ui/Table/Table";
import { Button } from "@/components/ui/button";
import { Loader2, UserRoundCheck, UserRoundMinus } from "lucide-react";
import { useAdminManagementViewModel } from "./AdminManagementViewModel";
import type { User } from "@/db/schema/users";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableColumn } from "@/components/ui/Table/types";

export default function AdminManagementView() {
  const {
    adminsData,
    handleRemoveAdmin,
    handleAddAdmin,
    searchUsers,
    searchResults,
    setSearchQuery,
  } = useAdminManagementViewModel();

  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  const columns: TableColumn<User>[] = [
    {
      key: "firstName",
      id: "firstName",
      header: "First Name",
      width: "w-32",
    },
    {
      key: "lastName",
      id: "lastName",
      header: "Last Name",
      width: "w-32",
    },
    {
      key: "email",
      id: "email",
      header: "Email",
      width: "w-48",
    },
    {
      key: "createdAt",
      id: "createdAt",
      header: "Start Date",
      width: "w-40",
      render: (value) => new Date(value as string).toLocaleDateString("en-US"),
    },
    {
      key: "actions",
      id: "actions",
      header: "Actions",
      render: (_value, admin) => (
        <Button
          size="sm"
          onClick={() => handleRemoveAdmin(admin.id)}
          variant={"destructive"}
        >
          <UserRoundMinus className="w-5 h-5 mr-2" />
          Remove
        </Button>
      ),
      width: "w-32",
    },
  ];

  if (!adminsData || adminsData.length === 0) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
        <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
          <DialogTrigger asChild>
            <Button>Add Admin</Button>
          </DialogTrigger>
          <DialogContent className="shadow-sm">
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search by email"
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className=""
              />
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between items-center"
                >
                  <span>{user.email}</span>
                  <Button
                    onClick={() => {
                      handleAddAdmin(user.id);
                      setIsAddAdminOpen(false);
                    }}
                    variant={"default"}
                  >
                    <UserRoundCheck className="w-5 h-5 mr-2" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg overflow-hidden border border-border">
        <Table
          data={adminsData}
          columns={columns}
          backgroundColor="background"
          textColor="foreground"
          borderColor="border"
          headerBackgroundColor="muted"
          headerTextColor="muted-foreground"
          hoverBackgroundColor="muted/50"
          hoverTextColor="foreground"
          stickyHeader={true}
        />
      </div>
    </div>
  );
}
