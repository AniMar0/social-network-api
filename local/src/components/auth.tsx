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
import { CalendarIcon, Upload, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site.config";

interface FormData {
  // Required fields for registration
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | undefined;
  gender: string;

  // Optional fields for registration
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
  // State management for form mode and data
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const router = useRouter();

  // Form data state with proper typing
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

  // Form validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Avatar preview URL for uploaded images
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  /**
   * Validates form data based on current mode (login/register)
   * Returns an object containing any validation errors
   */
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Email validation - required for both login and register
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation - required for both modes
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Registration-specific validations
    if (!isLogin) {
      // Confirm password validation
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      // Name validations
      if (!formData.firstName.trim()) {
        newErrors.firstName = "First name is required";
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = "Last name is required";
      }
      // Gender validation
      if (!formData.gender) {
        newErrors.gender = "Gender is required";
      }

      // Date of birth validation
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = "Date of birth is required";
      } else {
        const today = new Date();
        const age = today.getFullYear() - formData.dateOfBirth.getFullYear();
        if (age < 13) {
          newErrors.dateOfBirth =
            "You must be at least 13 years old to register";
        }
      }
    }

    return newErrors;
  };

  /**
   * Handles input field changes and updates form data state
   */
  const handleInputChange = (
    field: keyof FormData,
    value: string | Date | File | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear specific field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Handles avatar file upload and creates preview URL
   */
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          general: "Please select a valid image file",
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setErrors((prev) => ({
          ...prev,
          general: "Image size must be less than 5MB",
        }));
        return;
      }

      handleInputChange("avatar", file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Handles form submission for both login and registration
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate form data
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        // Handle login logic here
        // TODO: Implement actual login API call
        await fetch(`${siteConfig.domain}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            identifier: formData.email,
            password: formData.password,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              // Read response as text first
              const text = await res.text();
              // Try to parse as JSON, fall back to plain text
              try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || "Login failed");
              } catch {
                // If JSON parsing fails, check if text looks like JSON and extract error
                if (text.includes('"error"')) {
                  // Try to extract error message from malformed JSON
                  const errorMatch = text.match(/"error"\s*:\s*"([^"]+)"/);
                  if (errorMatch) {
                    throw new Error(errorMatch[1]);
                  }
                }
                throw new Error(text || "Login failed");
              }
            }
            return res.json();
          })
          .then((data) => {
            if (data.error) {
              setErrors({ general: data.error });
            } else {
              router.push("/");
            }
          })
          .catch((err) => {
            console.error(err);
            setErrors((prev) => ({
              ...prev,
              general: String(err.message || err),
            }));
          });
      } else {
        const avatarForm = new FormData();
        let avatarUrl = "";
        if (formData.avatar) {
          console.log(formData.avatar);
          avatarForm.append("avatar", formData.avatar);
          await fetch(`${siteConfig.domain}/api/upload-avatar`, {
            method: "POST",
            body: avatarForm,
            credentials: "include",
          })
            .then(async (res) => {
              if (!res.ok) {
                // backend may return plain text error messages for bad requests
                const text = await res.text();
                throw new Error(text || "Upload failed");
              }
              return res.json();
            })
            .then((data) => (avatarUrl = data.avatarUrl))
            .catch((err) => {
              console.error(err);
              setErrors((prev) => ({
                ...prev,
                general: String(err.message || err),
              }));
            });
        } else {
          avatarUrl = "/uploads/default.jpg";
        }

        await fetch(`${siteConfig.domain}/api/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth
              ? formData.dateOfBirth.toISOString()
              : "",
            nickname: formData.nickname,
            aboutMe: formData.aboutMe,
            avatarUrl: avatarUrl,
            gender: formData.gender,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              // Read response as text first
              const text = await res.text();
              // Try to parse as JSON, fall back to plain text
              try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || "Registration failed");
              } catch {
                // If JSON parsing fails, use the plain text
                throw new Error(text || "Registration failed");
              }
            }

            // For successful responses, try to parse as JSON, but handle non-JSON responses gracefully
            try {
              const data = await res.json();
              return data;
            } catch {
              // If JSON parsing fails, assume success and return a success message
              console.log("Registration successful but no JSON response");
              return { message: "Registration successful" };
            }
          })
          .then((data) => {
            console.log("Registration successful:", data);
            // After successful registration, switch to login mode
            setIsLogin(true);
            setFormData({
              email: formData.email, // Keep the email to make login easier
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
          .catch((err) => {
            console.error(err);
            // Convert backend error messages to user-friendly messages
            let errorMessage = String(err.message || err);
            if (
              errorMessage.includes("User already exists") ||
              errorMessage.includes("Status Conflict")
            ) {
              errorMessage =
                "An account with this email already exists. Please use a different email or try logging in.";
            } else if (
              errorMessage.includes("404") ||
              errorMessage.includes("not found")
            ) {
              errorMessage =
                "Registration service is currently unavailable. Please try again later.";
            }
            setErrors((prev) => ({ ...prev, general: errorMessage }));
          });
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      setErrors({ general: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles forgot password form submission
   */
  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate email
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
      // Handle password reset logic here
      console.log("Password reset request for:", forgotPasswordEmail);
      // TODO: Implement actual password reset API call (backend dyalek)

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show success message (you can customize this)
      setErrors({
        general: "Password reset instructions have been sent to your email.",
      });
    } catch {
      setErrors({ general: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resets form when switching between login and register modes
   */
  const handleModeSwitch = (value: string) => {
    const newIsLogin = value === "login";
    setIsLogin(newIsLogin);
    setErrors({});
    setIsForgotPassword(false);
    setForgotPasswordEmail("");

    // Reset form data when switching modes
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

  return (
    <div className="min-h-screen flex items-center justify-center glass-page p-6">
      <Card className="w-full max-w-md mx-auto shadow-lg glass-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-balance">
            {isForgotPassword ? "Reset Password" : "Welcome to Social Network"}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-pretty">
            {isForgotPassword
              ? "Enter your email address and we'll send you instructions to reset your password"
              : isLogin
              ? "Sign in to your account to continue"
              : "Create your account to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isForgotPassword ? (
            // Forgot Password Form
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
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    className={cn(
                      "glass-input",
                      errors.email && "border-destructive"
                    )}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                {/* General message (success or error) */}
                {errors.general && (
                  <p
                    className={cn(
                      "text-sm text-center",
                      errors.general.includes("sent")
                        ? "text-green-600"
                        : "text-destructive"
                    )}
                  >
                    {errors.general}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full cursor-pointer glass-button text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Instructions"}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm text-muted-foreground cursor-pointer"
                    onClick={handleBackToLogin}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <Tabs
              value={isLogin ? "login" : "register"}
              onValueChange={handleModeSwitch}
            >
              {/* Tab navigation for switching between login and register */}
              <TabsList className="grid w-full grid-cols-2 mb-6 glass-tablist">
                <TabsTrigger value="login" className="text-sm cursor-pointer">
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="text-sm cursor-pointer"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={cn(
                        "glass-input",
                        errors.email && "border-destructive"
                      )}
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  {/* Password Field with visibility toggle */}
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={cn(
                          "glass-input",
                          errors.password && "border-destructive",
                          "pr-10"
                        )}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* General error message */}
                  {errors.general && (
                    <p className="text-sm text-destructive text-center">
                      {errors.general}
                    </p>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full cursor-pointer glass-button text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-muted-foreground cursor-pointer"
                      onClick={() => setIsForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Registration Form */}
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Avatar Upload Section (Optional) */}
                  <div className="space-y-2">
                    <Label>Profile Picture (Optional)</Label>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={
                            avatarPreview ||
                            `${siteConfig.domain}/uploads/default.jpg`
                          }
                        />
                        <AvatarFallback>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <Label
                          htmlFor="avatar-upload"
                          className="cursor-pointer"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <span>Choose Image</span>
                          </Button>
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Max 5MB, JPG/PNG only
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={cn(
                        "glass-input",
                        errors.email && "border-destructive"
                      )}
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        className={cn(
                          "glass-input",
                          errors.firstName && "border-destructive"
                        )}
                        required
                      />
                      {errors.firstName && (
                        <p className="text-sm text-destructive">
                          {errors.firstName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        className={cn(
                          "glass-input",
                          errors.lastName && "border-destructive"
                        )}
                        required
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Gender Field */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(val) => handleInputChange("gender", val)}
                    >
                      <SelectTrigger className="w-[180px] glass-input">
                        <SelectValue placeholder="Select Your Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nickname Field (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname (Optional)</Label>
                    <Input
                      id="nickname"
                      placeholder="Choose a nickname"
                      value={formData.nickname}
                      onChange={(e) =>
                        handleInputChange("nickname", e.target.value)
                      }
                      className="glass-input"
                    />
                  </div>

                  {/* Date of Birth Field */}
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dateOfBirth && "text-muted-foreground",
                            errors.dateOfBirth && "border-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dateOfBirth ? (
                            format(formData.dateOfBirth, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dateOfBirth}
                          onSelect={(date) =>
                            handleInputChange("dateOfBirth", date ?? null)
                          }
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.dateOfBirth && (
                      <p className="text-sm text-destructive">
                        {errors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  {/* About Me Field (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="aboutMe">About Me (Optional)</Label>
                    <Textarea
                      id="aboutMe"
                      placeholder="Tell us about yourself..."
                      value={formData.aboutMe}
                      onChange={(e) =>
                        handleInputChange("aboutMe", e.target.value)
                      }
                      rows={3}
                      className="glass-input"
                    />
                  </div>

                  {/* Password Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={cn(
                          "glass-input",
                          errors.password && "border-destructive",
                          "pr-10"
                        )}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        className={cn(
                          errors.confirmPassword && "border-destructive",
                          "pr-10"
                        )}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* General error message */}
                  {errors.general && (
                    <p className="text-sm text-destructive text-center">
                      {errors.general}
                    </p>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full cursor-pointer glass-button text-white"
                    disabled={isLoading}
                  >
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
