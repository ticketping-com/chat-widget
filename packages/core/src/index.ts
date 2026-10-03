export { DEFAULT_CONFIG, DEFAULT_TEXTS, resolveConfig, type ResolvedConfig } from './config.ts'
export { en, type Catalog, type MessageKey, type PluralEntry } from './catalog.ts'
export {
  KEY_PATTERN,
  MAX_ATTACHMENTS,
  MAX_MESSAGE_LENGTH,
  MAX_UPLOAD_BYTES,
  createWidgetController,
  isAllowedFileType,
  type ControllerOptions,
  type PreviewOptions,
  type SendInput,
  type TrackedEvent,
  type UploadFileOptions,
  type WidgetController
} from './controller.ts'
export { createEmitter, type Emitter } from './emitter.ts'
export { TicketpingError, isTicketpingError, toWidgetError } from './errors.ts'
export type { UploadOptions } from './http.ts'
export {
  createI18n,
  eventText,
  messagePreview,
  textDirection,
  type DateInput,
  type I18n,
  type Params
} from './i18n.ts'
export {
  browserPlatform,
  setUnderlyingPageTitle,
  type PageInfo,
  type Platform,
  type SocketLike,
  type StorageLike,
  type XhrLike
} from './platform.ts'
export { PREVIEW_CONVERSATION_ID, type PreviewView } from './preview.ts'
export {
  NEW_CONVERSATION,
  RECENT_CONVERSATION_MS,
  initialState,
  recentConversation,
  isLocal,
  normalizeConfig,
  type ConnectionState,
  type DeliveryState,
  type PartialWidgetConfig,
  type ResolvedWidgetConfig,
  type ThreadMessage,
  type ThreadState,
  type TypingIndicator,
  type ViewState,
  type WidgetState,
  type WidgetStatus
} from './state.ts'
export { createStore, type Store } from './store.ts'
export type * from './types.ts'
