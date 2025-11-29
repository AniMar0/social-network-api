"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AuthLayout } from "@/components/auth-layout"

const VALIDATION_RULES = {
  firstName: {
    required: "First name is required",
    minLength: "First name must be at least 2 characters",
  },
  lastName: {
    required: "Last name is required",
    minLength: "Last name must be at least 2 characters",
  },
  email: {
    required: "Email is required",
    pattern: "Please enter a valid email address",
  },
  password: {
    required: "Password is required",
    minLength: "Password must be at least 8 characters",
    pattern: "Password must contain letters and numbers",
  },
  confirmPassword: {
    required: "Please confirm your password",
    match: "Passwords do not match",
  },
  dateOfBirth: {
    required: "Date of birth is required",
  },
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    avatar: null as File | null,
    nickname: "",
    aboutMe: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [avatarPreview, setAvatarPreview] = useState<string>("")

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName) {
      newErrors.firstName = VALIDATION_RULES.firstName.required
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = VALIDATION_RULES.firstName.minLength
    }

    if (!formData.lastName) {
      newErrors.lastName = VALIDATION_RULES.lastName.required
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = VALIDATION_RULES.lastName.minLength
    }

    if (!formData.email) {
      newErrors.email = VALIDATION_RULES.email.required
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = VALIDATION_RULES.email.pattern
    }

    if (!formData.password) {
      newErrors.password = VALIDATION_RULES.password.required
    } else if (formData.password.length < 8) {
      newErrors.password = VALIDATION_RULES.password.minLength
    } else if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      newErrors.password = VALIDATION_RULES.password.pattern
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = VALIDATION_RULES.confirmPassword.required
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = VALIDATION_RULES.confirmPassword.match
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = VALIDATION_RULES.dateOfBirth.required
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, avatar: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setSuccessMessage("Account created successfully! Redirecting to login...")
      setIsLoading(false)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        dateOfBirth: "",
        avatar: null,
        nickname: "",
        aboutMe: "",
      })
      setAvatarPreview("")
    }, 1200)
  }

  return (
    <AuthLayout>
      <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95 w-full max-w-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">Create account</CardTitle>
          <CardDescription className="text-muted-foreground">Join us and start your journey today</CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 text-center fade-in">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview || "/placeholder.svg"}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center text-muted-foreground">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
                  <label
                    htmlFor="avatar"
                    className="absolute bottom-0 right-0 bg-primary rounded-full p-2 cursor-pointer hover:bg-primary/80 transition-colors shadow-lg"
                  >
                    <svg
                      className="w-4 h-4 text-primary-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </label>
                </div>
                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mb-4">
                Click the camera icon to upload your photo (Optional)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    First name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    error={errors.firstName}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    error={errors.lastName}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Existing code */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">
                  Date of birth
                </label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  error={errors.dateOfBirth}
                  disabled={isLoading}
                />
              </div>

              {/* Existing code */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">At least 8 characters with letters and numbers</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  error={errors.confirmPassword}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="nickname" className="text-sm font-medium text-foreground">
                    Nickname (Optional)
                  </label>
                  <Input
                    id="nickname"
                    name="nickname"
                    type="text"
                    placeholder="Your nickname"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="aboutMe" className="text-sm font-medium text-foreground">
                  About me (Optional)
                </label>
                <Textarea
                  id="aboutMe"
                  name="aboutMe"
                  placeholder="Tell us a bit about yourself..."
                  value={formData.aboutMe}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="min-h-24 resize-none"
                />
              </div>

              <Button type="submit" className="w-full mt-6" isLoading={isLoading} disabled={isLoading}>
                Create account
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border/50">
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
