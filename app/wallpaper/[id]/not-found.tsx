import Link from "next/link";

export default function WallpaperNotFound() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">壁纸不存在</h1>
        <p className="mb-6 text-gray-500">这张壁纸可能已被删除，或不属于当前账号</p>
        <Link href="/" className="text-primary underline">
          返回首页
        </Link>
      </div>
    </div>
  );
}
