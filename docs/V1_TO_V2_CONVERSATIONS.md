# Plan: show customer-linked v1 chats in the v2 widget

The v2 widget stays as it is. It lists `ChatSession` rows with a `phase`, and a signed-in user only sees rows whose `customer` is theirs. It reads `ChatMessage` rows, not `TicketReply` rows.

v1 chats already live in those tables. They are hidden because `phase` is empty, and because everything after the ticket was created is a `TicketReply`. A one-off backend command fills that in. No widget, protocol, or dashboard change.

## Which rows

Include a v1 chat when all of these are true:

- `ChatSession.phase` is empty
- `ChatSession.ticket` is set
- A customer is already on the session or on the ticket

If the ticket has the customer and the session does not, copy that foreign key onto the session. That is the same person already stored on the ticket.

Skip everything else:

- Sessions with no customer on the session and no customer on the ticket. Do not match `ChatSession.email` or `Ticket.email`.
- Sessions that never became a ticket.
- Tickets that have a customer but no chat session (email, API, help form). Those stay in the inbox. This command does not invent a widget conversation for them.

For SpendCrypto this set is small. Widget auth never ran, so most widget threads have no customer. Only threads that were actually tied to a `Customer` come across. A customer also has to be the one v2 will identify: `Customer.external_id` must be the host's `sub`. A customer row with no `external_id` is a different person from the one v2 creates at login, and the widget will not list their old chats.

## What the command writes

Per session, in one transaction:

1. Set `ChatSession.customer` from the ticket when the session's customer is empty. If both are set and they differ, skip the session and log it.
2. Set `phase` to `team`. Leave `widget_config`, `visitor`, and `is_test` alone. Update with a queryset so `modified` stays at the last real activity and the thread does not jump to the top of the list.
3. Leave existing `ChatMessage` rows (greeting, visitor, AI, ticket-created line). Do not copy `Ticket.message_text`. That field is already a flat copy of those messages.
4. For each public `TicketReply` in `created` order, if no `ChatMessage` points at it, insert one the same way `_deliver_reply` does: sender `AGENT` or `USER`, agent name, signature stripped, file attachments copied onto `ChatAttachment`, `reply` set. Skip `is_private` replies.
5. Set each new message's `created` back to the reply's `created`. Inserting in reply order keeps message ids in the same sequence the widget pages by.
6. Set `visitor_last_read_id` to the latest message id so years of agent replies do not all show as unread.

Do not call `deliver_reply`. That publishes to the widget and bumps `modified`.

```bash
python manage.py backfill_v1_chats <team-slug>
python manage.py backfill_v1_chats <team-slug> --apply
```

Without `--apply` it prints how many chats and replies it would write. It is safe to run twice: a reply that already has a `ChatMessage` is skipped, and a session that already has a `phase` is not selected.

## After it runs

New replies on those tickets already flow into the widget. `widget_session_for_ticket` finds the session once `phase` is set, and `deliver_reply` copies the reply. The v1 widget never reads `phase`, so the help center keeps working if this runs before cutover.

Run it for the SpendCrypto team once their v2 widget config exists. Re-run at cutover to pick up chats that finished in between.

## Tests

One backend test builds a v1-shaped session: `phase` empty, customer set, a few `ChatMessage` rows, a ticket, and public plus private replies. After the command, `Scope.conversations` returns that session and `list_messages` returns the old chat messages plus the public replies, in order, with the original timestamps. The private reply is absent. A second session with the same email and no customer stays hidden. Running the command again inserts nothing.
