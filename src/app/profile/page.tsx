import { createClient } from '@/lib/supabase/server';
import Calculator from '@/components/Calculator';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">你好，{user?.email || '访客'}！</h1>
      <p className="mt-4">欢迎来到你的个人主页。</p>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">计算器功能</h2>
        <Calculator />
      </div>
    </div>
  );
}
