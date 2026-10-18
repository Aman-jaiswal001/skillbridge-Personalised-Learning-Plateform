import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../utils/helpers";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const sources = message.sources?.length
    ? message.sources
    : message.source
      ? [message.source]
      : [];

  return (
    <div
      className={cn("flex min-w-0", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "min-w-0 max-w-[92%] overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[85%]",
          isUser
            ? "bg-primary text-white"
            : "border border-line bg-white text-slate-700 shadow-sm",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : (
          <div className="min-w-0 [&_a]:text-primary [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_h1]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:my-2 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-white [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:bg-slate-100 [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          </div>
        )}
        {sources.length ? (
          <div className="mt-3 flex min-w-0 items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-navy">
            <FileText size={14} className="mt-0.5 shrink-0 text-primary" />
            <span className="min-w-0">
              {sources.map((source, index) => (
                <span
                  key={`${source.file}-${source.page}-${index}`}
                  className="block break-words"
                >
                  Source: {source.file} · Page {source.page}
                </span>
              ))}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
