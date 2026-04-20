import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── Админы ───

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  name: text("name").notNull(),
  telegramChatId: text("telegram_chat_id").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminSessions = sqliteTable("admin_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  adminId: integer("admin_id").notNull().references(() => admins.id),
  ip: text("ip"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const admin2faCodes = sqliteTable("admin_2fa_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id").notNull().references(() => admins.id),
  codeHash: text("code_hash").notNull(),
  codeSalt: text("code_salt").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── Каталог ───

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  groupSlug: text("group_slug").notNull(),
  groupName: text("group_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    externalId: text("external_id").notNull().unique(),
    slug: text("slug").notNull().default(""),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    country: text("country").notNull().default(""),
    categoryId: integer("category_id").references(() => categories.id),
    car: text("car").notNull().default(""),
    price: integer("price").notNull(),
    inStock: integer("in_stock").notNull().default(0),
    image: text("image").notNull().default(""),
    images: text("images").notNull().default("[]"),
    description: text("description").notNull().default(""),
    longDescription: text("long_description"),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    slugUnique: uniqueIndex("products_slug_unique").on(t.slug),
    skuUnique: uniqueIndex("products_sku_unique").on(t.sku),
    brandIdx: index("products_brand_idx").on(t.brand),
    categoryIdx: index("products_category_idx").on(t.categoryId),
    updatedIdx: index("products_updated_idx").on(t.updatedAt),
    hiddenIdx: index("products_hidden_idx").on(t.hidden),
  })
);

export const productSpecs = sqliteTable("product_specs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productAnalogs = sqliteTable("product_analogs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  analogId: integer("analog_id").notNull().references(() => products.id, { onDelete: "cascade" }),
});

// ─── Заказы и клиенты ───

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").notNull().unique(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  fullName: text("full_name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userSessions = sqliteTable("user_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull().default(""),
  items: text("items").notNull(),
  total: integer("total").notNull(),
  deliveryMethod: text("delivery_method").notNull().default("pickup"),
  deliveryCity: text("delivery_city").notNull().default(""),
  deliveryAddress: text("delivery_address").notNull().default(""),
  deliveryCost: integer("delivery_cost").notNull().default(0),
  deliveryQuote: text("delivery_quote"),
  cdekPickupPoint: text("cdek_pickup_point"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("new"),
  isUrgent: integer("is_urgent", { mode: "boolean" }).notNull().default(false),
  comment: text("comment").notNull().default(""),
  userAgent: text("user_agent"),
  ip: text("ip"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orderStatusHistory = sqliteTable("order_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  status: text("status").notNull(),
  comment: text("comment").notNull().default(""),
  notifiedClient: integer("notified_client", { mode: "boolean" }).notNull().default(false),
  adminId: integer("admin_id").references(() => admins.id),
  createdAt: text("created_at").notNull(),
});

// ─── Коммуникации ───

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(),
  customerName: text("customer_name").notNull().default(""),
  customerContact: text("customer_contact").notNull().default(""),
  status: text("status").notNull().default("new"),
  rating: integer("rating"),
  assignedAdminId: integer("assigned_admin_id").references(() => admins.id),
  lastMessageAt: text("last_message_at"),
  unreadCount: integer("unread_count").notNull().default(0),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  sender: text("sender").notNull(),
  adminId: integer("admin_id").references(() => admins.id),
  text: text("text").notNull(),
  attachments: text("attachments").notNull().default("[]"),
  isInternalNote: integer("is_internal_note", { mode: "boolean" }).notNull().default(false),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});

export const chatTokens = sqliteTable("chat_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id").notNull().references(() => admins.id),
  endpoint: text("endpoint").notNull(),
  keysJson: text("keys_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const quickReplies = sqliteTable("quick_replies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  text: text("text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Заметки о клиентах ───

export const customerNotes = sqliteTable("customer_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerPhone: text("customer_phone").notNull().unique(),
  status: text("status").notNull().default("new"),
  carModels: text("car_models").notNull().default(""),
  notes: text("notes").notNull().default(""),
  adminId: integer("admin_id").references(() => admins.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Контент ───

export const pages = sqliteTable("pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").references(() => admins.id),
});

export const faqItems = sqliteTable("faq_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const banners = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  text: text("text").notNull().default(""),
  link: text("link").notNull().default(""),
  image: text("image").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// ─── Настройки ───

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Аналитика ───

export const productViews = sqliteTable("product_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  viewCount: integer("view_count").notNull().default(0),
});

// ─── Согласия ───

export const consents = sqliteTable("consents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ip: text("ip").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  consentPersonalData: integer("consent_personal_data", { mode: "boolean" }).notNull().default(false),
  consentMarketing: integer("consent_marketing", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
