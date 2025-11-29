"use client";
import type React from "react";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  Upload,
  Save,
  CalendarIcon,
  User,
  Mail,
  Lock,
  FileText,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site.config";

export interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  email: string;
  dateOfBirth: string;
  avatar?: string;
  aboutMe?: string;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  joinedDate: string;
  url?: string;
  isfollowing?: boolean;
  isfollower?: boolean;
  followRequestStatus?: "none" | "pending" | "accepted" | "declined";
}

interface ProfileSettingsProps {
  userData: UserData;
  onSave: (updatedData: UserData) => void;
}

let avatarUrl = "";

let avatarFile: File;

export function ProfileSettings({ userData, onSave }: ProfileSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<UserData>(userData);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  /**
   * Handle form input changes
   */
  const handleInputChange = (
    field: keyof UserData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle avatar file upload
   */
  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a preview URL for the uploaded image
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        avatar: previewUrl,
      }));
      // TODO: Implement actual file upload to server
      avatarFile = file;
    }
  };

  /**
   * Handle form submission
   */
  const handleSave = async () => {
    setIsLoading(true);
    const avatarForm = new FormData();
    avatarForm.append("avatar", avatarFile);
    if (avatarFile) {
      // TODO: Implement actual file upload to server and get the URL
      await fetch("api/upload-avatar", {
        method: "POST",
        body: avatarForm,
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Upload failed");
          }
          return res.json();
        })
        .then((data) => {
          avatarUrl = data.avatarUrl;
        })
        .catch((err) => {
          console.error(err);
        });
    }

    formData.avatar = avatarUrl || userData.avatar;
    formData.nickname = formData.nickname || userData.nickname;
    formData.aboutMe = formData.aboutMe || userData.aboutMe;
    formData.dateOfBirth = formData.dateOfBirth || userData.dateOfBirth;
    formData.firstName = formData.firstName || userData.firstName;
    formData.lastName = formData.lastName || userData.lastName;
    formData.email = formData.email || userData.email;
    formData.id = formData.id || userData.id;
    formData.joinedDate = formData.joinedDate || userData.joinedDate;
    if (formData.isPrivate === null) {
      formData.isPrivate = userData.isPrivate;
    }
    if (formData.followersCount === null) {
      formData.followersCount = userData.followersCount;
    }
    if (formData.followingCount === null) {
      formData.followingCount = userData.followingCount;
    }
    if (formData.postsCount === null) {
      formData.postsCount = userData.postsCount;
    }

    try {
      const res = await fetch(`${siteConfig.domain}/api/user/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = res.ok ? await res.json() : null;
      if (!res.ok) {
        const text = data?.message || (await res.text());
        throw new Error(text || "Failed to update profile");
      }
      onSave(data.user);
      setIsOpen(false);
      router.push(`/profile/${data.user.url}`);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset form to original data when dialog closes
   */
  const handleCancel = () => {
    setFormData(userData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-background/50 border-border/50 hover:bg-background/80 backdrop-blur-sm rounded-xl shadow-sm"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-full glass-panel border-border/50 shadow-2xl p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-2 border-b border-border/40 bg-background/40 backdrop-blur-md sticky top-0 z-10">
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Edit Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-6">
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-primary/20">
                  <AvatarImage
                    src={
                      formData.avatar?.startsWith("blob:")
                        ? formData.avatar
                        : formData.avatar
                        ? `${siteConfig.domain}/${formData.avatar}`
                        : `${siteConfig.domain}/${userData.avatar}`
                    }
                    alt="Profile avatar"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                    {formData.firstName[0]}
                    {formData.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="avatar-upload"
                  title="Change Avatar"
                />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Tap to change profile picture
              </p>
            </div>

            {/* Personal Information */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="text-foreground font-medium"
                  >
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="text-foreground font-medium"
                  >
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="nickname"
                  className="text-foreground font-medium"
                >
                  Nickname (Optional)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-bold">
                    @
                  </span>
                  <Input
                    id="nickname"
                    value={formData.nickname || ""}
                    onChange={(e) =>
                      handleInputChange("nickname", e.target.value)
                    }
                    placeholder="Enter a nickname"
                    className="pl-8 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="dateOfBirth"
                  className="text-foreground font-medium"
                >
                  Date of Birth
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background/50 border-border/50 hover:bg-background/80 rounded-xl h-11 pl-3",
                        !formData.dateOfBirth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formData.dateOfBirth ? (
                        format(new Date(formData.dateOfBirth), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-auto p-0 glass-panel border-border/50"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={
                        formData.dateOfBirth
                          ? new Date(formData.dateOfBirth)
                          : undefined
                      }
                      onSelect={(date: Date | undefined) =>
                        handleInputChange(
                          "dateOfBirth",
                          date instanceof Date && !isNaN(date.getTime())
                            ? // build YYYY-MM-DD from local date parts to avoid timezone shifts
                              `${date.getFullYear()}-${String(
                                date.getMonth() + 1
                              ).padStart(2, "0")}-${String(
                                date.getDate()
                              ).padStart(2, "0")}`
                            : ""
                        )
                      }
                      disabled={(date: Date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      captionLayout="dropdown"
                      className="bg-background/95 backdrop-blur-xl rounded-xl border border-border/50"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="aboutMe"
                  className="text-foreground font-medium"
                >
                  About Me (Optional)
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="aboutMe"
                    value={formData.aboutMe || ""}
                    onChange={(e) =>
                      handleInputChange("aboutMe", e.target.value)
                    }
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl resize-none min-h-[100px]"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4 pt-6 border-t border-border/40">
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="privacy-toggle"
                      className="text-foreground font-bold text-base"
                    >
                      Private Profile
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Only followers can see your posts
                    </p>
                  </div>
                </div>
                <Switch
                  id="privacy-toggle"
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) =>
                    handleInputChange("isPrivate", checked)
                  }
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-md pb-2 -mx-6 px-6 border-t border-border/40 mt-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 rounded-xl h-11 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 flex items-center gap-2 rounded-xl h-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
