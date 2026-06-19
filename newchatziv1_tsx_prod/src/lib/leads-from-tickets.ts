import { Types } from "mongoose";
import { Contact, Conversation, Lead, Ticket } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";

export async function syncLeadFromTicket(input: { tenantId: string; ticketId: string }) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(input.tenantId) || !Types.ObjectId.isValid(input.ticketId)) {
    return null;
  }

  const ticket = await Ticket.findOne({ _id: input.ticketId, tenantId: input.tenantId }).lean();
  if (!ticket) return null;

  const [contact, conversation] = await Promise.all([
    ticket.contactId ? Contact.findOne({ _id: ticket.contactId, tenantId: input.tenantId }).lean() : null,
    ticket.conversationId ? Conversation.findOne({ _id: ticket.conversationId, tenantId: input.tenantId }).lean() : null,
  ]);

  const customFields = ticket.customFields && typeof ticket.customFields === "object" ? ticket.customFields as Record<string, any> : {};
  const metadata = ticket.metadata && typeof ticket.metadata === "object" ? ticket.metadata as Record<string, any> : {};
  const requester = ticket.requesterExternalId || conversation?.externalUserId || "";

  const name = customFields.name || metadata.customerName || contact?.name || requester || "عميل محتمل";
  const phone = customFields.phone || metadata.phone || contact?.phone || (/\+?\d[\d\s\-]{7,}/.exec(`${ticket.description || ""}\n${ticket.aiSummary || ""}`)?.[0] || "").replace(/\s+/g, " ").trim();
  const email = customFields.email || metadata.email || contact?.email || "";
  const interest = customFields.interest || metadata.interest || ticket.subject || ticket.title || ticket.category || "";
  const sourceChannel = ticket.channel || conversation?.channel || "";
  const lastMessageAt = conversation?.lastMessageAt || ticket.updatedAt || ticket.createdAt || new Date();

  const duplicateConditions = [
    ticket.contactId ? { contactId: ticket.contactId } : null,
    ticket.conversationId ? { conversationId: ticket.conversationId } : null,
    phone ? { phone } : null,
    email ? { email } : null,
    { ticketId: ticket._id },
  ].filter(Boolean);

  const filter: Record<string, any> = duplicateConditions.length
    ? { tenantId: input.tenantId, $or: duplicateConditions }
    : { tenantId: input.tenantId, ticketId: ticket._id };

  const update = {
    $set: {
      tenantId: ticket.tenantId,
      contactId: ticket.contactId || undefined,
      conversationId: ticket.conversationId || undefined,
      ticketId: ticket._id,
      sourceChannel,
      name,
      phone,
      email,
      company: contact?.company || customFields.company || "",
      interest,
      intent: ticket.category || ticket.triggerReason || "general",
      status: ticket.status || "open",
      lastMessageAt,
      notes: [ticket.description, ticket.aiSummary, ticket.triggerReason].filter(Boolean).join("\n\n").slice(0, 3000),
      score: ticket.category === "sales_request" || ticket.category === "booking_request" ? 80 : ticket.priority === "urgent" || ticket.priority === "high" ? 65 : 45,
      customFields: {
        ...customFields,
        lastTicketId: ticket._id.toString(),
        lastTicketNumber: ticket.number || null,
        lastTicketCategory: ticket.category || "general",
        lastTicketStatus: ticket.status || "open",
      },
    },
    $addToSet: {
      tags: { $each: ["ticket-source", ticket.category || "general"].filter(Boolean) },
    },
    $setOnInsert: {
      stage: "new",
      currency: "USD",
      value: 0,
    },
  };

  return Lead.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true });
}
