import { ChatSession } from "../models/ChatSession.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { Document } from "../models/Document.js";
import { ApiError } from "../utils/ApiError.js";
import { retrieveContext } from "../ai/rag/retrieve.service.js";
import { answerFromContext } from "../ai/rag/answer.service.js";

export async function chat({ userId, sessionId, question, documentIds = [] }) {
  if (!question?.trim()) {
    throw ApiError.badRequest("Question is required");
  }
  if (!Array.isArray(documentIds)) throw ApiError.badRequest('Document IDs must be a list')

  let session;

  if (sessionId && !/^[a-f\d]{24}$/i.test(String(sessionId))) throw ApiError.badRequest('Invalid chat session ID')

  if (sessionId) {
    session = await ChatSession.findOne({
      _id: sessionId,
      employeeId: userId,
    });

    if (!session) throw ApiError.notFound('Chat session not found')
  }

  const requestedIds = (documentIds.length ? documentIds : session?.documentIds || []).filter(Boolean)
  if (requestedIds.some((id) => !/^[a-f\d]{24}$/i.test(String(id)))) throw ApiError.badRequest('Invalid document ID')
  const ownedDocs = requestedIds.length ? await Document.find({ _id: { $in: requestedIds }, uploadedBy: userId }).select('_id status') : []
  if (ownedDocs.length !== new Set(requestedIds.map(String)).size) throw ApiError.forbidden('One or more selected documents are unavailable')
  if (ownedDocs.some((doc) => doc.status !== 'ready')) throw ApiError.badRequest('Selected documents are still processing. Please wait and retry.')
  const ids = ownedDocs.map((doc) => String(doc._id))
  if (!session) {
    session = await ChatSession.create({ employeeId: userId, documentIds: ownedDocs.map((doc) => doc._id), title: question.slice(0, 60) })
  } else if (session.documentIds.map(String).join(',') !== ids.join(',')) {
    session.documentIds = ownedDocs.map((doc) => doc._id)
    await session.save()
  }

  await ChatMessage.create({
    sessionId: session._id,
    role: "user",
    content: question,
  });

  const chunks = ids.length ? await retrieveContext({
    question,
    documentIds: ids,
  }) : [];
  console.info("[assistant] retrieval", {
    candidateCount: chunks.length,
    bestScore: chunks[0]?.score ?? null,
    selectedDocumentCount: ids.length,
  });

  const { answer, sources } = await answerFromContext({
    question,
    chunks,
  });

  const assistant = await ChatMessage.create({
    sessionId: session._id,
    role: "assistant",
    content: answer,
    sources,
  });

  return {
    sessionId: session._id,
    answer: assistant.content,
    sources: assistant.sources,
  };
}

export async function listSessions(userId) {
  return ChatSession.find({ employeeId: userId })
    .sort({ updatedAt: -1 })
    .lean();
}

export async function sessionMessages(userId, sessionId) {
  if (!/^[a-f\d]{24}$/i.test(String(sessionId))) throw ApiError.badRequest('Invalid chat session ID')
  const session = await ChatSession.findOne({
    _id: sessionId,
    employeeId: userId,
  });
  if (!session) throw ApiError.notFound("Chat session not found")
  const messages = await ChatMessage.find({ sessionId: session._id })
    .sort({ createdAt: 1 })
    .lean();
  return { session, messages };
}

export async function deleteSession(userId, sessionId) {
  if (!/^[a-f\d]{24}$/i.test(String(sessionId))) throw ApiError.badRequest('Invalid chat session ID')
  const session = await ChatSession.findOne({ _id: sessionId, employeeId: userId })
  if (!session) throw ApiError.notFound('Chat session not found')
  await ChatMessage.deleteMany({ sessionId: session._id })
  await session.deleteOne()
  return { deleted: true }
}
