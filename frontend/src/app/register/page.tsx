"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/auth-layout"

const VALIDATION_RULES = {
  name: {
    required: "Full name is required",
    minLength: "Name must be at least 2 characters",
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
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name) {
      newErrors.name = VALIDATION_RULES.name.required
    } else if (formData.name.length < 2) {
      newErrors.name = VALIDATION_RULES.name.minLength
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
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
      setFormData({ name: "", email: "", password: "", confirmPassword: "" })
    }, 1200)
  }

  return (
    <AuthLayout>
      <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                  disabled={isLoading}
                />
              </div>

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

              <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
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
