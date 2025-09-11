import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "AI Learning Assistant",
  description: "AI-powered learning assistant with RAG capabilities",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
