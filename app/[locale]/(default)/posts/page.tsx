import Blog from "@/components/blocks/blog";
import { Blog as BlogType } from "@/types/blocks/blog";
import { Post } from "@/types/post";
import { getPostsByLocale } from "@/models/post";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations();

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/posts`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/posts`;
  }

  return {
    title: t("blog.title"),
    description: t("blog.description"),
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function ({ params }: { params: { locale: string } }) {
  const t = await getTranslations();

  const posts = await getPostsByLocale(params.locale);

  const blog: BlogType = {
    title: t("blog.title"),
    description: t("blog.description"),
    items: posts.map((post: Post) => ({
      slug: post.slug ?? "",
      title: post.title ?? "",
      description: post.description ?? "",
      author_name: post.author_name ?? "",
      author_avatar_url: post.author_avatar_url ?? "",
      created_at: post.created_at ?? "",
      locale: post.locale ?? "",
      cover_url: post.cover_url ?? "",
      content: post.content ?? "",
    })),
    read_more_text: t("blog.read_more_text"),
  };

  return <Blog blog={blog} />;
}
