"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site.config";

// Minimal inline icons to avoid external deps
function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}
const CalendarIcon = (props: { className?: string }) => (
  <Icon className={props.className} path="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
);
const Upload = (props: { className?: string }) => (
  <Icon className={props.className} path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 15V3" />
);
const Eye = (props: { className?: string }) => (
  <Icon className={props.className} path="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
);
const EyeOff = (props: { className?: string }) => (
  <Icon className={props.className} path="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.17 4.15M1 1l22 22M10.59 10.59a2 2 0 1 0 2.82 2.82" />
);
const ArrowLeft = (props: { className?: string }) => (
  <Icon className={props.className} path="M19 12H5m0 0 7-7M5 12l7 7" />
);

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | undefined;
  gender: string;
  nickname: string;
  aboutMe: string;
  avatar: File | null;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  general?: string;
}

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    dateOfBirth: undefined,
    gender: "",
    nickname: "",
    aboutMe: "",
    avatar: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }
    if (!isLogin) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = "Date of birth is required";
      } else {
        const today = new Date();
        const age = today.getFullYear() - formData.dateOfBirth.getFullYear();
        if (age < 13) newErrors.dateOfBirth = "You must be at least 13 years old to register";
      }
    }
    return newErrors;
  };

  const handleInputChange = (
    field: keyof FormData,
    value: string | Date | File | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value } as FormData));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, general: "Please select a valid image file" }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, general: "Image size must be less than 5MB" }));
        return;
      }
      handleInputChange("avatar", file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      if (isLogin) {
        await fetch(`${siteConfig.domain}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ identifier: formData.email, password: formData.password }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text();
              try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || "Login failed");
              } catch {
                if (text.includes('"error"')) {
                  const errorMatch = text.match(/"error"\s*:\s*"([^"]+)"/);
                  if (errorMatch) throw new Error(errorMatch[1]);
                }
                throw new Error(text || "Login failed");
              }
            }
            return res.json();
          })
          .then((data) => {
            if ((data as any).error) {
              setErrors({ general: (data as any).error });
            } else {
              router.push("/");
            }
          })
          .catch((err: any) => {
            console.error(err);
            setErrors((prev) => ({ ...prev, general: String(err.message || err) }));
          });
      } else {
        const avatarForm = new FormData();
        let avatarUrl = "";
        if (formData.avatar) {
          avatarForm.append("avatar", formData.avatar);
          await fetch(`${siteConfig.domain}/api/upload-avatar`, {
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
            .then((data) => (avatarUrl = (data as any).avatarUrl))
            .catch((err: any) => {
              console.error(err);
              setErrors((prev) => ({ ...prev, general: String(err.message || err) }));
            });
        } else {
          avatarUrl = "/uploads/default.jpg";
        }

        await fetch(`${siteConfig.domain}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.toISOString() : "",
            nickname: formData.nickname,
            aboutMe: formData.aboutMe,
            avatarUrl: avatarUrl,
            gender: formData.gender,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text();
              try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || "Registration failed");
              } catch {
                throw new Error(text || "Registration failed");
              }
            }
            try {
              const data = await res.json();
              return data;
            } catch {
              console.log("Registration successful but no JSON response");
              return { message: "Registration successful" } as any;
            }
          })
          .then(() => {
            setIsLogin(true);
            setFormData({
              email: formData.email,
              password: "",
              confirmPassword: "",
              firstName: "",
              lastName: "",
              dateOfBirth: undefined,
              gender: "",
              nickname: "",
              aboutMe: "",
              avatar: null,
            });
            setAvatarPreview("");
          })
          .catch((err: any) => {
            console.error(err);
            let errorMessage = String(err.message || err);
            if (errorMessage.includes("User already exists") || errorMessage.includes("Status Conflict")) {
              errorMessage = "An account with this email already exists. Please use a different email or try logging in.";
            } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
              errorMessage = "Registration service is currently unavailable. Please try again later.";
            }
            setErrors((prev) => ({ ...prev, general: errorMessage }));
          });
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch {
      setErrors({ general: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!forgotPasswordEmail) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      console.log("Password reset request for:", forgotPasswordEmail);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setErrors({ general: "Password reset instructions have been sent to your email." });
    } catch {
      setErrors({ general: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (value: string) => {
    const newIsLogin = value === "login";
    setIsLogin(newIsLogin);
    setErrors({});
    setIsForgotPassword(false);
    setForgotPasswordEmail("");
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      dateOfBirth: undefined,
      gender: "",
      nickname: "",
      aboutMe: "",
      avatar: null,
    });
    setAvatarPreview("");
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setForgotPasswordEmail("");
    setErrors({});
  };

  const formatDate = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-balance">
            {isForgotPassword ? "Reset Password" : "Welcome to Social Network"}
          </CardTitle>
          <CardDescription className="text-gray-500">
            {isForgotPassword
              ? "Enter your email address and we'll send you instructions to reset your password"
              : isLogin
              ? "Sign in to your account to continue"
              : "Create your account to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isForgotPassword ? (
            <div className="space-y-4">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={forgotPasswordEmail}
                    onChange={(e) => {
                      setForgotPasswordEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={cn(errors.email && "border-red-500")}
                    required
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>

                {errors.general && (
                  <p className={cn("text-sm text-center", errors.general.includes("sent") ? "text-green-600" : "text-red-600")}>{errors.general}</p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Instructions"}
                </Button>

                <div className="text-center">
                  <Button type="button" variant="ghost" className="text-sm" onClick={handleBackToLogin}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <Tabs value={isLogin ? "login" : "register"} onValueChange={handleModeSwitch}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-sm">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={cn(errors.email && "border-red-500")}
                      required
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className={cn("pr-10", errors.password && "border-red-500")}
                        required
                      />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                  </div>

                  {errors.general && <p className="text-sm text-red-600 text-center">{errors.general}</p>}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="text-center">
                    <Button type="button" variant="link" className="text-sm" onClick={() => setIsForgotPassword(true)}>
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profile Picture (Optional)</Label>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={avatarPreview || `${siteConfig.domain}/uploads/default.jpg`} />
                        <AvatarFallback>
                          <Upload className="h-6 w-6 text-gray-500" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatar-upload" />
                        <Label htmlFor="avatar-upload" className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>Choose Image</span>
                          </Button>
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG only</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={cn(errors.email && "border-red-500")}
                      required
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className={cn(errors.firstName && "border-red-500")}
                        required
                      />
                      {errors.firstName && <p className="text-sm text-red-600">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className={cn(errors.lastName && "border-red-500")}
                        required
                      />
                      {errors.lastName && <p className="text-sm text-red-600">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(val) => handleInputChange("gender", val)}>
                      <SelectTrigger className="w-[180px] border px-3 py-2 rounded" >
                        <SelectValue placeholder="Select Your Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname (Optional)</Label>
                    <Input
                      id="nickname"
                      placeholder="Choose a nickname"
                      value={formData.nickname}
                      onChange={(e) => handleInputChange("nickname", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.dateOfBirth && "text-gray-500")}> 
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dateOfBirth}
                          onSelect={(date) => handleInputChange("dateOfBirth", date ?? null)}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.dateOfBirth && <p className="text-sm text-red-600">{errors.dateOfBirth}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aboutMe">About Me (Optional)</Label>
                    <Textarea
                      id="aboutMe"
                      placeholder="Tell us about yourself..."
                      value={formData.aboutMe}
                      onChange={(e) => handleInputChange("aboutMe", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className={cn("pr-10", errors.password && "border-red-500")}
                        required
                      />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className={cn("pr-10", errors.confirmPassword && "border-red-500")}
                        required
                      />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </Button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
                  </div>

                  {errors.general && <p className="text-sm text-red-600 text-center">{errors.general}</p>}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
