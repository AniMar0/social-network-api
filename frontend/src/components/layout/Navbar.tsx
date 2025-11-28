"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-xl font-bold">
        <Link href="/">MySocialApp</Link>
      </div>

      <div className="space-x-4">
        <Link
          href="/login"
          className="hover:bg-blue-500 px-3 py-1 rounded transition"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="hover:bg-blue-500 px-3 py-1 rounded transition"
        >
          Register
        </Link>
      </div>
    </nav>
  );
}
