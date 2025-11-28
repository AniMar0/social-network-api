// app/profile/[id]/page.tsx (mock data version)

import Navbar from "@/components/layout/Navbar";
import ProfileHeader, { type ProfileUser } from "@/components/profile/ProfileHeader";
import PostsList from "@/components/profile/PostsList";
import type { Post } from "@/components/profile/PostCard";

export default function ProfilePage({ params }: { params: { id: string } }) {
  // Mock user info
  const user: ProfileUser = {
    id: params.id,
    firstName: "Jane",
    lastName: "Doe",
    nickname: "jdoe",
    about:
      "Coffee lover, photographer, and frontend developer. Building delightful UIs one component at a time.",
    // avatarUrl: "/avatar.png", // optional: place an image in public and uncomment
  };

  // Mock posts
  const posts: Post[] = [
    {
      id: "p1",
      title: "Hello Social!",
      content:
        "Just joined this platform. Excited to connect and share some of my recent work in web design and photography!",
      privacy: "public",
      imageUrl: "/globe.svg", // using an existing public asset
    },
    {
      id: "p2",
      title: "Weekend Hike",
      content:
        "Went hiking this weekend. The view at the top was absolutely stunning. Can't wait to go again!",
      privacy: "friends",
    },
    {
      id: "p3",
      title: "WIP Portfolio",
      content:
        "I'm revamping my portfolio with a new color system and some animations. Feedback welcome!",
      privacy: "public",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-100 px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Profile Header */}
          <ProfileHeader user={user} />

          {/* Posts List */}
          <section>
            <h2 className="sr-only">Posts</h2>
            <PostsList posts={posts} />
          </section>
        </div>
      </main>
    </>
  );
}