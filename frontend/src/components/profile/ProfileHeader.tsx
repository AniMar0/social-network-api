"use client";

import Image from "next/image";
import { useState } from "react";

export type ProfileUser = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  about?: string;
  avatarUrl?: string;
};

export default function ProfileHeader({ user }: { user: ProfileUser }) {
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row sm:items-center gap-6">
      <div className="shrink-0">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={`${user.firstName} ${user.lastName} avatar`}
            width={96}
            height={96}
            className="rounded-full object-cover border-4 border-blue-500"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 grid place-items-center text-gray-500">
            <span className="text-xl font-semibold">
              {user.firstName[0]}
              {user.lastName[0]}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h1 className="text-2xl font-bold">
          {user.firstName} {user.lastName}
        </h1>
        {user.nickname && (
          <p className="text-gray-500">@{user.nickname}</p>
        )}
        {user.about && (
          <p className="mt-2 text-gray-700 leading-relaxed">{user.about}</p>
        )}
      </div>

      <div className="sm:self-start">
        <button
          onClick={() => setIsFollowing((v) => !v)}
          className={`px-4 py-2 rounded font-medium transition text-white ${
            isFollowing ? "bg-gray-600 hover:bg-gray-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </button>
      </div>
    </div>
  );
}
