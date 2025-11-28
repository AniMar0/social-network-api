import PostCard, { type Post } from "./PostCard";

export default function PostsList({ posts }: { posts: Post[] }) {
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
