import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "钜豪照明 JUHAO｜好房子，光健康",
  description: "钜豪照明，以专业照明与智能家居科技，为家庭、商业与公共空间提供健康光环境解决方案。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
