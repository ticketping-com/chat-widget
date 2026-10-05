# v1 widget backend

How a v1 chat becomes a customer, a chat session, and a ticket. This is the source for a later v2 migration. It describes the code as it runs today.

SpendCrypto does not send `userJWT`. Most of their widget threads are the anonymous path below. The models still record who they belong to.

## Records

| Model         | Role                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Customer`    | A person for one team. `email` is required. `external_id` is optional and unique per team. Email is not unique.                        |
| `ChatSession` | One widget conversation. Optional `customer` FK. Optional `email`. Optional one-to-one `ticket`. `phase` is empty on every v1 session. |
| `ChatMessage` | Messages before a ticket exists, plus the greeting and the “ticket created” line.                                                      |
| `Ticket`      | The thread after handoff. Optional `customer` FK. Optional `email`. `created_via` is `CHAT_WIDGET` for widget tickets.                 |
| `TicketReply` | Messages after the ticket exists. Public replies are what the visitor sees. `is_private` replies are internal.                         |

`Customer.team` scopes every row. A person on two teams is two customers.

## Two ways a session is tied to a person

**Logged-in.** The host signs a JWT (`external_id`, `email`, `display_name`) with the team identity secret. The widget exchanges it at `GET /api/v1/jwt/auth/` (`apps/customer/views.py`, `auth_jwt`). That creates or updates a `Customer` keyed by `(team, external_id)` and returns a Ticketping customer JWT (`csid`, 7 days). `POST /api/v1/chat-session/create/` with that JWT creates the `ChatSession` with `customer` set. The socket refuses the session unless the same customer is on the connection. A login mid-chat (`type: auth`) attaches that customer to the session and, if a ticket already exists and has no customer, to the ticket too.

**Anonymous.** `POST /api/v1/chat-session/create/` with no JWT creates a `ChatSession` with no customer. The session id is the only secret. After the visitor types an email, that address is stored on `ChatSession.email` and copied onto `Ticket.email`. This path does not create a `Customer` and does not look one up.

The widget’s own history call treats both as the same person:

```python
# apps/ticket/views.py CustomerChatSessionListView
ChatSession.objects.filter(Q(customer=customer) | Q(email=email), team=team)
```

`GET /api/v1/chat-sessions/` is what the logged-in v1 widget uses. An anonymous browser never calls it. Its list is localStorage on that device only.

`GET /api/v1/my-tickets/` is stricter. It returns tickets whose `customer` FK is that customer. An email match is not enough there.

## Conversation states

`ChatConsumer` (`apps/ticket/consumers.py`) walks `ChatSession.status`:

1. `STARTED`. Socket connect writes a `SYSTEM` greeting. If the team has AI knowledge, each visitor message goes to the agent first and the answer is another `SYSTEM` `ChatMessage`.
2. `QUESTION_RECEIVED`. The AI asks for a human, or there is no AI and the first message is at least three words. Shorter messages get a “say more” prompt and stay in `STARTED`.
3. Logged-in visitor: skip email and create the ticket. Anonymous visitor: the bot asks for an email. A regex-valid address sets `EMAIL_RECEIVED` and `ChatSession.email`.
4. `TICKET_CREATED`. `create_ticket_via_chat_widget` (`apps/ticket/from_widget.py`) builds one ticket from the chat transcript, links it with `ChatSession.ticket`, and posts to Slack and email.

Sessions that never reach a ticket stay at `STARTED`, `QUESTION_RECEIVED`, or `ABANDONED`. They have chat messages and no ticket.

## Where each message lives

Before the ticket, the transcript is `ChatMessage` rows (`USER` and `SYSTEM`).

The ticket body is that transcript flattened into `Ticket.message_text` (`**User:**` / `**AI:**` lines). It is not a separate copy of each bubble.

After the ticket:

- Visitor messages become `TicketReply` rows (`created_via=CHAT_WIDGET`). They are not new `ChatMessage` rows. If the session has no customer, the reply lookup sets `TicketReply.customer` when a `Customer` with that email already exists. It does not set `Ticket.customer`.
- Agent replies from the dashboard, Slack, or email are `TicketReply` rows. The open widget receives them on the `customer-ticket-update-{ticket.sid}` channel. They are not written back as `ChatMessage`.
- On reconnect, `get_conversation_history` concatenates `ChatMessage` rows and public `TicketReply` rows, ordered by `created`.

Read state for the v1 widget is `Ticket.last_agent_reply_ts` versus `Ticket.last_read_ts`. Opening the thread sets `last_read_ts`.

## What is actually stored for an anonymous widget ticket

This is the SpendCrypto case, because widget auth is unused.

- `ChatSession.customer` is null. `ChatSession.email` is the address they typed. `ChatSession.phase` is null.
- `Ticket.customer` is null. `Ticket.email` is that same address. `Ticket.created_via` is `CHAT_WIDGET`.
- `ChatSession.ticket` points at the ticket.
- Pre-handoff bubbles are `ChatMessage`. The rest of the thread is `TicketReply`.

A `Customer` with that email can already exist from the API, the help portal, or a later v2 identify. The v1 chat-session list would then return these sessions. Nothing in the anonymous widget path writes the FK.

Email match is case-sensitive on `ChatSession.email` (`Q(email=email)`). Ticket creation stores the address as typed.

## What v2 reads instead

v2 lists sessions with `phase` set, and a verified user only sees sessions whose `customer` FK is theirs (`apps/widget/messaging.py`, `Scope.conversations`). It does not match `ChatSession.email`. Identify finds or creates the customer by `external_id` (`sub`) and does not look up by email (`apps/widget/views.py`, `_identify_signed`). The message API reads `ChatMessage` only. Public ticket replies show up there only after `deliver_reply` copies them, which it does for sessions that already have a `phase`.

So the old rows are in the same tables. v2 skips them because `phase` is empty, the customer FK is empty on the anonymous path, and the thread after handoff is on `TicketReply`.

## What not to migrate

Drop v1 sessions whose `customer` is null. Do not attach them by email.

The v1 history query matches `ChatSession.email` as well as the customer FK. That is how a ticket opened anonymously could later show up for whoever owns that address. It also lets someone type another person's email and have that ticket appear in the other person's list.

v2 does not do that. When a visitor identifies, only that visitor's own anonymous conversations are claimed, and the ticket on each of those conversations is linked to the customer (`claim_anonymous_conversations`). A different browser that typed the same email is left alone.

Customer-linked v1 chats can show in the v2 widget by backfilling `phase` and copying public ticket replies into `ChatMessage`. The plan is [V1_TO_V2_CONVERSATIONS.md](./V1_TO_V2_CONVERSATIONS.md). The widget itself does not change.
