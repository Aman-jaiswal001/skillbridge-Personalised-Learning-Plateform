import {
  FileText,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, extractData } from "../../api/client";
import ChatMessage from "../../components/common/ChatMessage";
import PageContainer from "../../components/common/PageContainer";
import { useToast } from "../../context/ToastContext";

const initialMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I can help you understand your course notes and study materials. Upload a PDF or ask me a question to get started.",
};
const formatSource = (source) => ({
  file: source.fileName || source.source || "Reference",
  page: source.pageNumber || 1,
});

export default function AIAssistant() {
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem("aiSessionId") || null,
  );
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentIds, setDocumentIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const fileRef = useRef(null);
  const messagesRef = useRef(null);
  const { push } = useToast();

  const loadDocuments = useCallback(async () => {
    try {
      const payload = await apiRequest("/documents");
      setDocuments(extractData(payload) || []);
    } catch (err) {
      push(err.message, "error");
    }
  }, [push]);

  const loadSessions = useCallback(async () => {
    try {
      const payload = await apiRequest("/assistant/sessions");
      setSessions(extractData(payload) || []);
    } catch (err) {
      push(err.message, "error");
    }
  }, [push]);

  async function removeDocument(id) {
    if (!window.confirm("Delete this uploaded document and its processed content?")) return;
    setDeletingDocument(id);
    try {
      await apiRequest(`/documents/${id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((doc) => String(doc._id || doc.id) !== String(id)));
      setDocumentIds((current) => current.filter((selected) => String(selected) !== String(id)));
      await loadSessions();
      push("Document deleted");
    } catch (err) { push(err.message, "error"); }
    finally { setDeletingDocument(null); }
  }

  async function removeSession(id) {
    if (!window.confirm("Delete this chat and its messages?")) return;
    setDeletingSession(id);
    try {
      await apiRequest(`/assistant/sessions/${id}`, { method: "DELETE" });
      setSessions((current) => current.filter((session) => String(session._id || session.id) !== String(id)));
      if (String(sessionId) === String(id)) {
        setSessionId(null);
        localStorage.removeItem("aiSessionId");
        setDocumentIds([]);
        setMessages([initialMessage]);
      }
      push("Chat history deleted");
    } catch (err) { push(err.message, "error"); }
    finally { setDeletingSession(null); }
  }

  const openSession = useCallback(
    async (id) => {
      if (!id) {
        setSessionId(null);
        localStorage.removeItem("aiSessionId");
        setMessages([initialMessage]);
        return;
      }
      setLoadingHistory(true);
      try {
        const payload = await apiRequest(`/assistant/sessions/${id}`);
        const data = extractData(payload);
        setSessionId(id);
        localStorage.setItem("aiSessionId", id);
        setDocumentIds(
          (data.session?.documentIds || []).map((doc) => doc._id || doc),
        );
        setMessages(
          data.messages?.length
            ? data.messages.map((message, index) => ({
                id: message._id || `${message.role}-${index}`,
                role: message.role,
                text: message.content || message.text,
                sources: (
                  message.sources || (message.source ? [message.source] : [])
                ).map(formatSource),
              }))
            : [initialMessage],
        );
      } catch (err) {
        push(err.message, "error");
        if (localStorage.getItem("aiSessionId") === id)
          localStorage.removeItem("aiSessionId");
        setSessionId(null);
        setDocumentIds([]);
        setMessages([initialMessage]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [push],
  );

  useEffect(() => {
    loadDocuments();
    loadSessions();
  }, [loadDocuments, loadSessions]);

  useEffect(() => {
    const savedSessionId = localStorage.getItem("aiSessionId");
    if (savedSessionId) openSession(savedSessionId);
    else setLoadingHistory(false);
  }, [openSession]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function send(text = input) {
    const value = text.trim();
    if (!value || sending) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text: value },
    ]);
    setInput("");
    setSending(true);
    try {
      const payload = await apiRequest("/assistant/chat", {
        method: "POST",
        body: { question: value, sessionId, documentIds },
      });
      const data = extractData(payload);
      setSessionId(data.sessionId);
      localStorage.setItem("aiSessionId", data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data.answer,
          sources: (data.sources || []).map(formatSource),
        },
      ]);
      loadSessions();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "assistant", text: err.message },
      ]);
      push(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  async function upload(file) {
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      push("Please choose a PDF file.", "error");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    try {
      const payload = await apiRequest("/documents/upload", {
        method: "POST",
        body,
      });
      const doc = extractData(payload);
      const id = doc._id || doc.id;
      if (id)
        setDocumentIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      await loadDocuments();
      push("PDF uploaded. It will be ready to use after processing.");
    } catch (err) {
      push(err.message, "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggleDocument(id) {
    setDocumentIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <PageContainer
      title="AI Tutor"
      subtitle="Study with answers grounded in your learning materials"
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-2xl border border-line bg-white p-3 shadow-sm">
            <button
              type="button"
              onClick={() => openSession(null)}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              <Plus size={16} /> New chat
            </button>
            <h2 className="mb-2 mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Recent chats
            </h2>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {sessions.length ? (
                sessions.map((session) => {
                  const id = session._id || session.id;
                  return (
                    <div
                      key={id}
                      className={`flex min-h-10 w-full items-center gap-1 rounded-lg px-2 py-1 text-xs ${sessionId === id ? "bg-blue-50 font-semibold text-primary" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      <button type="button" onClick={() => openSession(id)} className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left">
                        <MessageCircle size={14} className="shrink-0" />
                        <span className="min-w-0 truncate">{session.title || "Learning chat"}</span>
                      </button>
                      <button type="button" onClick={() => removeSession(id)} disabled={deletingSession === id} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label={`Delete chat ${session.title || ""}`} title="Delete chat">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="px-2 py-2 text-xs text-muted">
                  Your chats will appear here.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-navy">
                Study documents
              </h2>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line text-navy hover:bg-slate-50"
                aria-label="Upload a PDF"
              >
                <Upload size={16} />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="application/pdf,.pdf"
                onChange={(event) => upload(event.target.files?.[0])}
              />
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              Select the PDFs you want the tutor to reference.
            </p>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {documents.length ? (
                documents.map((doc) => {
                  const id = doc._id || doc.id;
                  const ready = doc.status === "ready";
                  return (
                    <div
                      key={id}
                      className="flex items-start gap-2 rounded-lg border border-line p-2.5 text-xs hover:bg-slate-50"
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-blue-600"
                          checked={documentIds.includes(id)}
                          disabled={!ready}
                          onChange={() => toggleDocument(id)}
                          aria-label={`Use ${doc.originalName || doc.fileName || "document"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-1.5 font-medium text-navy">
                            <FileText size={14} className="mt-0.5 shrink-0 text-primary" />
                            <span className="break-words">{doc.originalName || doc.fileName || "Learning document"}</span>
                          </span>
                          <span className="ml-5 mt-1 block capitalize text-muted">{ready ? "Ready" : doc.status || "Processing"}</span>
                        </span>
                      </label>
                      <button type="button" onClick={() => removeDocument(id)} disabled={deletingDocument === id} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 bg-slate-200 hover:bg-red-100 hover:text-red-600 disabled:opacity-50" aria-label={`Delete ${doc.originalName || doc.fileName || "document"}`} title="Delete document">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="py-2 text-xs text-muted">No PDFs uploaded yet.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="grid h-[min(72svh,760px)] min-h-[420px] min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-primary">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-navy">
                Study companion
              </h2>
              <p className="text-xs text-muted">
                {documentIds.length
                  ? `${documentIds.length} document${documentIds.length === 1 ? "" : "s"} selected`
                  : "Ask a question or select a PDF"}
              </p>
            </div>
          </div>
          <div
            ref={messagesRef}
            aria-live="polite"
            className="min-h-0 space-y-4 overflow-y-auto bg-slate-50/70 p-3 sm:p-5"
          >
            {loadingHistory ? (
              <p className="text-center text-sm text-muted">
                Restoring your conversation…
              </p>
            ) : null}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />{" "}
                Thinking through your materials…
              </div>
            ) : null}
            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-2">
                {[
                  "Summarize this material",
                  "Explain a difficult concept",
                  "Help me prepare for an interview",
                ].map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => send(question)}
                    className="min-h-9 rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <form
            className="flex min-w-0 items-center gap-2 border-t border-line bg-white p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label className="sr-only" htmlFor="tutor-question">
              Your question
            </label>
            <input
              id="tutor-question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={sending ? "Thinking…" : "Ask your tutor…"}
              className="h-11 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-50"
              aria-label="Send question"
              disabled={sending || !input.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      </div>
    </PageContainer>
  );
}
