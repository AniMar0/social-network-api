import Image from "next/image";

export type Post = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  privacy: "public" | "friends" | "private";
};

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="bg-white shadow rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold">{post.title}</h3>
        <span
          className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize"
          title="Privacy"
        >
          {post.privacy}
        </span>
      </div>

      {post.imageUrl && (
        <div className="mt-3 overflow-hidden rounded-md border border-gray-100">
          <Image
            src={post.imageUrl}
            alt={post.title}
            width={800}
            height={450}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      <p className="mt-3 text-gray-700 leading-relaxed whitespace-pre-line">
        {post.content}
      </p>
    </article>
  );
}
