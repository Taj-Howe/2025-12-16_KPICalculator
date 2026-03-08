import type {
  ImportWindow,
  IntegrationSyncPayload,
  NormalizedCustomer,
  NormalizedOfferMapping,
  NormalizedRefundEvent,
  NormalizedRevenueEvent,
  NormalizedSubscriptionState,
  RevenueCategory,
  StripeSourceConfig,
} from "./types";

type FetchLike = typeof fetch;

type StripeListResponse<T> = {
  object: "list";
  data: T[];
  has_more: boolean;
};

type StripePrice = {
  id: string;
  product?: string | { id: string };
  unit_amount?: number | null;
  unit_amount_decimal?: string | null;
};

type StripeInvoice = {
  id: string;
  customer: string | null;
  currency: string;
  created: number;
  paid_at?: number | null;
  status_transitions?: {
    paid_at?: number | null;
  };
};

type StripeInvoiceLine = {
  id: string;
  amount: number;
  currency: string;
  quantity: number | null;
  description?: string | null;
  period?: {
    start: number;
    end: number;
  };
  price?: StripePrice | null;
};

type StripeRefund = {
  id: string;
  amount: number;
  currency: string;
  created: number;
  charge?: {
    id: string;
      invoice?: {
        id: string;
        lines?: {
          data?: Array<{
            id?: string;
            price?: StripePrice | null;
          }>;
        };
      } | string | null;
  } | string | null;
};

type StripeSubscriptionItem = {
  price?: StripePrice | null;
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  start_date?: number | null;
  canceled_at?: number | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  items?: {
    data?: StripeSubscriptionItem[];
  };
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";

const unixSeconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const toIso = (unix: number | null | undefined) =>
  unix == null ? null : new Date(unix * 1000).toISOString();

const centsToDollars = (amount: number) => amount / 100;

const getPriceId = (price: StripePrice | null | undefined) => price?.id ?? null;

const getProductId = (price: StripePrice | null | undefined) => {
  const product = price?.product;
  if (typeof product === "string") {
    return product;
  }
  return product?.id ?? null;
};

const getUnitAmount = (price: StripePrice | null | undefined) => {
  if (price?.unit_amount_decimal != null) {
    return Number(price.unit_amount_decimal) / 100;
  }
  if (price?.unit_amount != null) {
    return price.unit_amount / 100;
  }
  return null;
};

const classifyRevenue = (mapping: NormalizedOfferMapping): RevenueCategory => {
  if (mapping.revenueClassification === "pilot") {
    return "pilot";
  }
  if (mapping.revenueClassification === "implementation") {
    return "implementation";
  }
  if (
    mapping.revenueClassification === "usage" ||
    mapping.revenueClassification === "hybrid_usage"
  ) {
    return "usage";
  }
  return "subscription";
};

const mapSubscriptionStatus = (
  status: string,
): NormalizedSubscriptionState["status"] => {
  if (
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "paused" ||
    status === "canceled" ||
    status === "incomplete"
  ) {
    return status;
  }
  return "unknown";
};

const mapBillingInterval = (
  currentPeriodStart: number | null | undefined,
  currentPeriodEnd: number | null | undefined,
): NormalizedSubscriptionState["billingInterval"] => {
  if (currentPeriodStart == null || currentPeriodEnd == null) {
    return "unknown";
  }
  const days = (currentPeriodEnd - currentPeriodStart) / 86_400;
  if (days <= 40) {
    return "monthly";
  }
  if (days <= 110) {
    return "quarterly";
  }
  if (days <= 370) {
    return "yearly";
  }
  return "custom";
};

const resolveMapping = ({
  offerMappings,
  productId,
  priceId,
}: {
  offerMappings: NormalizedOfferMapping[];
  productId: string | null;
  priceId: string | null;
}) =>
  offerMappings.find(
    (mapping) =>
      (productId != null && mapping.externalProductKeys.includes(productId)) ||
      (priceId != null && mapping.externalPriceKeys.includes(priceId)),
  ) ?? null;

const stripeRequest = async <T>({
  apiKey,
  path,
  params,
  fetchImpl,
}: {
  apiKey: string;
  path: string;
  params?: Record<string, string | number | Array<string | number> | undefined>;
  fetchImpl?: FetchLike;
}): Promise<T> => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value == null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
      continue;
    }
    searchParams.set(key, String(value));
  }

  const response = await (fetchImpl ?? fetch)(`${STRIPE_API_BASE}${path}?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Stripe request failed for ${path}: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
};

const stripeListAll = async <T extends { id: string }>({
  apiKey,
  path,
  params,
  fetchImpl,
}: {
  apiKey: string;
  path: string;
  params?: Record<string, string | number | Array<string | number> | undefined>;
  fetchImpl?: FetchLike;
}) => {
  const items: T[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const response = await stripeRequest<StripeListResponse<T>>({
      apiKey,
      path,
      fetchImpl,
      params: {
        ...params,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
    });

    items.push(...response.data);
    if (!response.has_more || response.data.length === 0) {
      break;
    }
    startingAfter = response.data[response.data.length - 1]?.id;
  }

  return items;
};

const fetchStripeInvoices = ({
  apiKey,
  window,
  fetchImpl,
}: {
  apiKey: string;
  window: ImportWindow;
  fetchImpl?: FetchLike;
}) =>
  stripeListAll<StripeInvoice>({
    apiKey,
    path: "/invoices",
    fetchImpl,
    params: {
      status: "paid",
      "created[gte]": unixSeconds(window.startAt),
      "created[lt]": unixSeconds(window.endAt),
    },
  });

const fetchStripeInvoiceLines = ({
  apiKey,
  invoiceId,
  fetchImpl,
}: {
  apiKey: string;
  invoiceId: string;
  fetchImpl?: FetchLike;
}) =>
  stripeListAll<StripeInvoiceLine>({
    apiKey,
    path: `/invoices/${invoiceId}/lines`,
    fetchImpl,
  });

const fetchStripeRefunds = ({
  apiKey,
  window,
  fetchImpl,
}: {
  apiKey: string;
  window: ImportWindow;
  fetchImpl?: FetchLike;
}) =>
  stripeListAll<StripeRefund>({
    apiKey,
    path: "/refunds",
    fetchImpl,
    params: {
      "created[gte]": unixSeconds(window.startAt),
      "created[lt]": unixSeconds(window.endAt),
      "expand[]": "data.charge.invoice",
    },
  });

const fetchStripeSubscriptions = ({
  apiKey,
  window,
  fetchImpl,
}: {
  apiKey: string;
  window: ImportWindow;
  fetchImpl?: FetchLike;
}) =>
  stripeListAll<StripeSubscription>({
    apiKey,
    path: "/subscriptions",
    fetchImpl,
    params: {
      status: "all",
      "created[lte]": unixSeconds(window.endAt),
    },
  });

export const verifyStripeApiKey = async ({
  apiKey,
  fetchImpl,
}: {
  apiKey: string;
  fetchImpl?: FetchLike;
}) => {
  await stripeRequest({
    apiKey,
    path: "/account",
    fetchImpl,
  });
};

export const pullStripeNormalizedPayload = async ({
  sourceConfig,
  window,
  offerMappings,
  fetchImpl,
}: {
  sourceConfig: StripeSourceConfig;
  window: ImportWindow;
  offerMappings: NormalizedOfferMapping[];
  fetchImpl?: FetchLike;
}): Promise<IntegrationSyncPayload> => {
  const [invoices, refunds, subscriptions] = await Promise.all([
    fetchStripeInvoices({
      apiKey: sourceConfig.secretApiKey,
      window,
      fetchImpl,
    }),
    fetchStripeRefunds({
      apiKey: sourceConfig.secretApiKey,
      window,
      fetchImpl,
    }),
    fetchStripeSubscriptions({
      apiKey: sourceConfig.secretApiKey,
      window,
      fetchImpl,
    }),
  ]);

  const invoiceLinesByInvoiceId = new Map<string, StripeInvoiceLine[]>();
  for (const invoice of invoices) {
    const lines = await fetchStripeInvoiceLines({
      apiKey: sourceConfig.secretApiKey,
      invoiceId: invoice.id,
      fetchImpl,
    });
    invoiceLinesByInvoiceId.set(invoice.id, lines);
  }

  const revenueEvents: NormalizedRevenueEvent[] = [];
  for (const invoice of invoices) {
    const lines = invoiceLinesByInvoiceId.get(invoice.id) ?? [];
    for (const line of lines) {
      const priceId = getPriceId(line.price);
      const productId = getProductId(line.price);
      const mapping = resolveMapping({
        offerMappings,
        productId,
        priceId,
      });
      revenueEvents.push({
        revenueEventId: `${invoice.id}:${line.id}`,
        sourceId: sourceConfig.sourceId,
        customerKey: invoice.customer,
        offerKey: mapping?.offerKey ?? null,
        externalProductKey: productId,
        externalPriceKey: priceId,
        occurredAt: toIso(invoice.paid_at ?? invoice.status_transitions?.paid_at ?? invoice.created) ?? window.startAt,
        servicePeriodStart: toIso(line.period?.start),
        servicePeriodEnd: toIso(line.period?.end),
        category: mapping == null ? "subscription" : classifyRevenue(mapping),
        grossAmount: centsToDollars(line.amount),
        refundedAmount: 0,
        netAmount: centsToDollars(line.amount),
        currency: line.currency,
        quantity: line.quantity,
        unitAmount: getUnitAmount(line.price),
      });
    }
  }

  const refundsNormalized: NormalizedRefundEvent[] = refunds.map((refund) => {
    const expandedInvoice =
      typeof refund.charge === "object" &&
      refund.charge != null &&
      typeof refund.charge.invoice === "object" &&
      refund.charge.invoice != null
        ? refund.charge.invoice
        : null;
    const invoiceLines = expandedInvoice?.lines?.data ?? [];
    const firstLine = invoiceLines[0];
    const mapping = resolveMapping({
      offerMappings,
      productId: getProductId(firstLine?.price),
      priceId: getPriceId(firstLine?.price),
    });

    return {
      refundEventId: refund.id,
      sourceId: sourceConfig.sourceId,
      customerKey: null,
      offerKey: mapping?.offerKey ?? null,
      occurredAt: toIso(refund.created) ?? window.startAt,
      amount: centsToDollars(refund.amount),
      currency: refund.currency,
      originalRevenueEventId:
        expandedInvoice == null || invoiceLines.length === 0
          ? null
          : `${expandedInvoice.id}:${invoiceLines[0]?.id ?? "line"}`,
    };
  });

  const customerStatusByKey = new Map<
    string,
    NormalizedCustomer["currentStatus"]
  >();
  const firstPaidAtByKey = new Map<string, string>();

  for (const event of revenueEvents) {
    if (event.customerKey == null) {
      continue;
    }
    const existing = firstPaidAtByKey.get(event.customerKey);
    if (existing == null || existing > event.occurredAt) {
      firstPaidAtByKey.set(event.customerKey, event.occurredAt);
    }
  }

  const subscriptionStates: NormalizedSubscriptionState[] = subscriptions.map((subscription) => {
    const item = subscription.items?.data?.[0];
    const mapping = resolveMapping({
      offerMappings,
      productId: getProductId(item?.price),
      priceId: getPriceId(item?.price),
    });
    const status = mapSubscriptionStatus(subscription.status);
    customerStatusByKey.set(
      subscription.customer,
      status === "active" || status === "trialing" || status === "past_due"
        ? "active"
        : status === "canceled"
          ? "canceled"
          : "unknown",
    );

    return {
      subscriptionKey: subscription.id,
      sourceId: sourceConfig.sourceId,
      customerKey: subscription.customer,
      offerKey: mapping?.offerKey ?? null,
      externalProductKey: getProductId(item?.price),
      externalPriceKey: getPriceId(item?.price),
      status,
      startedAt: toIso(subscription.start_date),
      canceledAt: toIso(subscription.canceled_at),
      currentPeriodStart: toIso(subscription.current_period_start),
      currentPeriodEnd: toIso(subscription.current_period_end),
      billingInterval: mapBillingInterval(
        subscription.current_period_start,
        subscription.current_period_end,
      ),
    };
  });

  const customerKeys = new Set<string>();
  for (const event of revenueEvents) {
    if (event.customerKey != null) {
      customerKeys.add(event.customerKey);
    }
  }
  for (const state of subscriptionStates) {
    customerKeys.add(state.customerKey);
  }

  const customers: NormalizedCustomer[] = [...customerKeys].map((customerKey) => ({
    customerKey,
    externalCustomerId: customerKey,
    sourceId: sourceConfig.sourceId,
    firstPaidAt: firstPaidAtByKey.get(customerKey) ?? null,
    currentStatus: customerStatusByKey.get(customerKey) ?? "unknown",
  }));

  return {
    window,
    customers,
    revenueEvents,
    refundEvents: refundsNormalized,
    expenseEvents: [],
    subscriptionStates,
  };
};
